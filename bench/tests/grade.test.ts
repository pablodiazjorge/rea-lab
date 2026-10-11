import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseAnswer } from '../answer.ts'
import { parseStreamJson } from '../claude.ts'
import { checkIsolation, gradeRun, type Challenge } from '../grade.ts'
import { closedJson, deliveredEvidence, reaMetrics } from '../rea.ts'

// Real, authenticated Evidence from the lab's own XOR writeup (rea 6.4.0, c02-xor x64 -O0 stripped).
const bundle = JSON.parse(readFileSync(new URL('../../writeups/2026-10-own-xor/evidence-o0.json', import.meta.url), 'utf8'))
const pseudoCode = bundle.records.find((record: { operation: string }) => record.operation === 'procedure_pseudo_code')
const strings = bundle.records.find((record: { operation: string }) => record.operation === 'search_strings')
const targetSha256: string = pseudoCode.subject.digest.sha256

const xor: Challenge = { id: 'c02-xor', family: 'xor', answer: { input: 'grove-birch-90', key: '0x51' } }

type Step = { tool: string; input?: unknown; result: string; isError?: boolean }

/** Builds the stream-json lines of a run in the shape `claude -p --output-format stream-json --verbose` prints. */
function transcript(steps: Step[], finalText: string): string[] {
  const lines: unknown[] = [
    { type: 'system', subtype: 'init', session_id: 's1', model: 'claude-test', claude_code_version: '0.0.0', tools: ['Bash', 'Read'], mcp_servers: [{ name: 'rea', status: 'connected' }] },
  ]
  steps.forEach((step, index) => {
    const id = `toolu_${index}`
    lines.push({ type: 'assistant', parent_tool_use_id: null, message: { id: `msg_${index}`, content: [{ type: 'tool_use', id, name: step.tool, input: step.input ?? {} }] } })
    lines.push({ type: 'user', parent_tool_use_id: null, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text: step.result }], is_error: step.isError ?? false }] } })
  })
  lines.push({ type: 'assistant', parent_tool_use_id: null, message: { id: 'msg_final', content: [{ type: 'text', text: finalText }] } })
  lines.push({
    type: 'result', subtype: 'success', is_error: false, num_turns: steps.length + 1, duration_ms: 1000, duration_api_ms: 800, total_cost_usd: 0.12, result: finalText,
    usage: { input_tokens: 10, cache_creation_input_tokens: 200, cache_read_input_tokens: 3000, output_tokens: 400 }, permission_denials: [],
  })
  return lines.map((line) => JSON.stringify(line))
}

const manifest = (claims: object[]) => JSON.stringify({ claims })
const claim = (id: string, value: unknown, evidence_id: string, confidence = 'observed', authority = 'shipped-artifact') =>
  ({ id, value, evidence_id, confidence, authority })

const reaSessionLines = (finalText: string, pseudoCodeText = JSON.stringify(pseudoCode)) => transcript([
  { tool: 'mcp__rea__open_binary', input: { path: 'C:\\run\\work\\target.exe' }, result: JSON.stringify({ result: { status: 'opened' } }) },
  { tool: 'mcp__rea__search_strings', result: JSON.stringify(strings) },
  { tool: 'mcp__rea__procedure_pseudo_code', input: { address: '0x140001450' }, result: pseudoCodeText },
  { tool: 'mcp__rea__close_binary', result: JSON.stringify({ result: { status: 'closed' } }) },
], finalText)
const reaSession = (finalText: string, pseudoCodeText = JSON.stringify(pseudoCode)) => parseStreamJson(reaSessionLines(finalText, pseudoCodeText))

test('parseStreamJson collects turns, tool calls, results and usage', () => {
  const run = reaSession('done')
  assert.equal(run.sessionId, 's1')
  assert.equal(run.toolCalls.length, 4)
  assert.equal(run.assistantTurns, 5)
  assert.equal(run.toolCalls[2].result?.isError, false)
  assert.equal(run.result?.totalCostUsd, 0.12)
  assert.equal(run.result?.usage?.cache_read_input_tokens, 3000)
  assert.equal(run.finalText, 'done')
})

