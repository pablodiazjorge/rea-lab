import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { buildReport, readRecords, sanitize, type RunRecord } from '../report.ts'

const record = (challenge: string, condition: 'A' | 'B' | 'C', solved: boolean, extra: Partial<RunRecord> = {}): RunRecord => ({
  study: 'unit',
  key: `${challenge}-x64-O2-strip-${condition}-r1`,
  set: 'public',
  challenge,
  family: challenge.split('-')[1],
  variant: 'x64-O2-strip',
  condition,
  repetition: 1,
  client_version: '2.1.261',
  model: 'claude-test',
  requested_model: 'claude-test',
  effort: 'medium',
  rea_version: '6.4.0',
  timed_out: false,
  wall_ms: 60000,
  num_turns: 10,
  equivalent_cost_usd: 0.5,
  usage: { input_tokens: 10, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 1000 },
  solved,
  refused: false,
  answerFound: true,
  strictManifest: true,
  mechanismCorrect: solved,
  grounding: condition === 'A' ? null : { cited: 2, authenticated: 2, aboutTarget: 2, envelopeMatches: 2, unknown: [], delivered: 3, undecodable: 0 },
  rea: condition === 'A' ? null : { naturalUse: true, correctFirstTool: true, repeatedCallCount: 0, inputValidationFailureCount: 0, requiredToolSubsequenceMet: true, reaCallCount: 5, reaErrorCount: 0 },
  skillLoaded: condition === 'C',
  permissionDenials: 0,
  outsidePaths: [],
  isolation: { ok: true, problems: [] },
  ...extra,
})

test('the report pairs runs by challenge, variant and repetition', () => {
  const records = [
    record('c01-compare', 'A', true), record('c01-compare', 'B', true), record('c01-compare', 'C', true),
    record('c02-xor', 'A', false), record('c02-xor', 'B', true), record('c02-xor', 'C', true),
    record('c03-checksum', 'A', false), record('c03-checksum', 'B', false), record('c03-checksum', 'C', true),
  ]
  const { markdown, comparisons } = buildReport(records)
  const ab = comparisons.find((comparison) => comparison.first === 'A' && comparison.second === 'B')!
  assert.deepEqual([ab.pairs, ab.onlyFirst, ab.onlySecond], [3, 0, 1])
  const ac = comparisons.find((comparison) => comparison.first === 'A' && comparison.second === 'C')!
  assert.deepEqual([ac.onlySecond, ac.pValue], [2, 0.5])
  assert.ok(markdown.includes('| A | 1/3 (33 %'))
  assert.ok(markdown.includes('## rea usage and Evidence'))
  assert.ok(markdown.includes('None: isolation held in every run'))
})

test('sanitize removes the home folder from flagged paths', () => {
  const home = String.raw`D:\profiles\someone`
  const flagged = record('c01-compare', 'A', true, { outsidePaths: [String.raw`D:\profiles\someone\lab\answers.json`, '/d/profiles/someone/lab'] })
  assert.deepEqual(sanitize(flagged, home).outsidePaths, [String.raw`<home>\lab\answers.json`, '<home>/lab'])
})

test('sanitize also removes the home folder from project folder names and flagged commands', () => {
  const home = String.raw`D:\profiles\someone`
  const flagged = record('c01-compare', 'A', true, {
    outsidePaths: [String.raw`D:\profiles\someone\bench\claude-config\projects\D--profiles-someone-bench-work\a.jsonl`],
    executionAttempts: [String.raw`cd "D:\profiles\someone\bench\work" && python -I s.py`, 'cat /d/profiles/someone/x.txt'],
  })
  const clean = sanitize(flagged, home)
  assert.deepEqual(clean.outsidePaths, [String.raw`<home>\bench\claude-config\projects\<home>-bench-work\a.jsonl`])
  assert.deepEqual(clean.executionAttempts, [String.raw`cd "<home>\bench\work" && python -I s.py`, 'cat <home>/x.txt'])
  assert.ok(!JSON.stringify(clean).includes('someone'))
})

test('sanitize removes other user profile paths, even ones typed only in part', () => {
  // Built at run time, so the repository check never sees a literal user path.
  const users = (separator: string, ...parts: string[]) => ['Users', ...parts].join(separator)
  const flagged = record('c01-compare', 'A', true, {
    outsidePaths: [`C:\\${users('\\', 'som')}`, `C:/${users('/', 'someone', 'x')}`, `/c/${users('/', 'someone', 'y')}`, `/${users('/', 'someone', 'z')}`],
  })
  assert.deepEqual(sanitize(flagged, String.raw`D:\elsewhere`).outsidePaths, ['<home>', '<home>/x', '<home>/y', '<home>/z'])
})

test('the published reports of studies 1 to 3 regenerate byte for byte from their results', async () => {
  const { readFileSync } = await import('node:fs')
  for (const study of ['study-1', 'study-2', 'study-3']) {
    const folder = new URL(`../results/${study}/`, import.meta.url)
    // As report.ts does: the last record of each key wins, sorted by key.
    const latest = new Map<string, RunRecord>()
    for (const line of readFileSync(new URL('results.jsonl', folder), 'utf8').split('\n')) if (line.trim()) latest.set(JSON.parse(line).key, JSON.parse(line))
    const records = [...latest.values()].sort((left, right) => left.key.localeCompare(right.key))
    assert.equal(buildReport(records).markdown, readFileSync(new URL('report.md', folder), 'utf8'), study)
  }
})

