#!/usr/bin/env node
// Builds a study report from its graded runs (results.jsonl) with one command, so anyone can regenerate
// it from the published data. Solve rates carry Wilson 95 % intervals; paired conditions are compared
// with an exact McNemar test on the same challenge, variant and repetition.
//
// Usage:
//   node bench/report.ts --study <name>                 read <bench home>/runs/<name>/results.jsonl
//   node bench/report.ts --results <file> --out <dir>   any results file, for example a published one
//   node bench/report.ts --study <name> --publish       also copy sanitised results into bench/results/<name>/
//   add --compare <results file>                        to compare task by task with another study on the same tasks

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { warmPrefixCost } from './prices.ts'
import { hodgesLehmann, hodgesLehmannInterval, holm, mcnemarExact, median, wilcoxonSignedRankExact, wilson } from './stats.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export type RunRecord = {
  study: string
  key: string
  set: string
  challenge: string
  family: string
  variant: string
  condition: 'A' | 'B' | 'C' | 'C1' | 'C2'
  /** Study 5 only (ADR 0025): the skill injected into the system prompt. */
  injected_skill?: 'official' | 'improved'
  repetition: number
  client_version: string
  model: string | null
  requested_model: string
  /** Who served the model; absent in studies 1 to 3, which Anthropic served. */
  provider?: 'anthropic' | 'deepseek'
  effort: string
  rea_version: string
  timed_out: boolean
  wall_ms: number
  num_turns: number | null
  equivalent_cost_usd: number | null
  usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number } | null
  /** Study 5 only (ADR 0025): usage of the main agent's first request. */
  first_request_usage?: { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number } | null
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
/** Study 5 (ADR 0025): the injected-skill conditions, and the improved skill against the official one first. */
const SKILL_CONDITIONS = ['A', 'B', 'C', 'C1', 'C2'] as const
const SKILL_PAIRS = [['C1', 'C2'], ['B', 'C1'], ['B', 'C2']] as const

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
function compare(records: RunRecord[], first: string, second: string, outcome: (record: RunRecord) => boolean = (record) => record.solved) {
  const seconds = new Map(records.filter((record) => record.condition === second).map((record) => [pairKey(record), record]))
  const pairs = records
    .filter((record) => record.condition === first && seconds.has(pairKey(record)))
    .map((record) => [outcome(record), outcome(seconds.get(pairKey(record))!)] as const)
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

/** Correct runs out of all runs of one condition, on one task or on all, as `x/n`, or `n/a` when there are none. */
const tally = (records: RunRecord[], condition: string, challenge?: string) => {
  const group = records.filter((record) => record.condition === condition && (challenge === undefined || record.challenge === challenge))
  return group.length === 0 ? 'n/a' : `${group.filter((record) => record.solved).length}/${group.length}`
}

export type ReportOptions = {
  /** Another study on the same tasks, compared task by task (study 4 against study 3). */
  compare?: { study: string; records: RunRecord[] }
}

export function buildReport(records: RunRecord[], options: ReportOptions = {}) {
  // Reports without injected skills keep the three columns A, B and C, so studies 1 to 4 regenerate unchanged.
  const injected = records.some((record) => record.condition === 'C1' || record.condition === 'C2')
  const conditions: readonly string[] = injected ? SKILL_CONDITIONS.filter((condition) => records.some((record) => record.condition === condition)) : CONDITIONS
  const pairsOfConditions: ReadonlyArray<readonly [string, string]> = injected ? SKILL_PAIRS : PAIRS
  const reaConditions = injected ? conditions.filter((condition) => condition !== 'A') : ['B', 'C']
  const byCondition: Record<string, RunRecord[]> = Object.fromEntries(conditions.map((condition) => [condition, records.filter((record) => record.condition === condition)]))
  const families = [...new Set(records.map((record) => record.family))]
  // Real-software tasks (study 3) get their own columns and sections; challenge-set reports stay as they were.
  const real = records.some((record) => record.address !== undefined)
  const deepseek = records.some((record) => record.provider === 'deepseek')

  const comparisons = pairsOfConditions.map(([first, second]) => compare(records, first, second))

  const lines: string[] = []
  const study = records[0]?.study ?? 'unknown'
  lines.push(`# Benchmark report: ${study}`, '')
  lines.push(`Runs: ${records.length}. Set: ${distinct(records, (record) => record.set)}. Claude Code ${distinct(records, (record) => record.client_version)}, model ${distinct(records, (record) => record.model ?? record.requested_model)}${deepseek ? ' served by DeepSeek' : ''}, effort ${distinct(records, (record) => record.effort)}, rea ${distinct(records, (record) => record.rea_version)}.`, '')
  lines.push(
    deepseek
      ? "Rates show successes/runs, the estimate and its Wilson 95 % interval. Cost is computed from each run's token usage at DeepSeek's published prices, peak or off-peak by the run's start (bench/prices.ts): money spent, not Claude Code's equivalent cost."
      : 'Rates show successes/runs, the estimate and its Wilson 95 % interval. Cost is the equivalent cost reported by Claude Code, not money spent.',
    '',
  )

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
  for (const condition of conditions) {
    const group = byCondition[condition]
    if (group.length === 0) continue
    if (real) {
      lines.push(`| ${condition} | ${rate(group, (record) => record.solved)} | ${rate(group, (record) => record.address?.exactStart === true)} | ${group.filter((record) => record.address?.form === 'rva').length} | ${rate(group, (record) => record.sourceNameCorrect === true)} | ${rate(group, (record) => record.strictManifest)} | ${costs(group)} |`)
    } else {
      lines.push(`| ${condition} | ${rate(group, (record) => record.solved)} | ${rate(group, (record) => record.mechanismCorrect === true)} | ${rate(group, (record) => record.strictManifest)} | ${costs(group)} |`)
    }
  }

  lines.push('', real ? '## Correct by family' : '## Solved by family', '')
  lines.push(`| Family | ${conditions.join(' | ')} |`, `|---|${conditions.map(() => '---').join('|')}|`)
  for (const family of families) {
    lines.push(`| ${family} | ${conditions.map((condition) => rate(byCondition[condition].filter((record) => record.family === family), (record) => record.solved)).join(' | ')} |`)
  }
  if (real) {
    lines.push('', '## Correct by program', '')
    lines.push(`| Program | ${conditions.join(' | ')} |`, `|---|${conditions.map(() => '---').join('|')}|`)
    for (const program of [...new Set(records.map((record) => record.program ?? 'unknown'))]) {
      lines.push(`| ${program} | ${conditions.map((condition) => rate(byCondition[condition].filter((record) => (record.program ?? 'unknown') === program), (record) => record.solved)).join(' | ')} |`)
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
    for (const [first, second] of pairsOfConditions) {
      const comparison = compare(confirmatory, first, second)
      if (comparison.pairs > 0) lines.push(row(comparison, `${first} vs ${second}, without the ${REAL_CONTROL_FAMILY} control`))
    }
    for (const [first, second] of pairsOfConditions) {
      const comparison = perChallenge(confirmatory, first, second)
      if (comparison.pairs > 0) lines.push(row(comparison, `${first} vs ${second}, one pair per task (right in at least half of its repetitions), without the control`))
    }
  }

  if (injected) lines.push(...skillSections(records, byCondition, reaConditions))

  // Only when asked for, so the reports of studies 1 to 3 regenerate unchanged.
  if (options.compare) {
    const { study: other, records: theirs } = options.compare
    const shared = [...new Set(records.map((record) => record.challenge))].filter((challenge) => theirs.some((record) => record.challenge === challenge)).sort()
    const ours = records.filter((record) => shared.includes(record.challenge))
    const their = theirs.filter((record) => shared.includes(record.challenge))
    const present = conditions.filter((condition) => ours.some((record) => record.condition === condition))
    lines.push('', `## Per task, compared with ${other}`, '')
    lines.push(`Correct runs out of all runs, per condition, here and in ${other}, on the ${shared.length} tasks both studies ran.`, '')
    lines.push(`| Task | Family | Program | ${present.join(' | ')} | ${present.map((condition) => `${condition} in ${other}`).join(' | ')} |`)
    lines.push(`|---|---|---|${present.map(() => '---').join('|')}|${present.map(() => '---').join('|')}|`)
    for (const challenge of shared) {
      const first = ours.find((record) => record.challenge === challenge)!
      lines.push(`| ${challenge} | ${first.family} | ${first.program ?? 'unknown'} | ${present.map((condition) => tally(ours, condition, challenge)).join(' | ')} | ${present.map((condition) => tally(their, condition, challenge)).join(' | ')} |`)
    }
    lines.push(`| All | | | ${present.map((condition) => tally(ours, condition)).join(' | ')} | ${present.map((condition) => tally(their, condition)).join(' | ')} |`)
  }

  const withRea = records.filter((record) => record.rea !== null)
  const reaHeading = injected ? `conditions ${reaConditions.slice(0, -1).join(', ')} and ${reaConditions.at(-1)}` : 'conditions B and C'
  if (withRea.length > 0) {
    lines.push('', `## rea usage and Evidence (${reaHeading})`, '')
    lines.push('| Condition | Used rea | First call open_binary | Opened and closed | Repeated calls | Input validation failures | Citations authenticated | Citations about the target | Invented ids | Skill loaded |')
    lines.push('|---|---|---|---|---|---|---|---|---|---|')
    for (const condition of reaConditions) {
      const group = (byCondition[condition] ?? []).filter((record) => record.rea !== null)
      if (group.length === 0) continue
      const cited = group.reduce((total, record) => total + (record.grounding?.cited ?? 0), 0)
      const authenticated = group.reduce((total, record) => total + (record.grounding?.authenticated ?? 0), 0)
      const aboutTarget = group.reduce((total, record) => total + (record.grounding?.aboutTarget ?? 0), 0)
      const invented = group.reduce((total, record) => total + (record.grounding?.unknown.length ?? 0), 0)
      lines.push(`| ${condition} | ${rate(group, (record) => record.rea!.naturalUse)} | ${rate(group, (record) => record.rea!.correctFirstTool)} | ${rate(group, (record) => record.rea!.requiredToolSubsequenceMet)} | ${group.reduce((total, record) => total + record.rea!.repeatedCallCount, 0)} | ${group.reduce((total, record) => total + record.rea!.inputValidationFailureCount, 0)} | ${authenticated}/${cited} | ${aboutTarget}/${cited} | ${invented} | ${rate(group, (record) => record.skillLoaded)} |`)
    }
  }

  if (real && withRea.length > 0) {
    lines.push('', `## Answered address in the cited Evidence (${reaHeading})`, '')
    lines.push('Runs whose answer_address cites an authenticated Evidence that states that same address, absolute or relative to the image base. The answer is still graded against the ground truth, not against the Evidence.', '')
    lines.push('| Condition | Runs with an address | Address in the cited Evidence | Of those, correct |', '|---|---|---|---|')
    for (const condition of reaConditions) {
      const group = (byCondition[condition] ?? []).filter((record) => record.address?.parsed)
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
    for (const condition of conditions) {
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

/** Mean cost of each task in one condition, over its repetitions. */
function taskCosts(records: RunRecord[], condition: string, costOf: (record: RunRecord) => number | null = (record) => record.equivalent_cost_usd): Map<string, number> {
  const byTask = new Map<string, number[]>()
  for (const record of records) {
    const cost = record.condition === condition ? costOf(record) : null
    if (cost === null) continue
    byTask.set(record.challenge, [...(byTask.get(record.challenge) ?? []), cost])
  }
  return new Map([...byTask].map(([task, costs]) => [task, costs.reduce((sum, cost) => sum + cost, 0) / costs.length]))
}

/**
 * Study 5 (ADR 0025): two co-primary outcomes for each hypothesis, H1 (C1 against C2) and H2 (B against C1).
 * Cost is paired by task as the log ratio of mean costs, with an exact Wilcoxon signed-rank test and the
 * Hodges-Lehmann ratio with its exact 95 % interval; the address in the cited Evidence is paired by task and
 * repetition with an exact McNemar test. Holm adjusts the two outcomes of each hypothesis together; B against
 * C2 is descriptive. Then the tokens of each type per condition, which the cost must be read with.
 */
function skillSections(records: RunRecord[], byCondition: Record<string, RunRecord[]>, reaConditions: readonly string[]): string[] {
  const usd = (value: number) => (Number.isNaN(value) ? 'n/a' : `${value.toFixed(4)} USD`)
  const pairedCosts = (costOf?: (record: RunRecord) => number | null) => SKILL_PAIRS.map(([first, second]) => {
    const firsts = taskCosts(records, first, costOf)
    const seconds = taskCosts(records, second, costOf)
    const tasks = [...firsts.keys()].filter((task) => seconds.has(task) && firsts.get(task)! > 0 && seconds.get(task)! > 0).sort()
    const logRatios = tasks.map((task) => Math.log(seconds.get(task)! / firsts.get(task)!))
    return { first, second, tasks, firsts, seconds, logRatios, interval: hodgesLehmannInterval(logRatios), ...wilcoxonSignedRankExact(logRatios) }
  })
  const costs = pairedCosts()
  const citations = SKILL_PAIRS.map(([first, second]) => compare(records, first, second, (record) => record.address?.inCitedEvidence === true))
  // Holm within each hypothesis: index 0 is H1 (C1 vs C2), index 1 is H2 (B vs C1).
  const adjusted = [0, 1].map((index) => holm([costs[index].pValue, citations[index].pValue]))
  const holmText = (index: number, outcome: 0 | 1) => (index < 2 ? adjusted[index][outcome].toFixed(4) : 'n/a')
  const ratio = (value: number) => (Number.isNaN(value) ? 'n/a' : Math.exp(value).toFixed(3))
  const lines = [
    '',
    '## Co-primary outcomes (exact tests, Holm within each hypothesis)',
    '',
    'H1 compares C1 with C2 and H2 compares B with C1, each on two co-primary outcomes: the cost per run and whether the Evidence cited for answer_address states the answered address. Holm\'s method adjusts the two outcomes of each hypothesis together; B vs C2 is descriptive.',
    '',
    '### Cost per run, paired by task',
    '',
    'Each task\'s cost is the mean equivalent cost of its runs in a condition, and the outcome is the log of the second cost over the first. The ratio is the exponential of the Hodges-Lehmann estimate, with its exact 95 % interval; below 1 the second condition is cheaper.',
    '',
    '| Pair | Tasks | Median of first | Median of second | Ratio (Hodges-Lehmann) | 95 % interval | W+ | p-value | Holm-adjusted |',
    '|---|---|---|---|---|---|---|---|---|',
  ]
  const costRow = (test: (typeof costs)[number], adjustedText: string) => {
    const interval = test.interval ? `${ratio(test.interval.low)} to ${ratio(test.interval.high)}` : 'n/a'
    return `| ${test.first} vs ${test.second} | ${test.tasks.length} | ${usd(median(test.tasks.map((task) => test.firsts.get(task)!)))} | ${usd(median(test.tasks.map((task) => test.seconds.get(task)!)))} | ${ratio(hodgesLehmann(test.logRatios))} | ${interval} | ${test.wPlus} | ${test.pValue.toFixed(4)} | ${adjustedText} |`
  }
  costs.forEach((test, index) => lines.push(costRow(test, holmText(index, 0))))
  if (records.some((record) => record.first_request_usage)) {
    lines.push('', '#### Sensitivity: the first request\'s cache writes priced as cache reads', '')
    lines.push('Runs of one condition share a cached prompt prefix, so which run writes it depends on the run order. Here every run\'s first-request cache writes are priced as cache reads, as if the prefix were already cached; the result is descriptive.', '')
    lines.push('| Pair | Tasks | Median of first | Median of second | Ratio (Hodges-Lehmann) | 95 % interval | W+ | p-value | Holm-adjusted |', '|---|---|---|---|---|---|---|---|---|')
    pairedCosts((record) => warmPrefixCost(record.model, record.equivalent_cost_usd, record.first_request_usage)).forEach((test) => lines.push(costRow(test, 'n/a')))
  }
  lines.push('', '### Answered address in the cited Evidence, paired by task and repetition', '')
  lines.push('The outcome is that the Evidence cited for answer_address states the answered address. Only Evidence whose normalized result carries the address can state it, so the outcome also reflects which tool the agent cites.', '')
  lines.push('| Pair | Pairs | Only first | Only second | p-value | Holm-adjusted |', '|---|---|---|---|---|---|')
  citations.forEach((comparison, index) => {
    if (comparison.pairs > 0) lines.push(`| ${comparison.first} vs ${comparison.second} | ${comparison.pairs} | ${comparison.onlyFirst} | ${comparison.onlySecond} | ${comparison.pValue.toFixed(4)} | ${holmText(index, 1)} |`)
  })
  lines.push('', '## Tokens and calls per run by condition (medians)', '')
  lines.push('Input tokens are split by type, since cache writes and reads are priced differently and most of the input is cached.', '')
  lines.push('| Condition | Runs | Cost | Turns | Input | Cache writes | Cache reads | Output | rea calls | Repeated rea calls | Input validation failures | Time |', '|---|---|---|---|---|---|---|---|---|---|---|---|')
  const count = (value: number) => String(Math.round(value))
  for (const condition of reaConditions) {
    const group = byCondition[condition] ?? []
    if (group.length === 0) continue
    const reaGroup = group.filter((record) => record.rea !== null)
    lines.push(`| ${condition} | ${group.length} | ${middle(group.map((record) => record.equivalent_cost_usd), (value) => `${value.toFixed(4)} USD`)} | ${middle(group.map((record) => record.num_turns), String)} | ${middle(group.map((record) => record.usage?.input_tokens ?? null), count)} | ${middle(group.map((record) => record.usage?.cache_creation_input_tokens ?? null), count)} | ${middle(group.map((record) => record.usage?.cache_read_input_tokens ?? null), count)} | ${middle(group.map((record) => record.usage?.output_tokens ?? null), count)} | ${middle(reaGroup.map((record) => record.rea!.reaCallCount), String)} | ${reaGroup.reduce((total, record) => total + record.rea!.repeatedCallCount, 0)} | ${reaGroup.reduce((total, record) => total + record.rea!.inputValidationFailureCount, 0)} | ${middle(group.map((record) => record.wall_ms), (value) => `${Math.round(value / 1000)} s`)} |`)
  }
  return lines
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

/** Graded runs of a results file. A resumed batch may append a run twice; the last record of each key wins. */
export function readRecords(file: string): RunRecord[] {
  const latest = new Map<string, RunRecord>()
  for (const line of readFileSync(file, 'utf8').split('\n')) if (line.trim()) latest.set(JSON.parse(line).key, JSON.parse(line))
  return [...latest.values()].sort((left, right) => left.key.localeCompare(right.key))
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
  const records = readRecords(resultsFile)
  const compareFile = value('--compare')
  if (compareFile !== undefined && !existsSync(compareFile)) throw new Error(`--compare: no results file at ${compareFile}`)
  const theirs = compareFile === undefined ? [] : readRecords(resolve(compareFile))
  const options: ReportOptions = compareFile === undefined ? {} : { compare: { study: theirs[0]?.study ?? 'the other study', records: theirs } }
  const { markdown } = buildReport(records, options)
  const out = resolve(value('--out') ?? dirname(resultsFile))
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'report.md'), markdown)
  console.log(`Wrote ${join(out, 'report.md')} from ${records.length} runs`)
  if (argv.includes('--publish')) {
    if (!study) throw new Error('--publish needs --study')
    const target = join(ROOT, 'bench', 'results', study)
    mkdirSync(target, { recursive: true })
    writeFileSync(join(target, 'results.jsonl'), records.map((record) => JSON.stringify(sanitize(record))).join('\n') + '\n')
    writeFileSync(join(target, 'report.md'), buildReport(records.map((record) => sanitize(record)), options).markdown)
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
