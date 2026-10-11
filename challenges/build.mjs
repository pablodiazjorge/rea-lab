#!/usr/bin/env node
// Compiles the generated challenges with llvm-mingw into every variant (ADR 0011): x64 and x86,
// -O0 and -O2, with and without the symbol table. Builds are reproducible, so the same seed and
// toolchain always give the same SHA-256 per binary.
//
// Usage:
//   node challenges/build.mjs                         generate (public seed) and build into build/challenges
//   node challenges/build.mjs --check                 build twice and fail if any hash differs, then compare
//                                                     the public build with challenges/public-manifest.json
//   node challenges/build.mjs --write-public-manifest record the public hashes in challenges/public-manifest.json
//   node challenges/build.mjs --seed <n> --out <dir>  another seed (for example the held-out set)

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GENERATOR_VERSION, PUBLIC_SEED, generate } from './generate.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_MANIFEST = join(ROOT, 'challenges', 'public-manifest.json')

const ARCHITECTURES = [
  { id: 'x64', triple: 'x86_64-w64-mingw32' },
  { id: 'x86', triple: 'i686-w64-mingw32' },
]
const OPTIMIZATIONS = ['O0', 'O2']
const SYMBOLS = [
  { id: 'sym', flags: [] },
  { id: 'strip', flags: ['-s'] },
]

const args = process.argv.slice(2)
const flagValue = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const seed = flagValue('--seed') === undefined ? PUBLIC_SEED : Number.parseInt(flagValue('--seed'), 10)
const outRoot = resolve(flagValue('--out') ?? join(ROOT, 'build', 'challenges'))

function toolchain() {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8'))
  const tool = manifest.tools.find((candidate) => candidate.id === 'llvm-mingw')
  const bin = join(ROOT, 'tools', tool.dir, 'bin')
  if (!existsSync(bin)) throw new Error(`llvm-mingw is missing (${bin}). Run: node scripts/setup.mjs`)
  return { bin, version: tool.version, suffix: process.platform === 'win32' ? '.exe' : '' }
}

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

function build(outDir) {
  const { bin, version, suffix } = toolchain()
  const srcDir = join(outDir, 'src')
  const binDir = join(outDir, 'bin')
  mkdirSync(srcDir, { recursive: true })
  const challenges = generate(seed)
  for (const challenge of challenges) writeFileSync(join(srcDir, `${challenge.id}.c`), challenge.source)

  const binaries = []
  for (const challenge of challenges) {
    const source = join(srcDir, `${challenge.id}.c`)
    mkdirSync(join(binDir, challenge.id), { recursive: true })
    for (const architecture of ARCHITECTURES) {
      for (const optimization of OPTIMIZATIONS) {
        for (const symbols of SYMBOLS) {
          const variant = `${architecture.id}-${optimization}-${symbols.id}`
          const relativeFile = `bin/${challenge.id}/${challenge.id}-${variant}.exe`
          const output = join(outDir, relativeFile)
          const compiler = join(bin, `${architecture.triple}-clang${suffix}`)
          const result = spawnSync(compiler, [
            '-std=c11', '-Wall', '-Wextra', '-Werror', `-${optimization}`,
            `-ffile-prefix-map=${srcDir}=.`,
            '-static', '-Wl,--no-insert-timestamp', ...symbols.flags,
            '-o', output, source,
          ], { encoding: 'utf8' })
          if (result.status !== 0) throw new Error(`${challenge.id} ${variant} failed:\n${result.stderr}`)
          binaries.push({ id: challenge.id, variant, file: relativeFile, size: statSync(output).size, sha256: sha256(output) })
        }
      }
    }
  }

  const manifest = {
    generator_version: GENERATOR_VERSION,
    seed,
    toolchain: `llvm-mingw ${version}`,
    flags: '-std=c11 -Wall -Wextra -Werror -O0|-O2 -ffile-prefix-map=<src>=. -static -Wl,--no-insert-timestamp [-s]',
    binaries,
  }
  const answers = {
    generator_version: GENERATOR_VERSION,
    seed,
    challenges: challenges.map(({ id, family, description, answer }) => ({ id, family, description, answer })),
  }
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(join(outDir, 'answers.json'), `${JSON.stringify(answers, null, 2)}\n`)
  return manifest
}

const hashes = (manifest) => new Map(manifest.binaries.map((binary) => [binary.file, binary.sha256]))

function compare(label, expected, actual) {
  const problems = []
  for (const [file, hash] of expected) {
    if (!actual.has(file)) problems.push(`${label}: ${file} is missing`)
    else if (actual.get(file) !== hash) problems.push(`${label}: ${file} differs`)
  }
  for (const file of actual.keys()) if (!expected.has(file)) problems.push(`${label}: unexpected ${file}`)
  return problems
}

if (args.includes('--check')) {
  const first = build(mkdtempSync(join(tmpdir(), 'rea-lab-challenges-a-')))
  const second = build(mkdtempSync(join(tmpdir(), 'rea-lab-challenges-b-')))
  const problems = compare('double build', hashes(first), hashes(second))
  if (seed === PUBLIC_SEED && existsSync(PUBLIC_MANIFEST)) {
    problems.push(...compare('public manifest', hashes(JSON.parse(readFileSync(PUBLIC_MANIFEST, 'utf8'))), hashes(first)))
  }
  for (const problem of problems) console.log(`✘ ${problem}`)
  if (problems.length > 0) process.exit(1)
  console.log(`✔ ${first.binaries.length} binaries are reproducible${seed === PUBLIC_SEED && existsSync(PUBLIC_MANIFEST) ? ' and match the public manifest' : ''}.`)
} else {
  const manifest = build(outRoot)
  console.log(`Built ${manifest.binaries.length} binaries in ${outRoot}`)
  if (args.includes('--write-public-manifest')) {
    if (seed !== PUBLIC_SEED) throw new Error('The public manifest only records the public seed')
    writeFileSync(PUBLIC_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`Recorded the public hashes in ${PUBLIC_MANIFEST}`)
  }
}
