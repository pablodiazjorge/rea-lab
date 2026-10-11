#!/usr/bin/env node
// Prepares the lab from tools.json: downloads each archive into tools/, verifies its size and
// SHA-256 before anything is extracted, extracts it, and copies the Ghidra class exercises into
// targets/. Idempotent: finished steps are skipped. Never touches PATH, the registry or anything
// outside this repository.
//
// Usage:
//   node scripts/setup.mjs                 prepare everything
//   node scripts/setup.mjs --only jdk      prepare some tools (comma-separated ids)
//   node scripts/setup.mjs --check         report what is ready without downloading (exit 1 if not)

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TOOLS = join(ROOT, 'tools')
const MARKER = '.rea-lab-sha256'

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const onlyIndex = args.indexOf('--only')
const only = onlyIndex >= 0 ? (args[onlyIndex + 1] ?? '').split(',').filter(Boolean) : null

const manifest = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8'))
const selected = manifest.tools.filter((tool) => !only || only.includes(tool.id))
if (only && selected.length !== only.length) {
  const known = manifest.tools.map((tool) => tool.id).join(', ')
  console.error(`Unknown tool id in --only. Known ids: ${known}`)
  process.exit(2)
}

const log = (text) => console.log(text)
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`

async function sha256Of(path) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

const markerPath = (tool) => join(TOOLS, tool.dir, MARKER)
const isInstalled = (tool) => existsSync(markerPath(tool)) && readFileSync(markerPath(tool), 'utf8').trim() === tool.sha256

async function archiveIsValid(tool) {
  const path = join(TOOLS, tool.file)
  if (!existsSync(path)) return false
  if (statSync(path).size !== tool.size) return false
  return (await sha256Of(path)) === tool.sha256
}

async function download(tool) {
  const target = join(TOOLS, tool.file)
  const partial = `${target}.part`
  log(`  downloading ${tool.file} (${mb(tool.size)}) from ${new URL(tool.url).host}`)
  const response = await fetch(tool.url)
  if (!response.ok || !response.body) throw new Error(`download failed: HTTP ${response.status}`)

  const hash = createHash('sha256')
  let received = 0
  let nextReport = 0.25
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk)
      received += chunk.length
      if (received / tool.size >= nextReport) {
        log(`    ${Math.round(nextReport * 100)} %`)
        nextReport += 0.25
      }
      callback(null, chunk)
    },
  })
  await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(partial))

  const digest = hash.digest('hex')
  if (received !== tool.size || digest !== tool.sha256) {
    rmSync(partial, { force: true })
    throw new Error(`verification failed (size ${received}, sha256 ${digest}); the download was discarded`)
  }
  renameSync(partial, target)
}

function extract(tool) {
  const archive = join(TOOLS, tool.file)
  log(`  extracting ${tool.file}`)
  const command =
    process.platform === 'win32'
      ? [join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', archive, '-C', TOOLS]]
      : ['unzip', ['-q', '-o', archive, '-d', TOOLS]]
  const result = spawnSync(command[0], command[1], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`extraction failed (${command[0]} exited with ${result.status})`)
  if (!existsSync(join(TOOLS, tool.dir))) throw new Error(`the archive did not contain ${tool.dir}/`)
}

async function prepare(tool) {
  log(`${tool.name} ${tool.version}`)
  if (isInstalled(tool)) {
    log('  ready')
    return true
  }
  const archiveOk = await archiveIsValid(tool)
  if (checkOnly) {
    log(archiveOk ? '  archive verified but not extracted' : '  missing')
    return false
  }
  if (!archiveOk) {
    if (existsSync(join(TOOLS, tool.file))) {
      log('  existing archive does not match tools.json, downloading again')
      rmSync(join(TOOLS, tool.file), { force: true })
    }
    await download(tool)
  } else {
    log('  archive verified')
  }
  if (existsSync(join(TOOLS, tool.dir))) {
    // Extracted earlier from this same verified archive, before markers existed.
    log(`  ${tool.dir}/ already extracted from the verified archive`)
  } else {
    extract(tool)
  }
  writeFileSync(markerPath(tool), `${tool.sha256}\n`)
  log('  ready')
  return true
}

function copyExercises() {
  const exercises = manifest.exercises
  const tool = manifest.tools.find((candidate) => candidate.id === exercises.tool)
  if (!tool || !isInstalled(tool)) return false
  log('Ghidra class exercises')
  let ready = true
  for (const folder of exercises.folders) {
    const source = join(TOOLS, tool.dir, exercises.from, folder)
    const target = join(ROOT, exercises.to, folder)
    if (existsSync(target)) continue
    if (checkOnly) {
      ready = false
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    cpSync(source, target, { recursive: true })
    log(`  copied ${folder} to ${exercises.to}/`)
  }
  log(ready ? '  ready' : '  missing')
  return ready
}

mkdirSync(TOOLS, { recursive: true })
let allReady = true
for (const tool of selected) {
  try {
    allReady = (await prepare(tool)) && allReady
  } catch (error) {
    console.error(`  error: ${error.message}`)
    allReady = false
  }
}
if (!only || only.includes(manifest.exercises.tool)) allReady = copyExercises() && allReady

if (!allReady) {
  console.error(checkOnly ? '\nNot ready. Run: node scripts/setup.mjs' : '\nSetup did not finish. See the errors above.')
  process.exit(1)
}
log('\nAll tools are ready.')
