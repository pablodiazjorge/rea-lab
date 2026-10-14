#!/usr/bin/env node
// Builds a study report from its graded runs (results.jsonl) with one command, so anyone can regenerate
// it from the published data. Solve rates carry Wilson 95 % intervals; paired conditions are compared
// with an exact McNemar test on the same challenge, variant and repetition.
//
// Usage:
//   node bench/report.ts --study <name>                 read <bench home>/runs/<name>/results.jsonl
//   node bench/report.ts --results <file> --out <dir>   any results file, for example a published one
//   node bench/report.ts --study <name> --publish       also copy sanitised results into bench/results/<name>/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mcnemarExact, median, wilson } from './stats.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export type RunRecord = {
  study: string
  key: string
  set: string
  challenge: string
  family: string
  variant: string
  condition: 'A' | 'B' | 'C'
  repetition: number
  client_version: string
  model: string | null
  requested_model: string
  effort: string
  rea_version: string
  timed_out: boolean
  wall_ms: number
  num_turns: number | null
  equivalent_cost_usd: number | null
  usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number } | null
  solved: boolean
  refused: boolean
  safetyStops?: number
  answerFound: boolean
  strictManifest: boolean
  /** Challenge sets only (studies 1 and 2). */
  mechanismCorrect?: boolean
  /** Real-software tasks only (study 3, ADR 0024). */
  program?: string
  address?: { parsed: boolean; form: 'va' | 'rva' | null; inside: boolean; exactStart: boolean; inCitedEvidence: boolean | null }
  sourceNameCorrect?: boolean
  /** Large set only (study 2): the decoy note with a wrong access code. Absent in study 1 records. */
  decoy?: { seen: boolean; proposed: boolean; mentioned: boolean } | null
  grounding: { cited: number; authenticated: number; aboutTarget: number; envelopeMatches: number; unknown: string[]; delivered: number; undecodable: number } | null
  rea: { naturalUse: boolean; correctFirstTool: boolean; repeatedCallCount: number; inputValidationFailureCount: number; requiredToolSubsequenceMet: boolean; reaCallCount: number; reaErrorCount: number } | null
  skillLoaded: boolean
  permissionDenials: number
  outsidePaths: string[]
  executionAttempts?: string[]
  isolation: { ok: boolean; problems: string[] }
}

const CONDITIONS = ['A', 'B', 'C'] as const
const PAIRS = [['A', 'B'], ['B', 'C'], ['A', 'C']] as const

const percent = (value: number) => (Number.isNaN(value) ? 'n/a' : `${(100 * value).toFixed(0)} %`)
const rate = (records: RunRecord[], test: (record: RunRecord) => boolean) => {
  const interval = wilson(records.filter(test).length, records.length)
  return records.length === 0 ? 'n/a' : `${records.filter(test).length}/${records.length} (${percent(interval.estimate)}, ${percent(interval.low)}-${percent(interval.high)})`
}
const middle = (values: Array<number | null>, format: (value: number) => string) => {
  const known = values.filter((value): value is number => value !== null)
  return known.length === 0 ? 'n/a' : format(median(known))
}
const inputTokens = (record: RunRecord) =>
  record.usage === null ? null : record.usage.input_tokens + record.usage.cache_creation_input_tokens + record.usage.cache_read_input_tokens
const distinct = (records: RunRecord[], field: (record: RunRecord) => unknown) => [...new Set(records.map(field).map(String))].join(', ')

/** The control family of real-software sets: answered from one string, excluded from the confirmatory test. */
export const REAL_CONTROL_FAMILY = 'string'

const pairKey = (record: RunRecord) => `${record.challenge}|${record.variant}|${record.repetition}`

/** Exact McNemar on the runs of two conditions, paired by challenge, variant and repetition. */
function compare(records: RunRecord[], first: string, second: string) {
  const seconds = new Map(records.filter((record) => record.condition === second).map((record) => [pairKey(record), record]))
  const pairs = records
    .filter((record) => record.condition === first && seconds.has(pairKey(record)))
    .map((record) => [record.solved, seconds.get(pairKey(record))!.solved] as const)
  return { first, second, pairs: pairs.length, ...mcnemarExact(pairs) }
}

/**
 * Sensitivity analysis: one pair per challenge, where a condition counts as right when it was right in at
 * least half of its repetitions.
 */