test('a correct, grounded answer passes every check', () => {
  const run = reaSession(manifest([
    claim('accepted_input', 'grove-birch-90', pseudoCode.evidence_id),
    claim('check_mechanism', 'xor_encoded', pseudoCode.evidence_id),
  ]))
  const grade = gradeRun(run, xor, { withRea: true, withSkill: false, targetSha256, workDir: 'C:\\run\\work', variant: 'x64-O0-strip' })
  assert.equal(grade.solved, true)
  assert.equal(grade.strictManifest, true)
  assert.equal(grade.mechanismCorrect, true)
  assert.deepEqual(grade.grounding && [grade.grounding.cited, grade.grounding.authenticated, grade.grounding.aboutTarget, grade.grounding.envelopeMatches], [2, 2, 2, 2])
  assert.equal(grade.grounding?.delivered, 2)
  assert.equal(grade.rea?.firstTool, 'open_binary')
  assert.equal(grade.rea?.correctFirstTool, true)
  assert.equal(grade.rea?.requiredToolSubsequenceMet, true)
  assert.equal(grade.rea?.repeatedCallCount, 0)
})

test('an invented evidence_id is reported as unknown even when the value is right', () => {
  const invented = `ev_${'0'.repeat(64)}`
  const grade = gradeRun(reaSession(manifest([
    claim('accepted_input', 'grove-birch-90', invented),
    claim('check_mechanism', 'xor_encoded', pseudoCode.evidence_id),
  ])), xor, { withRea: true, withSkill: false, targetSha256, workDir: 'C:\\run\\work', variant: 'x64-O0-strip' })
  assert.equal(grade.solved, true)
  assert.equal(grade.grounding?.authenticated, 1)
  assert.deepEqual(grade.grounding?.unknown, [invented])
})

test('tampered Evidence does not authenticate', () => {
  const tampered = JSON.stringify({ ...pseudoCode, operation: 'procedure_pseudo_code', normalized_result: { tampered: true } })
  const delivered = deliveredEvidence(reaSession('done', tampered))
  assert.equal(delivered.records.has(pseudoCode.evidence_id), false)
  assert.equal(delivered.records.has(strings.evidence_id), true)
})

test('a truncated rea result counts as undecodable and delivers nothing', () => {
  const delivered = deliveredEvidence(reaSession('done', JSON.stringify(pseudoCode).slice(0, 500)))
  assert.equal(delivered.undecodable, 1)
  assert.equal(delivered.records.size, 1)
})

test('a reminder block appended to a tool result is ignored', () => {
  const text = `${JSON.stringify({ a: 1 })}\n<system-reminder>note</system-reminder>`
  assert.deepEqual(closedJson(text), { a: 1 })
  assert.equal(closedJson('Here it is: {"a": 1}'), undefined)
})

test('prose around the manifest fails the strict parse but still scores the value', () => {
  const text = `Solved it.\n\`\`\`json\n${manifest([
    claim('accepted_input', 'grove-birch-90', pseudoCode.evidence_id),
    claim('check_mechanism', 'string_compare', pseudoCode.evidence_id),
  ])}\n\`\`\``
  const grade = gradeRun(reaSession(text), xor, { withRea: true, withSkill: false, targetSha256, workDir: 'C:\\run\\work', variant: 'x64-O0-strip' })
  assert.equal(grade.strictManifest, false)
  assert.deepEqual(grade.manifestProblems, ['not_closed_json'])
  assert.equal(grade.solved, true)
  assert.equal(grade.mechanismCorrect, false)
})

test('a wrong input is not solved', () => {
  const grade = gradeRun(reaSession(manifest([
    claim('accepted_input', 'grove-birch-91', pseudoCode.evidence_id),
    claim('check_mechanism', 'xor_encoded', pseudoCode.evidence_id),
  ])), xor, { withRea: true, withSkill: false, targetSha256, workDir: 'C:\\run\\work', variant: 'x64-O0-strip' })
  assert.equal(grade.solved, false)
})

