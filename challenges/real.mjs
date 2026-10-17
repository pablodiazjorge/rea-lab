#!/usr/bin/env node
// Builds the open-source programs of sources.json into stripped x64 targets with exact ground
// truth (ADR 0024). Each translation unit is compiled into its own object with one section per
// function and per data object, the image is linked with a map and no identical-code folding,
// and the target is that same image after llvm-objcopy --strip-all. The build checks that the
// target keeps every non-debug section byte for byte, so its addresses are the full build's, and
// then derives function and data ranges, callers, references, inlining and the task candidates.
//
// Usage:
//   node challenges/real.mjs                  build every program into build/real
//   node challenges/real.mjs --only lua,zlib  build some programs (comma-separated ids)
//   node challenges/real.mjs --out <dir>      another output folder
//   node challenges/real.mjs --check          build twice in temporary folders and fail if any target differs

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir, userInfo } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { RECIPES } from './real-recipes.mjs'
import {
  analyse,
  checkTargetImage,
  compareImages,
  findStrings,
  modelFromMap,
  parseBaseRelocations,
  parseDisassembly,
  parseMap,
  parseNm,
  parseSymbolizer,
  readPdata,
  readPe,
} from './real-truth.mjs'
import { ROOT, toolchain } from './toolchain.mjs'

export const REAL_BUILD_VERSION = 1

const COMPILE_FLAGS = ['-O2', '-g', '-w', '-ffunction-sections', '-fdata-sections', '-DNDEBUG', '-fdebug-compilation-dir=.']
const LINK_FLAGS = ['-Wl,--icf=none', '-Wl,--gc-sections', '-Wl,-Map=link.map', '-Wl,--no-insert-timestamp', '-Wl,--build-id=none']
// c5xtools and civetweb print __DATE__, so a build on another day changed their bytes. clang takes the date from
// SOURCE_DATE_EPOCH instead: 2026-10-14 12:00 UTC, the day study 3's targets were built, so every rebuild of
// build version 1 matches them byte for byte.
const SOURCE_DATE_EPOCH = '1791979200'

const args = process.argv.slice(2)
const flagValue = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const sources = JSON.parse(readFileSync(join(ROOT, 'sources.json'), 'utf8'))
const only = flagValue('--only')?.split(',').filter(Boolean)
const selected = sources.sources.filter((entry) => !only || only.includes(entry.id))
if (only && selected.length !== only.length) throw new Error(`Unknown id in --only. Known ids: ${sources.sources.map((entry) => entry.id).join(', ')}`)

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', maxBuffer: 1 << 30, ...options, env: { ...process.env, ...options.env, SOURCE_DATE_EPOCH } })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${basename(command)} exited with ${result.status}: ${(result.stderr ?? '').slice(0, 2000)}`)
  return result.stdout
}

// Values that must never appear in a target: the account name and home folder of this machine.
const forbiddenLocalValues = () => [userInfo().username, basename(homedir())].filter((value) => value && value.length >= 3)