export function perChallenge(records: RunRecord[], first: string, second: string) {
  const verdict = (condition: string, challenge: string) => {
    const group = records.filter((record) => record.condition === condition && record.challenge === challenge)
    return group.length === 0 ? null : 2 * group.filter((record) => record.solved).length >= group.length
  }
  const pairs = [...new Set(records.map((record) => record.challenge))]
    .map((challenge) => [verdict(first, challenge), verdict(second, challenge)] as const)
    .filter((pair): pair is readonly [boolean, boolean] => pair[0] !== null && pair[1] !== null)
  return { first, second, pairs: pairs.length, ...mcnemarExact(pairs) }
}

export function buildReport(records: RunRecord[]) {
  const byCondition = Object.fromEntries(CONDITIONS.map((condition) => [condition, records.filter((record) => record.condition === condition)]))
  const families = [...new Set(records.map((record) => record.family))]
  // Real-software tasks (study 3) get their own columns and sections; challenge-set reports stay as they were.
  const real = records.some((record) => record.address !== undefined)

  const comparisons = PAIRS.map(([first, second]) => compare(records, first, second))

  const lines: string[] = []
  const study = records[0]?.study ?? 'unknown'
  lines.push(`# Benchmark report: ${study}`, '')
  lines.push(`Runs: ${records.length}. Set: ${distinct(records, (record) => record.set)}. Claude Code ${distinct(records, (record) => record.client_version)}, model ${distinct(records, (record) => record.model ?? record.requested_model)}, effort ${distinct(records, (record) => record.effort)}, rea ${distinct(records, (record) => record.rea_version)}.`, '')
  lines.push('Rates show successes/runs, the estimate and its Wilson 95 % interval. Cost is the equivalent cost reported by Claude Code, not money spent.', '')

  const costs = (group: RunRecord[]) =>
    `${group.filter((record) => (record.safetyStops ?? 0) > 0).length} | ${group.filter((record) => record.refused).length} | ${group.filter((record) => record.timed_out).length} | ${group.reduce((total, record) => total + record.permissionDenials, 0)} | ${middle(group.map((record) => record.wall_ms), (value) => `${Math.round(value / 1000)} s`)} | ${middle(group.map((record) => record.num_turns), (value) => String(value))} | ${middle(group.map(inputTokens), (value) => String(Math.round(value)))} | ${middle(group.map((record) => record.usage?.output_tokens ?? null), (value) => String(Math.round(value)))} | ${middle(group.map((record) => record.equivalent_cost_usd), (value) => `${value.toFixed(2)} USD`)}`
  lines.push('## Outcome by condition', '')
  if (real) {
    lines.push('Correct: the answered address falls inside the target function or table. Without image base: answers given as relative addresses, counted as correct when they fall inside.', '')
    lines.push('| Condition | Correct | Exact start | Without image base | Source name right | Strict manifest | Classifier stops (runs) | Refused | Timed out | Denied commands | Median time | Median turns | Median input tokens | Median output tokens | Median cost |')
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  } else {
    lines.push('| Condition | Solved | Mechanism right | Strict manifest | Classifier stops (runs) | Refused | Timed out | Denied commands | Median time | Median turns | Median input tokens | Median output tokens | Median cost |')
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  }
  for (const condition of CONDITIONS) {
    const group = byCondition[condition]
    if (group.length === 0) continue
    if (real) {
      lines.push(`| ${condition} | ${rate(group, (record) => record.solved)} | ${rate(group, (record) => record.address?.exactStart === true)} | ${group.filter((record) => record.address?.form === 'rva').length} | ${rate(group, (record) => record.sourceNameCorrect === true)} | ${rate(group, (record) => record.strictManifest)} | ${costs(group)} |`)
    } else {
      lines.push(`| ${condition} | ${rate(group, (record) => record.solved)} | ${rate(group, (record) => record.mechanismCorrect === true)} | ${rate(group, (record) => record.strictManifest)} | ${costs(group)} |`)
    }
  }

  lines.push('', real ? '## Correct by family' : '## Solved by family', '')
  lines.push(`| Family | ${CONDITIONS.join(' | ')} |`, `|---|${CONDITIONS.map(() => '---').join('|')}|`)
  for (const family of families) {
    lines.push(`| ${family} | ${CONDITIONS.map((condition) => rate(byCondition[condition].filter((record) => record.family === family), (record) => record.solved)).join(' | ')} |`)
  }
  if (real) {
    lines.push('', '## Correct by program', '')
    lines.push(`| Program | ${CONDITIONS.join(' | ')} |`, `|---|${CONDITIONS.map(() => '---').join('|')}|`)
    for (const program of [...new Set(records.map((record) => record.program ?? 'unknown'))]) {
      lines.push(`| ${program} | ${CONDITIONS.map((condition) => rate(byCondition[condition].filter((record) => (record.program ?? 'unknown') === program), (record) => record.solved)).join(' | ')} |`)
    }
  }

  lines.push('', '## Paired comparisons (exact McNemar)', '')
  lines.push(`| Pair | Pairs | Only first ${real ? 'correct' : 'solved'} | Only second ${real ? 'correct' : 'solved'} | p-value |`, '|---|---|---|---|---|')
  const row = (comparison: ReturnType<typeof compare>, label: string) =>
    `| ${label} | ${comparison.pairs} | ${comparison.onlyFirst} | ${comparison.onlySecond} | ${comparison.pValue.toFixed(4)} |`
  for (const comparison of comparisons) {
    if (comparison.pairs === 0) continue
    lines.push(row(comparison, `${comparison.first} vs ${comparison.second}`))
  }
  if (real) {
    // The preregistered test leaves out the string control; the sensitivity analysis keeps one pair per task.
    const confirmatory = records.filter((record) => record.family !== REAL_CONTROL_FAMILY)
    for (const [first, second] of PAIRS) {
      const comparison = compare(confirmatory, first, second)
      if (comparison.pairs > 0) lines.push(row(comparison, `${first} vs ${second}, without the ${REAL_CONTROL_FAMILY} control`))
    }
    for (const [first, second] of PAIRS) {
      const comparison = perChallenge(confirmatory, first, second)
      if (comparison.pairs > 0) lines.push(row(comparison, `${first} vs ${second}, one pair per task (right in at least half of its repetitions), without the control`))
    }
  }

  const withRea = records.filter((record) => record.rea !== null)
  if (withRea.length > 0) {
    lines.push('', '## rea usage and Evidence (conditions B and C)', '')
    lines.push('| Condition | Used rea | First call open_binary | Opened and closed | Repeated calls | Input validation failures | Citations authenticated | Citations about the target | Invented ids | Skill loaded |')
    lines.push('|---|---|---|---|---|---|---|---|---|---|')
    for (const condition of ['B', 'C'] as const) {
      const group = byCondition[condition].filter((record) => record.rea !== null)
      if (group.length === 0) continue
      const cited = group.reduce((total, record) => total + (record.grounding?.cited ?? 0), 0)
      const authenticated = group.reduce((total, record) => total + (record.grounding?.authenticated ?? 0), 0)
      const aboutTarget = group.reduce((total, record) => total + (record.grounding?.aboutTarget ?? 0), 0)
      const invented = group.reduce((total, record) => total + (record.grounding?.unknown.length ?? 0), 0)
      lines.push(`| ${condition} | ${rate(group, (record) => record.rea!.naturalUse)} | ${rate(group, (record) => record.rea!.correctFirstTool)} | ${rate(group, (record) => record.rea!.requiredToolSubsequenceMet)} | ${group.reduce((total, record) => total + record.rea!.repeatedCallCount, 0)} | ${group.reduce((total, record) => total + record.rea!.inputValidationFailureCount, 0)} | ${authenticated}/${cited} | ${aboutTarget}/${cited} | ${invented} | ${rate(group, (record) => record.skillLoaded)} |`)
    }
  }

  if (real && withRea.length > 0) {
    lines.push('', '## Answered address in the cited Evidence (conditions B and C)', '')
    lines.push('Runs whose answer_address cites an authenticated Evidence that states that same address, absolute or relative to the image base. The answer is still graded against the ground truth, not against the Evidence.', '')
    lines.push('| Condition | Runs with an address | Address in the cited Evidence | Of those, correct |', '|---|---|---|---|')
    for (const condition of ['B', 'C'] as const) {
      const group = byCondition[condition].filter((record) => record.address?.parsed)
      if (group.length === 0) continue
      const grounded = group.filter((record) => record.address?.inCitedEvidence === true)
      lines.push(`| ${condition} | ${group.length} | ${grounded.length} | ${grounded.filter((record) => record.solved).length} |`)
    }
  }

  // Only reports with decoy challenges get this section, so study 1's report regenerates unchanged.
  const withDecoy = records.filter((record) => record.decoy)
  if (withDecoy.length > 0) {
    lines.push('', '## Decoy note (large set)', '')
    lines.push('Runs on challenges whose binary carries a note with a wrong access code: how many showed the code in a tool result, proposed it as the answer, or repeated it in the final message.', '')
    lines.push('| Condition | Runs | Saw it | Proposed it | Repeated it |', '|---|---|---|---|---|')
    for (const condition of CONDITIONS) {
      const group = withDecoy.filter((record) => record.condition === condition)
      if (group.length === 0) continue
      lines.push(`| ${condition} | ${group.length} | ${group.filter((record) => record.decoy!.seen).length} | ${group.filter((record) => record.decoy!.proposed).length} | ${group.filter((record) => record.decoy!.mentioned).length} |`)
    }
  }

  // Denied commands are expected (the allow list is narrow) and are counted above; only isolation and paths need review.
  const flagged = records.filter((record) => record.outsidePaths.length > 0 || !record.isolation.ok || (record.executionAttempts?.length ?? 0) > 0)
  lines.push('', '## Runs flagged for review', '')
  if (flagged.length === 0) lines.push('None: isolation held in every run, with no paths outside the work folder and no attempt to run a program.')
  for (const record of flagged) {
    const notes: string[] = []
    if (!record.isolation.ok) notes.push(`isolation: ${record.isolation.problems.join(', ')}`)
    if ((record.executionAttempts?.length ?? 0) > 0) notes.push(`execution attempts ${record.executionAttempts!.map((command) => `\`${command}\``).join(', ')}`)
    if (record.outsidePaths.length > 0) notes.push(`outside paths ${record.outsidePaths.map((path) => `\`${path}\``).join(', ')}`)
    lines.push(`- ${record.key}: ${notes.join('; ')}`)
  }
  return { markdown: `${lines.join('\n')}\n`, comparisons }
}

/**
 * Replaces the user's home folder in published results, so no personal path leaves the machine: in the
 * flagged paths and commands, with Windows, forward-slash and Git Bash spellings, and in Claude Code's
 * project folder names, which spell the path with dashes (`C--Users-name-...`).
 */
export function sanitize(record: RunRecord, home = homedir()): RunRecord {
  const variants = [
    home,
    home.replace(/\\/g, '/'),
    home.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`),
    home.replace(/[^A-Za-z0-9]/g, '-'),
  ]
  // Any other path under a Users folder, including one an agent typed only in part.
  const profiles = [/\b[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'`<>]+/gi, /\/(?:[a-z]\/)?Users\/[^/\s"'`<>]+/g]
  const clean = (text: string) =>
    profiles.reduce((value, pattern) => value.replace(pattern, '<home>'), variants.reduce((value, prefix) => value.split(prefix).join('<home>'), text))
  return {
    ...record,
    outsidePaths: record.outsidePaths.map(clean),
    ...(record.executionAttempts === undefined ? {} : { executionAttempts: record.executionAttempts.map(clean) }),
  }
}

function main() {
  const argv = process.argv.slice(2)
  const value = (name: string) => {
    const index = argv.indexOf(name)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const study = value('--study')
  const home = resolve(process.env.REA_LAB_BENCH_HOME ?? join(process.env.LOCALAPPDATA ?? join(homedir(), '.cache'), 'rea-lab-bench'))
  const resultsFile = value('--results') ? resolve(value('--results')!) : study ? join(home, 'runs', study, 'results.jsonl') : undefined
  if (!resultsFile || !existsSync(resultsFile)) throw new Error('Give --study <name> or --results <file> with graded runs')
  // A resumed batch may append a run twice; the last record of each key wins.
  const latest = new Map<string, RunRecord>()
  for (const line of readFileSync(resultsFile, 'utf8').split('\n')) if (line.trim()) latest.set(JSON.parse(line).key, JSON.parse(line))
  const records = [...latest.values()].sort((left, right) => left.key.localeCompare(right.key))
  const { markdown } = buildReport(records)
  const out = resolve(value('--out') ?? dirname(resultsFile))
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'report.md'), markdown)
  console.log(`Wrote ${join(out, 'report.md')} from ${records.length} runs`)
  if (argv.includes('--publish')) {
    if (!study) throw new Error('--publish needs --study')
    const target = join(ROOT, 'bench', 'results', study)
    mkdirSync(target, { recursive: true })
    writeFileSync(join(target, 'results.jsonl'), records.map((record) => JSON.stringify(sanitize(record))).join('\n') + '\n')
    writeFileSync(join(target, 'report.md'), buildReport(records.map((record) => sanitize(record))).markdown)
    console.log(`Published sanitised results in ${target}`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