test('a real-software report adds address columns, per-program rates, the test without the control and the Evidence check', () => {
  const realRecord = (task: string, family: string, program: string, condition: 'A' | 'B', correct: boolean, repetition = 1) =>
    record(task, condition, correct, {
      key: `${task}-x64-O2-strip-${condition}-r${repetition}`,
      family,
      program,
      repetition,
      mechanismCorrect: undefined,
      address: { parsed: true, form: 'va', inside: correct, exactStart: correct, inCitedEvidence: condition === 'B' ? correct : null },
      sourceNameCorrect: false,
    })
  const records = [
    realRecord('r01', 'string', 'lua', 'A', true), realRecord('r01', 'string', 'lua', 'B', false),
    realRecord('r02', 'behaviour', 'lua', 'A', false), realRecord('r02', 'behaviour', 'lua', 'B', true),
    realRecord('r03', 'data', 'md4c', 'A', false), realRecord('r03', 'data', 'md4c', 'B', true),
    realRecord('r03', 'data', 'md4c', 'A', true, 2), realRecord('r03', 'data', 'md4c', 'B', true, 2),
  ]
  const { markdown } = buildReport(records)
  assert.match(markdown, /\| Condition \| Correct \| Exact start \| Without image base \| Source name right \|/)
  assert.match(markdown, /## Correct by family/)
  assert.match(markdown, /## Correct by program\n\n\| Program \| A \| B \| C \|\n\|---\|---\|---\|---\|\n\| lua \|/)
  // All four pairs: A alone right once (r01), B alone right twice (r02, r03 r1).
  assert.match(markdown, /\| A vs B \| 4 \| 1 \| 2 \|/)
  // Without the string control only r02 and r03 remain.
  assert.match(markdown, /\| A vs B, without the string control \| 3 \| 0 \| 2 \|/)
  // One pair per task: r02 (A wrong, B right) and r03 (both right in at least half of their repetitions).
  assert.match(markdown, /\| A vs B, one pair per task \(right in at least half of its repetitions\), without the control \| 2 \| 0 \| 1 \|/)
  assert.match(markdown, /## Answered address in the cited Evidence \(conditions B and C\)[\s\S]*\| B \| 4 \| 3 \| 3 \|/)
  assert.doesNotMatch(markdown, /Mechanism right|## Solved by family/)
})

test('a DeepSeek report names the provider, prices the runs as money spent and compares task by task when asked', () => {
  const realRecord = (study: string, task: string, condition: 'A' | 'B', correct: boolean, repetition = 1, provider?: 'deepseek') =>
    record(task, condition, correct, {
      study,
      key: `${task}-x64-O2-strip-${condition}-r${repetition}`,
      family: 'behaviour',
      program: 'flint',
      repetition,
      mechanismCorrect: undefined,
      address: { parsed: true, form: 'va', inside: correct, exactStart: correct, inCitedEvidence: null },
      sourceNameCorrect: false,
      ...(provider ? { provider, model: 'deepseek-flash', requested_model: 'deepseek-flash' } : {}),
    })
  const ours = [realRecord('s4', 'r02', 'A', true, 1, 'deepseek'), realRecord('s4', 'r02', 'B', false, 1, 'deepseek'), realRecord('s4', 'r09', 'A', true, 1, 'deepseek'), realRecord('s4', 'r09', 'B', true, 1, 'deepseek')]
  // The other study ran r02 three times and never ran r09; r01 is not in this study.
  const theirs = [1, 2, 3].flatMap((repetition) => [realRecord('s3', 'r02', 'A', true, repetition), realRecord('s3', 'r02', 'B', repetition !== 2, repetition)])
    .concat([realRecord('s3', 'r01', 'A', true), realRecord('s3', 'r01', 'B', true)])
  const plain = buildReport(ours).markdown
  assert.match(plain, /model deepseek-flash served by DeepSeek, effort medium/)
  assert.match(plain, /at DeepSeek's published prices[^\n]*: money spent, not Claude Code's equivalent cost/)
  assert.doesNotMatch(plain, /## Per task, compared with/)
  const compared = buildReport(ours, { compare: { study: 's3', records: theirs } }).markdown
  assert.match(compared, /## Per task, compared with s3\n\nCorrect runs out of all runs, per condition, here and in s3, on the 1 tasks both studies ran\.\n\n\| Task \| Family \| Program \| A \| B \| A in s3 \| B in s3 \|\n\|---\|---\|---\|---\|---\|---\|---\|\n\| r02 \| behaviour \| flint \| 1\/1 \| 0\/1 \| 3\/3 \| 2\/3 \|\n\| All \| \| \| 1\/1 \| 0\/1 \| 3\/3 \| 2\/3 \|/)
  // A report of a study Anthropic served keeps its wording.
  assert.match(buildReport(theirs).markdown, /Cost is the equivalent cost reported by Claude Code, not money spent\./)
})

test('the published report of study 4 regenerates byte for byte with its comparison with study 3', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const results = (study: string) => readRecords(fileURLToPath(new URL(`../results/${study}/results.jsonl`, import.meta.url)))
  const markdown = buildReport(results('study-4'), { compare: { study: 'study-3', records: results('study-3') } }).markdown
  assert.equal(markdown, readFileSync(new URL('../results/study-4/report.md', import.meta.url), 'utf8'))
})