function buildProgram(entry, outRoot) {
  const recipe = RECIPES[entry.id]
  if (!recipe) throw new Error(`no recipe for ${entry.id} in challenges/real-recipes.mjs`)
  const source = join(ROOT, sources.into, entry.dir)
  if (!existsSync(source)) throw new Error(`sources for ${entry.id} are missing. Run: node scripts/setup.mjs --manifest sources.json`)
  const { bin, version, suffix } = toolchain()
  const tool = (name) => join(bin, `${name}${suffix}`)
  const dir = join(outRoot, entry.id)
  mkdirSync(join(dir, 'obj'), { recursive: true })
  // Headers a project's own build writes (such as a version header) go to gen/, searched after its own folders.
  const generatedDir = join(dir, 'gen')
  mkdirSync(generatedDir, { recursive: true })
  for (const [name, text] of Object.entries(recipe.generated ?? {})) writeFileSync(join(generatedDir, name), text)

  const objects = []
  for (const file of recipe.sources) {
    const object = `obj/${basename(file, '.c')}.o`
    run(
      tool('x86_64-w64-mingw32-clang'),
      ['-c', ...COMPILE_FLAGS, ...(recipe.flags ?? []), `-ffile-prefix-map=${source}=.`, `-ffile-prefix-map=${generatedDir}=gen`, ...recipe.includes.map((include) => `-I${include}`), `-I${generatedDir}`, ...recipe.defines.map((define) => `-D${define}`), file, '-o', join(dir, object)],
      { cwd: source },
    )
    objects.push(object)
  }
  run(tool('x86_64-w64-mingw32-clang'), ['-static', ...objects, '-o', 'full.exe', ...LINK_FLAGS, ...recipe.libraries.map((library) => `-l${library}`)], { cwd: dir })
  run(tool('llvm-objcopy'), ['--strip-all', 'full.exe', 'target.exe'], { cwd: dir })

  const full = readFileSync(join(dir, 'full.exe'))
  const target = readFileSync(join(dir, 'target.exe'))
  const problems = [...compareImages(full, target), ...checkTargetImage(target, forbiddenLocalValues())]

  const pe = readPe(full)
  const model = modelFromMap(parseMap(readFileSync(join(dir, 'link.map'), 'utf8')), pe.imageBase)
  if (model.unsplit.length > 0) problems.push(`${model.unsplit.length} code sections are not split per function`)
  const instructions = parseDisassembly(run(tool('llvm-objdump'), ['-d', '--no-show-raw-insn', 'full.exe'], { cwd: dir }))
  const own = (address) => model.functions.some((fn) => address >= fn.start && address < fn.end)
  const addresses = instructions.filter((instruction) => own(instruction.address)).map((instruction) => `0x${instruction.address.toString(16)}`)
  const frames = parseSymbolizer(
    run(tool('llvm-symbolizer'), ['--obj=full.exe', '--inlines', '--output-style=JSON', '--no-demangle'], { cwd: dir, input: `${addresses.join('\n')}\n` }),
  )
  const truth = analyse({
    model,
    buffer: full,
    pe,
    instructions,
    nm: parseNm(run(tool('llvm-nm'), ['-n', '--defined-only', 'full.exe'], { cwd: dir })),
    relocations: parseBaseRelocations(run(tool('llvm-readobj'), ['--coff-basereloc', 'full.exe'], { cwd: dir })),
    frames,
    pdata: readPdata(full, pe),
    strings: findStrings(full, pe, model.pools),
  })

  const summary = {
    id: entry.id,
    name: entry.name,
    version: entry.version,
    role: entry.role,
    file: `${entry.id}/target.exe`,
    sha256: sha256(target),
    size: target.length,
    image_base: `0x${pe.imageBase.toString(16)}`,
    functions: model.functions.length,
    eligible_functions: truth.functions.filter((fn) => fn.reasons.length === 0).length,
    candidates: Object.fromEntries(Object.entries(truth.candidates).map(([family, list]) => [family, list.length])),
    problems,
  }
  writeFileSync(
    join(dir, 'truth.json'),
    `${JSON.stringify({ program: entry.id, version: entry.version, build_version: REAL_BUILD_VERSION, toolchain: `llvm-mingw ${version}`, image_base: summary.image_base, target: { file: 'target.exe', sha256: summary.sha256, size: summary.size }, problems, ...truth }, null, 2)}\n`,
  )
  return summary
}

function buildAll(outRoot) {
  mkdirSync(outRoot, { recursive: true })
  const programs = selected.map((entry) => {
    process.stdout.write(`${entry.id}: `)
    const summary = buildProgram(entry, outRoot)
    const counts = Object.entries(summary.candidates).map(([family, count]) => `${family} ${count}`).join(', ')
    console.log(`${(summary.size / 1024).toFixed(0)} KB, ${summary.eligible_functions}/${summary.functions} eligible functions; ${counts}${summary.problems.length ? `; PROBLEMS: ${summary.problems.join('; ')}` : ''}`)
    return summary
  })
  const manifest = {
    set: 'real',
    build_version: REAL_BUILD_VERSION,
    toolchain: `llvm-mingw ${toolchain().version}`,
    sources: selected.map((entry) => ({ id: entry.id, version: entry.version, sha256: entry.sha256 })),
    programs,
  }
  writeFileSync(join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

if (args.includes('--check')) {
  const first = buildAll(mkdtempSync(join(tmpdir(), 'rea-lab-real-a-')))
  const second = buildAll(mkdtempSync(join(tmpdir(), 'rea-lab-real-b-')))
  const differing = first.programs.filter((program, index) => program.sha256 !== second.programs[index].sha256)
  const problems = first.programs.filter((program) => program.problems.length > 0)
  if (differing.length > 0) console.error(`Not reproducible: ${differing.map((program) => program.id).join(', ')}`)
  if (problems.length > 0) console.error(`Image problems: ${problems.map((program) => `${program.id} (${program.problems.join('; ')})`).join(', ')}`)
  if (differing.length > 0 || problems.length > 0) process.exit(1)
  console.log(`✔ ${first.programs.length} targets are reproducible, match their full builds and give nothing away.`)
} else {
  const outRoot = resolve(flagValue('--out') ?? join(ROOT, 'build', 'real'))
  const manifest = buildAll(outRoot)
  if (manifest.programs.some((program) => program.problems.length > 0)) process.exit(1)
}