test('condition A answers have no evidence_id and need none', () => {
  const text = JSON.stringify({ claims: [
    { id: 'accepted_input', value: 'grove-birch-90', confidence: 'derived', authority: 'analyst-inference' },
    { id: 'check_mechanism', value: 'xor_encoded', confidence: 'inferred', authority: 'analyst-inference' },
  ] })
  const parsed = parseAnswer(text, false)
  assert.equal(parsed.strict, true)
  assert.deepEqual(parseAnswer(text, true).problems, ['claim_fields:accepted_input', 'evidence_id:accepted_input', 'claim_fields:check_mechanism', 'evidence_id:check_mechanism'])
  const run = parseStreamJson(transcript([{ tool: 'Bash', input: { command: 'llvm-objdump -d target.exe' }, result: '...' }], text))
  const grade = gradeRun(run, xor, { withRea: false, withSkill: false, targetSha256, workDir: 'C:\\run\\work', variant: 'x64-O0-strip' })
  assert.equal(grade.solved, true)
  assert.equal(grade.grounding, null)
  assert.equal(grade.rea, null)
  assert.deepEqual(grade.toolCalls, { Bash: 1 })
})

test('rea metrics count repeated calls with rea definitions', () => {
  const repeated = parseStreamJson(transcript([
    { tool: 'mcp__rea__open_binary', input: { path: 'x' }, result: '{"result":{}}' },
    { tool: 'mcp__rea__binary_overview', result: '{"error":{"code":"invalid_request"}}', isError: true },
    { tool: 'mcp__rea__binary_overview', result: '{"error":{"code":"invalid_request"}}', isError: true },
  ], 'done'))
  const metrics = reaMetrics(repeated)
  assert.equal(metrics.repeatedCallCount, 1)
  assert.equal(metrics.inputValidationFailureCount, 2)
  assert.equal(metrics.requiredToolSubsequenceMet, false)
  assert.equal(metrics.reaErrorCount, 2)
})

test('paths outside the work folder are flagged for review', () => {
  const run = parseStreamJson(transcript([
    { tool: 'Bash', input: { command: 'llvm-strings C:\\run\\work\\target.exe' }, result: '' },
    { tool: 'Read', input: { file_path: 'C:\\lab\\build\\challenges\\answers.json' }, result: '' },
    { tool: 'Bash', input: { command: 'grep -r GRANTED /c/lab/build' }, result: '' },
    { tool: 'Glob', input: { pattern: '../**/*.json' }, result: '' },
  ], 'done'))
  const grade = gradeRun(run, xor, { withRea: false, withSkill: false, targetSha256, workDir: 'C:\\run\\work', variant: 'x64-O0-strip' })
  assert.deepEqual(grade.outsidePaths, ['C:\\lab\\build\\challenges\\answers.json', '/c/lab/build', 'Glob: parent folder'])
})

test('isolation compares what the run loaded with its condition', () => {
  const run = reaSession('done')
  assert.deepEqual(checkIsolation(run, { withRea: true, withSkill: false }).problems, [])
  assert.deepEqual(checkIsolation(run, { withRea: false, withSkill: false }).problems, ['unexpected_mcp_server'])
  assert.deepEqual(checkIsolation(run, { withRea: true, withSkill: true }).problems, ['skill_missing'])
  const builtin = { ...run, plugins: ['cc-plugin-agents-md@builtin'] }
  assert.deepEqual(checkIsolation(builtin, { withRea: true, withSkill: false }).problems, [])
  const leaky = { ...run, plugins: ['filetree@claude-mods'], skills: ['rea:reverse-engineer-anything'] }
  assert.deepEqual(checkIsolation(leaky, { withRea: true, withSkill: false }).problems, ['plugins_loaded', 'skill_leaked'])
})

test('a synthetic error message is not counted as a model turn', () => {
  const lines = [
    JSON.stringify({ type: 'system', subtype: 'init', session_id: 's2', tools: [], mcp_servers: [], plugins: [], skills: [] }),
    JSON.stringify({ type: 'assistant', message: { id: 'x', model: '<synthetic>', content: [{ type: 'text', text: 'Failed to authenticate' }] } }),
    JSON.stringify({ type: 'result', subtype: 'success', is_error: true, terminal_reason: 'api_error', num_turns: 1, result: 'Failed to authenticate' }),
  ]
  const run = parseStreamJson(lines)
  assert.equal(run.assistantTurns, 0)
  assert.equal(run.syntheticMessages, 1)
  assert.equal(run.result?.isError, true)
  assert.equal(run.result?.terminalReason, 'api_error')
})

