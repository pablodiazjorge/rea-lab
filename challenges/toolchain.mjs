// The pinned llvm-mingw toolchain from tools.json, shared by the challenge and real-software builds.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function toolchain() {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8'))
  const tool = manifest.tools.find((candidate) => candidate.id === 'llvm-mingw')
  const bin = join(ROOT, 'tools', tool.dir, 'bin')
  if (!existsSync(bin)) throw new Error(`llvm-mingw is missing (${bin}). Run: node scripts/setup.mjs`)
  return { bin, version: tool.version, suffix: process.platform === 'win32' ? '.exe' : '' }
}
