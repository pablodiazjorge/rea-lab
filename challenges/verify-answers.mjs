#!/usr/bin/env node
// Checks the ground truth of the lab's own challenges: every built variant must accept the recorded
// answer and reject a wrong one, and the oracle (oracle.mjs) must agree with the binary on a few more
// probes per family. Only runs binaries built from this repository (ADR 0010).
//
// Usage: node challenges/verify-answers.mjs [--out <folder>]   (default: build/challenges)

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { acceptedInput, accepts } from './oracle.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outIndex = process.argv.indexOf('--out')
const outDir = resolve(outIndex >= 0 ? process.argv[outIndex + 1] : join(ROOT, 'build', 'challenges'))

const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'))
const answers = JSON.parse(readFileSync(join(outDir, 'answers.json'), 'utf8'))
const challengeFor = new Map(answers.challenges.map((challenge) => [challenge.id, challenge]))

const run = (file, input) =>
  spawnSync(join(outDir, file), [], { input: `${input}\n`, encoding: 'utf8', timeout: 10000 }).stdout.trim()

// Extra inputs where the oracle and the binary must agree, accepted or not.
function probes(challenge) {
  const accepted = acceptedInput(challenge)
  const changed = `${accepted.slice(0, -1)}${accepted.endsWith('a') ? 'b' : 'a'}`
  const list = [accepted.slice(0, -1), `${accepted}x`, changed]
  if (challenge.family === 'checksum') {
    // Another input that satisfies the rule: try every pair of letters in the last two positions.
    const letters = [...'abcdefghijklmnopqrstuvwxyz']
    const candidate = letters
      .flatMap((first) => letters.map((second) => `${accepted.slice(0, -2)}${first}${second}`))
      .find((input) => input !== accepted && accepts(challenge, input))
    if (candidate) list.push(candidate)
  }
  if (challenge.family === 'state') {
    // Take a fall-back transition, replay the input from where it lands, and finish normally.
    const { states } = challenge.answer.machine
    const index = states.length - 1
    const landing = states.findIndex((state) => state.id === states[index].back.next)
    list.push(`${accepted.slice(0, index)}${states[index].back.character}${accepted.slice(landing)}`)
  }
  return list
}

let failures = 0
for (const binary of manifest.binaries) {
  const challenge = challengeFor.get(binary.id)
  const granted = run(binary.file, acceptedInput(challenge))
  const denied = run(binary.file, 'not-the-answer')
  const disagreements = probes(challenge).filter(
    (input) => (run(binary.file, input) === 'ACCESS GRANTED') !== accepts(challenge, input),
  )
  const ok = granted === 'ACCESS GRANTED' && denied === 'ACCESS DENIED' && disagreements.length === 0
  if (!ok) failures++
  const oracle = disagreements.length === 0 ? 'oracle agrees' : `oracle disagrees on ${JSON.stringify(disagreements)}`
  console.log(`${ok ? '✔' : '✘'} ${binary.id} ${binary.variant}: answer -> ${granted || '(no output)'}, wrong -> ${denied || '(no output)'}, ${oracle}`)
}
if (failures > 0) {
  console.log(`\n${failures} variant(s) do not match their recorded answer or the oracle.`)
  process.exit(1)
}
console.log(`\nAll ${manifest.binaries.length} variants accept their recorded answer, reject a wrong one and agree with the oracle.`)
