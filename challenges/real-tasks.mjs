#!/usr/bin/env node
// Draws, checks and resolves the real-software tasks (ADR 0024). The draw orders every family's
// candidates of each program with a seed and takes the first ones, so the author never picks a
// target: the author only writes the behaviour and data questions, and a candidate that cannot be
// described without ambiguity is replaced by the next one in the seeded order, with the reason
// kept in the task file. The task ids are opaque because they end up in the run folder's path.
//
// Usage:
//   node challenges/real-tasks.mjs draw --role study|pilot --seed <n> --out <file> [--build build/real]
//   node challenges/real-tasks.mjs replace <file> <task id> --reason "<why>"   take the next candidate in the seeded order
//   node challenges/real-tasks.mjs verify <file> [--build build/real]           every task still matches the ground truth
//   node challenges/real-tasks.mjs resolve <file> [--build build/real]          write <build>/answers.json for the benchmark

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ROOT } from './toolchain.mjs'

export const TASKS_VERSION = 1
export const QUOTAS = { string: 1, behaviour: 2, caller: 2, data: 1 }
const FAMILIES = Object.keys(QUOTAS)

const args = process.argv.slice(2)
const [command, ...rest] = args
const flagValue = (name) => {
  const index = rest.indexOf(name)
  return index >= 0 ? rest[index + 1] : undefined
}
const buildRoot = resolve(flagValue('--build') ?? join(ROOT, 'build', 'real'))
const sha256 = (text) => createHash('sha256').update(text).digest('hex')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

// Same small PRNG as the challenge generator and the run order (mulberry32).
function createRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One independent stream per program and family, so replacing in one family never moves another. */
const streamSeed = (seed, program, family) => (Number.parseInt(sha256(`${program}/${family}`).slice(0, 8), 16) ^ seed) >>> 0

function shuffled(list, random) {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[copy[index], copy[other]] = [copy[other], copy[index]]
  }
  return copy
}

/** A candidate as stored in the task file: the target and, for anchored families, one drawn string. */
function pick(family, candidate, random) {
  if (family === 'data') return { object: candidate.object }
  if (family === 'behaviour') return { function: candidate.function }
  const string = candidate.strings[Math.floor(random() * candidate.strings.length)]
  return family === 'caller' ? { function: candidate.function, callee: candidate.callee, string } : { function: candidate.function, string }
}

/** The function or table a task's answer points at. */
const answerOf = (target) => target.object ?? target.function

const quote = (text) => JSON.stringify(text)

/** The fixed wording of the string and caller families; behaviour and data are written by the author. */
function templateQuestion(family, target) {
  if (family === 'string') return `Exactly one function in target.exe references the string ${quote(target.string)} from its code. Give the address where that function starts.`
  if (family === 'caller') return `Exactly one function in target.exe references the string ${quote(target.string)} from its code, and exactly one other function calls that function directly. Give the address where the calling function starts.`
  return ''
}

const truthOf = (program) => {
  const path = join(buildRoot, program, 'truth.json')
  if (!existsSync(path)) throw new Error(`${path} is missing. Run: node challenges/real.mjs`)
  return readJson(path)
}

function draw() {
  const role = flagValue('--role')
  const seed = Number.parseInt(flagValue('--seed') ?? '', 10)
  const out = flagValue('--out')
  if (!['study', 'pilot'].includes(role) || !Number.isSafeInteger(seed) || !out) throw new Error('draw needs --role study|pilot, --seed <n> and --out <file>')
  const manifest = readJson(join(buildRoot, 'manifest.json'))
  const programs = manifest.programs.filter((program) => program.role === role)
  if (programs.length === 0) throw new Error(`no ${role} programs in ${buildRoot}/manifest.json`)
  const tasks = []
  const reserves = {}
  for (const program of programs) {
    const truth = truthOf(program.id)
    reserves[program.id] = {}
    // A function or table answers at most one task per program: a repeated answer adds a run, not a sample.
    const used = new Set()
    for (const family of FAMILIES) {
      const random = createRandom(streamSeed(seed, program.id, family))
      const order = shuffled(truth.candidates[family], random)
        .map((candidate) => pick(family, candidate, random))
        .filter((target) => !used.has(answerOf(target)))
      if (order.length <= QUOTAS[family]) throw new Error(`${program.id} has ${order.length} unused ${family} candidates; the draw needs more than ${QUOTAS[family]}`)
      for (const target of order.slice(0, QUOTAS[family])) {
        used.add(answerOf(target))
        tasks.push({ program: program.id, family, target, question: templateQuestion(family, target) })
      }
      reserves[program.id][family] = order.slice(QUOTAS[family]).filter((target) => !used.has(answerOf(target)))
    }
  }
  const prefix = role === 'study' ? 'r' : 'p'
  tasks.forEach((task, index) => {
    task.id = `${prefix}${String(index + 1).padStart(2, '0')}`
  })
  writeJson(out, {
    set: 'real',
    role,
    version: TASKS_VERSION,
    seed,
    build: { build_version: manifest.build_version, manifest_sha256: sha256(readFileSync(join(buildRoot, 'manifest.json'))) },
    quotas: QUOTAS,
    tasks: tasks.map(({ id, program, family, target, question }) => ({ id, program, family, target, question })),
    reserves,
    rejected: [],
  })
  console.log(`${tasks.length} tasks drawn into ${out}; write the behaviour and data questions, then run verify.`)
}

