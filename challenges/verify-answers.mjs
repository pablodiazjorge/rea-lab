#!/usr/bin/env node
// Checks the ground truth of the lab's own challenges: every built variant must accept the recorded
// answer and reject a wrong one. Only runs binaries built from this repository (ADR 0010).
//
// Usage: node challenges/verify-answers.mjs [--out <folder>]   (default: build/challenges)

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outIndex = process.argv.indexOf('--out')
const outDir = resolve(outIndex >= 0 ? process.argv[outIndex + 1] : join(ROOT, 'build', 'challenges'))

const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'))
const answers = JSON.parse(readFileSync(join(outDir, 'answers.json'), 'utf8'))
const answerFor = new Map(answers.challenges.map((challenge) => [challenge.id, challenge.answer]))

const run = (file, input) =>
  spawnSync(join(outDir, file), [], { input: `${input}\n`, encoding: 'utf8', timeout: 10000 }).stdout.trim()

let failures = 0
for (const binary of manifest.binaries) {
  const answer = answerFor.get(binary.id)
  const accepted = answer.input ?? answer.example
  const granted = run(binary.file, accepted)
  const denied = run(binary.file, 'not-the-answer')
  const ok = granted === 'ACCESS GRANTED' && denied === 'ACCESS DENIED'
  if (!ok) failures++
  console.log(`${ok ? '✔' : '✘'} ${binary.id} ${binary.variant}: answer -> ${granted || '(no output)'}, wrong -> ${denied || '(no output)'}`)
}
if (failures > 0) {
  console.log(`\n${failures} variant(s) do not match their recorded answer.`)
  process.exit(1)
}
console.log(`\nAll ${manifest.binaries.length} variants accept their recorded answer and reject a wrong one.`)