test('a safety refusal is counted as its own outcome', () => {
  const lines = [
    JSON.stringify({ type: 'system', subtype: 'init', session_id: 's3', tools: [], mcp_servers: [], plugins: [], skills: [] }),
    JSON.stringify({ type: 'assistant', message: { id: 'r1', model: 'claude-test', stop_reason: 'refusal', content: [{ type: 'text', text: 'I cannot help with that.' }] } }),
    JSON.stringify({ type: 'result', subtype: 'success', is_error: false, num_turns: 1, result: 'I cannot help with that.' }),
  ]
  const grade = gradeRun(parseStreamJson(lines), xor, { withRea: false, withSkill: false, targetSha256, workDir: 'C:/run/work', variant: 'x64-O0-strip' })
  assert.equal(grade.refused, true)
  assert.equal(grade.solved, false)
  assert.equal(grade.answerFound, false)
})

test('an optimised build of a single-answer family also accepts string_compare as the mechanism', () => {
  const text = manifest([
    claim('accepted_input', 'grove-birch-90', pseudoCode.evidence_id),
    claim('check_mechanism', 'string_compare', pseudoCode.evidence_id),
  ])
  const options = { withRea: true, withSkill: false, targetSha256, workDir: 'C:/run/work' }
  assert.equal(gradeRun(reaSession(text), xor, { ...options, variant: 'x64-O2-strip' }).mechanismCorrect, true)
  assert.equal(gradeRun(reaSession(text), xor, { ...options, variant: 'x64-O0-strip' }).mechanismCorrect, false)
  const state: Challenge = { id: 'c05-state', family: 'state', answer: { machine: { start: 100, accept: 101, states: [] }, example: 'a' } }
  assert.equal(gradeRun(reaSession(text), state, { ...options, variant: 'x64-O2-strip' }).mechanismCorrect, false)
})

test('a classifier stop that leaves the run without an answer counts as a refusal', () => {
  const lines = [
    JSON.stringify({ type: 'system', subtype: 'init', session_id: 's4', tools: [], mcp_servers: [], plugins: [], skills: [] }),
    JSON.stringify({ type: 'system', subtype: 'informational', content: 'safeguards stopped the response above', level: 'notice' }),
    JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'Your response above was stopped by a safety classifier.' }] }, isSynthetic: true, refused_message_id: 'msg_x' }),
    JSON.stringify({ type: 'assistant', message: { id: 'a1', model: 'claude-test', content: [{ type: 'text', text: 'I cannot give the JSON answer yet.' }] } }),
    JSON.stringify({ type: 'result', subtype: 'success', is_error: false, num_turns: 3, safety_stops: 1, result: 'I cannot give the JSON answer yet.' }),
  ]
  const run = parseStreamJson(lines)
  assert.equal(run.safetyStops, 1)
  const grade = gradeRun(run, xor, { withRea: false, withSkill: false, targetSha256, workDir: 'C:/run/work', variant: 'x64-O2-strip' })
  assert.equal(grade.refused, true)
  assert.equal(grade.safetyStops, 1)
  assert.equal(grade.solved, false)
})

test('a classifier stop after which the agent still answers is counted but is not a refusal', () => {
  const answer = manifest([
    claim('accepted_input', 'grove-birch-90', pseudoCode.evidence_id),
    claim('check_mechanism', 'xor_encoded', pseudoCode.evidence_id),
  ])
  const lines = reaSessionLines(answer)
  lines.splice(1, 0, JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'stopped' }] }, isSynthetic: true, refused_message_id: 'msg_y' }))
  const grade = gradeRun(parseStreamJson(lines), xor, { withRea: true, withSkill: false, targetSha256, workDir: 'C:/run/work', variant: 'x64-O0-strip' })
  assert.equal(grade.safetyStops, 1)
  assert.equal(grade.refused, false)
  assert.equal(grade.solved, true)
})