function replace() {
  const [file, id] = rest
  const reason = flagValue('--reason')
  if (!file || !id || !reason) throw new Error('replace needs <file> <task id> --reason "<why>"')
  const tasks = readJson(file)
  const task = tasks.tasks.find((candidate) => candidate.id === id)
  if (!task) throw new Error(`no task ${id} in ${file}`)
  const reserve = tasks.reserves[task.program][task.family]
  const used = new Set(tasks.tasks.filter((other) => other.program === task.program).map((other) => answerOf(other.target)))
  while (reserve.length > 0 && used.has(answerOf(reserve[0]))) reserve.shift()
  const next = reserve.shift()
  if (!next) throw new Error(`no ${task.family} candidates left for ${task.program}`)
  tasks.rejected.push({ id, program: task.program, family: task.family, target: task.target, reason })
  task.target = next
  task.question = templateQuestion(task.family, next)
  writeJson(file, tasks)
  console.log(`${id} now targets ${JSON.stringify(next)}`)
}

const sameTarget = (family, target, candidate) => {
  if (family === 'data') return candidate.object === target.object
  if (candidate.function !== target.function) return false
  if (family === 'caller' && candidate.callee !== target.callee) return false
  return family === 'behaviour' || candidate.strings.includes(target.string)
}

/** Problems with a task file against the current build; empty when every task is sound. */
export function verifyTasks(tasks, truths) {
  const problems = []
  const ids = new Set()
  const answers = new Set()
  const counts = {}
  for (const task of tasks.tasks) {
    if (ids.has(task.id)) problems.push(`${task.id}: duplicate id`)
    ids.add(task.id)
    const answer = `${task.program}/${answerOf(task.target)}`
    if (answers.has(answer)) problems.push(`${task.id}: another task of ${task.program} has the same answer`)
    answers.add(answer)
    const truth = truths[task.program]
    if (!truth) {
      problems.push(`${task.id}: unknown program ${task.program}`)
      continue
    }
    counts[`${task.program}/${task.family}`] = (counts[`${task.program}/${task.family}`] ?? 0) + 1
    if (!(truth.candidates[task.family] ?? []).some((candidate) => sameTarget(task.family, task.target, candidate))) problems.push(`${task.id}: no longer a ${task.family} candidate`)
    if (!task.question?.trim()) problems.push(`${task.id}: question missing`)
    const names = [task.target.function, task.target.callee, task.target.object].filter(Boolean)
    for (const name of names) {
      if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(task.question ?? '')) problems.push(`${task.id}: the question names the source identifier ${name}`)
    }
  }
  for (const program of new Set(tasks.tasks.map((task) => task.program))) {
    for (const family of FAMILIES) {
      const count = counts[`${program}/${family}`] ?? 0
      if (count !== tasks.quotas[family]) problems.push(`${program}: ${count} ${family} tasks instead of ${tasks.quotas[family]}`)
    }
  }
  return problems
}

const truthsFor = (tasks) => Object.fromEntries([...new Set(tasks.tasks.map((task) => task.program))].map((program) => [program, truthOf(program)]))

function verify() {
  const [file] = rest
  if (!file) throw new Error('verify needs <file>')
  const tasks = readJson(file)
  const problems = verifyTasks(tasks, truthsFor(tasks))
  const manifestHash = sha256(readFileSync(join(buildRoot, 'manifest.json')))
  if (tasks.build.manifest_sha256 !== manifestHash) problems.push('the build manifest changed since the draw')
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✘ ${problem}`)
    process.exit(1)
  }
  console.log(`✔ ${tasks.tasks.length} tasks match the ground truth (${tasks.rejected.length} candidates replaced).`)
}

/** The answers the benchmark grades against: one address range per task. */
export function resolveTasks(tasks, truths, taskFileHash) {
  return {
    set: 'real',
    role: tasks.role,
    version: tasks.version,
    tasks_sha256: taskFileHash,
    tasks: tasks.tasks.map((task) => {
      const truth = truths[task.program]
      const kind = task.family === 'data' ? 'data' : 'function'
      const name = kind === 'data' ? task.target.object : task.target.function
      const item = (kind === 'data' ? truth.data : truth.functions).find((candidate) => candidate.name === name)
      if (!item) throw new Error(`${task.id}: ${name} is not in ${task.program}'s ground truth`)
      return { id: task.id, program: task.program, family: task.family, question: task.question, answer: { kind, name, start: item.start, end: item.end } }
    }),
  }
}

function resolveCommand() {
  const [file] = rest
  if (!file) throw new Error('resolve needs <file>')
  const text = readFileSync(file)
  const tasks = JSON.parse(text)
  const truths = truthsFor(tasks)
  const problems = verifyTasks(tasks, truths)
  if (problems.length > 0) throw new Error(`the task file does not verify: ${problems.join('; ')}`)
  writeJson(join(buildRoot, 'answers.json'), resolveTasks(tasks, truths, sha256(text)))
  console.log(`answers for ${tasks.tasks.length} tasks written to ${join(buildRoot, 'answers.json')}`)
}

const commands = { draw, replace, verify, resolve: resolveCommand }
if (process.argv[1] && resolve(process.argv[1]) === resolve(ROOT, 'challenges', 'real-tasks.mjs')) {
  if (!commands[command]) {
    console.error('Usage: node challenges/real-tasks.mjs draw|replace|verify|resolve ...')
    process.exit(2)
  }
  commands[command]()
}
