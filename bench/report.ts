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
  mechanismCorrect: boolean
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

export function buildReport(records: RunRecord[]) {
  const byCondition = Object.fromEntries(CONDITIONS.map((condition) => [condition, records.filter((record) => record.condition === condition)]))
  const families = [...new Set(records.map((record) => record.family))]
  const pairKey = (record: RunRecord) => `${record.challenge}|${record.variant}|${record.repetition}`

  const comparisons = PAIRS.map(([first, second]) => {
    const seconds = new Map(byCondition[second].map((record) => [pairKey(record), record]))
    const pairs = byCondition[first]
      .filter((record) => seconds.has(pairKey(record)))
      .map((record) => [record.solved, seconds.get(pairKey(record))!.solved] as const)
    return { first, second, pairs: pairs.length, ...mcnemarExact(pairs) }
  })

  const lines: string[] = []
  const study = records[0]?.study ?? 'unknown'
  lines.push(`# Benchmark report: ${study}`, '')
  lines.push(`Runs: ${records.length}. Set: ${distinct(records, (record) => record.set)}. Claude Code ${distinct(records, (record) => record.client_version)}, model ${distinct(records, (record) => record.model ?? record.requested_model)}, effort ${distinct(records, (record) => record.effort)}, rea ${distinct(records, (record) => record.rea_version)}.`, '')
  lines.push('Rates show successes/runs, the estimate and its Wilson 95 % interval. Cost is the equivalent cost reported by Claude Code, not money spent.', '')

  lines.push('## Outcome by condition', '')
  lines.push('| Condition | Solved | Mechanism right | Strict manifest | Classifier stops (runs) | Refused | Timed out | Denied commands | Median time | Median turns | Median input tokens | Median output tokens | Median cost |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const condition of CONDITIONS) {
    const group = byCondition[condition]
    if (group.length === 0) continue
    lines.push(`| ${condition} | ${rate(group, (record) => record.solved)} | ${rate(group, (record) => record.mechanismCorrect)} | ${rate(group, (record) => record.strictManifest)} | ${group.filter((record) => (record.safetyStops ?? 0) > 0).length} | ${group.filter((record) => record.refused).length} | ${group.filter((record) => record.timed_out).length} | ${group.reduce((total, record) => total + record.permissionDenials, 0)} | ${middle(group.map((record) => record.wall_ms), (value) => `${Math.round(value / 1000)} s`)} | ${middle(group.map((record) => record.num_turns), (value) => String(value))} | ${middle(group.map(inputTokens), (value) => String(Math.round(value)))} | ${middle(group.map((record) => record.usage?.output_tokens ?? null), (value) => String(Math.round(value)))} | ${middle(group.map((record) => record.equivalent_cost_usd), (value) => `${value.toFixed(2)} USD`)} |`)
  }

  lines.push('', '## Solved by family', '')
  lines.push(`| Family | ${CONDITIONS.join(' | ')} |`, `|---|${CONDITIONS.map(() => '---').join('|')}|`)
  for (const family of families) {
    lines.push(`| ${family} | ${CONDITIONS.map((condition) => rate(byCondition[condition].filter((record) => record.family === family), (record) => record.solved)).join(' | ')} |`)
  }

  lines.push('', '## Paired comparisons (exact McNemar)', '')
  lines.push('| Pair | Pairs | Only first solved | Only second solved | p-value |', '|---|---|---|---|---|')
  for (const comparison of comparisons) {
    if (comparison.pairs === 0) continue
    lines.push(`| ${comparison.first} vs ${comparison.second} | ${comparison.pairs} | ${comparison.onlyFirst} | ${comparison.onlySecond} | ${comparison.pValue.toFixed(4)} |`)
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

/** Replaces the user's home folder in published results, so no personal path leaves the machine. */
export function sanitize(record: RunRecord, home = homedir()): RunRecord {
  const variants = [home, home.replace(/\\/g, '/'), home.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`)]
  const clean = (text: string) => variants.reduce((value, prefix) => value.split(prefix).join('<home>'), text)
  return { ...record, outsidePaths: record.outsidePaths.map(clean) }
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
