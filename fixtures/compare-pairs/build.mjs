#!/usr/bin/env node
// Builds the function-comparison fixture (rea issue #1947): three variants of pair.c, for x64 and x86,
// at -O0 and -O2, without symbols, reproducibly (the same flags as the challenges, ADR 0011). Output:
// build/compare-pairs/<arch>-<opt>/<base|reloc|change>.exe and manifest.json with every SHA-256.
//
// Usage: node fixtures/compare-pairs/build.mjs

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const tools = JSON.parse(readFileSync(join(root, 'tools.json'), 'utf8')).tools
const llvm = tools.find((tool) => tool.id === 'llvm-mingw')
const bin = join(root, 'tools', llvm.dir, 'bin')
const suffix = process.platform === 'win32' ? '.exe' : ''
const out = join(root, 'build', 'compare-pairs')

const ARCHITECTURES = [{ id: 'x64', triple: 'x86_64-w64-mingw32' }, { id: 'x86', triple: 'i686-w64-mingw32' }]
const OPTIMIZATIONS = ['O0', 'O2']
const VARIANTS = [{ id: 'base', value: 1 }, { id: 'reloc', value: 2 }, { id: 'change', value: 3 }]

const binaries = []
for (const architecture of ARCHITECTURES) {
  for (const optimization of OPTIMIZATIONS) {
    const folder = join(out, `${architecture.id}-${optimization}`)
    mkdirSync(folder, { recursive: true })
    for (const variant of VARIANTS) {
      const file = join(folder, `${variant.id}.exe`)
      const result = spawnSync(join(bin, `${architecture.triple}-clang${suffix}`), [
        '-std=c11', '-Wall', '-Wextra', '-Werror', `-${optimization}`, `-DVARIANT=${variant.value}`,
        `-ffile-prefix-map=${here}=.`, '-static', '-Wl,--no-insert-timestamp', '-s',
        '-o', file, join(here, 'pair.c'),
      ], { encoding: 'utf8' })
      if (result.status !== 0) throw new Error(`${architecture.id} ${optimization} ${variant.id} failed:\n${result.stderr}`)
      const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex')
      binaries.push({ architecture: architecture.id, optimization, variant: variant.id, file: `${architecture.id}-${optimization}/${variant.id}.exe`, sha256 })
    }
  }
}
writeFileSync(join(out, 'manifest.json'), `${JSON.stringify({ toolchain: `llvm-mingw ${llvm.version}`, binaries }, null, 2)}\n`)
console.log(`Built ${binaries.length} binaries in ${out}`)
