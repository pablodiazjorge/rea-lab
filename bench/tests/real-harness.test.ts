import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseAddress } from '../answer.ts'
import { parseStreamJson } from '../claude.ts'
import { CONDITIONS, SCRATCH_WRITES, runSettings, taskPrompt, toolResultsFolder } from '../conditions.ts'
import { addressInEvidence, functionNamedInEvidence, gradeRun, outsidePaths, type Challenge } from '../grade.ts'
import type { Evidence } from '../rea.ts'

// The real-software tasks of study 3 (ADR 0024): prompt, permissions, address grading and one run end to end.

const QUESTION = 'In target.exe, find the function that compresses a pending run of zeros. Give the address where that function starts.'

const task: Challenge = {
  id: 'p01',
  family: 'behaviour',
  program: 'demo',
  question: QUESTION,
  answer: { kind: 'function', name: 'gz_zero', start: '0x140001000', end: '0x140001080', image_base: '0x140000000' },
}

/** A condition A run: one llvm-objdump call, then the final answer. */
function run(finalText: string, extraCalls: Array<{ name: string; input: unknown }> = []) {
  const calls = [{ name: 'Bash', input: { command: 'llvm-objdump -d target.exe' } }, ...extraCalls]
  const lines = [
    { type: 'system', subtype: 'init', session_id: 's1', model: 'claude-test', claude_code_version: '0.0.0', tools: ['Bash', 'Read'], mcp_servers: [] },
    ...calls.flatMap((call, index) => [
      { type: 'assistant', parent_tool_use_id: null, message: { id: `msg_${index}`, content: [{ type: 'tool_use', id: `toolu_${index}`, name: call.name, input: call.input }] } },
      { type: 'user', parent_tool_use_id: null, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: `toolu_${index}`, content: [{ type: 'text', text: 'output' }], is_error: false }] } },
    ]),
    { type: 'assistant', parent_tool_use_id: null, message: { id: 'msg_final', content: [{ type: 'text', text: finalText }] } },
    { type: 'result', subtype: 'success', is_error: false, num_turns: 2, duration_ms: 1000, duration_api_ms: 800, total_cost_usd: 0.1, result: finalText, usage: { input_tokens: 10, output_tokens: 20 }, permission_denials: [] },
  ]
  return parseStreamJson(lines.map((line) => JSON.stringify(line)))
}

const answer = (address: unknown, name = 'unknown') =>
  JSON.stringify({ claims: [
    { id: 'answer_address', value: address, confidence: 'derived', authority: 'analyst-inference' },
    { id: 'source_name', value: name, confidence: 'inferred', authority: 'analyst-inference' },
  ] })

const options = { withRea: false, withSkill: false, targetSha256: '0'.repeat(64), workDir: 'C:\\run\\work', variant: 'x64-O2-strip', kind: 'real' as const }

test('a real-software prompt asks the task question and the address claims, never the crackme', () => {
  const prompt = taskPrompt(CONDITIONS.B, 'real', task)
  assert.match(prompt, /stripped 64-bit Windows build of an open-source program/)
  assert.ok(prompt.includes(QUESTION))
  assert.match(prompt, /answer_address: string, the virtual address where the function or table starts, image base included/)
  assert.match(prompt, /exactly one claim per ID below \(answer_address, source_name\)/)
  assert.match(prompt, /You may keep scratch files/)
  assert.match(prompt, /Nobody will answer questions/)
  assert.doesNotMatch(prompt, /ACCESS GRANTED|gz_zero|0x140001000/)
  assert.throws(() => taskPrompt(CONDITIONS.A, 'real'), /needs its question/)
})

test('real-software runs may write scratch files and read the saved tool results; older sets may not', () => {
  const config = join('C:', 'run', 'claude-config')
  const real = runSettings(CONDITIONS.A, process.cwd(), 'real', config)
  assert.ok(SCRATCH_WRITES.every((rule) => real.permissions.allow.includes(rule)))
  assert.deepEqual(real.permissions.additionalDirectories, [toolResultsFolder(config)])
  assert.equal('additionalDirectories' in runSettings(CONDITIONS.A, process.cwd(), 'large', config).permissions, false)
  assert.equal('additionalDirectories' in runSettings(CONDITIONS.A, process.cwd(), 'small').permissions, false)
})

test('addresses are read as hexadecimal with 0x or as integers, and relative ones are flagged', () => {
  const base = 0x140000000
  assert.deepEqual(parseAddress('0x140001000', base), { value: 0x140001000, form: 'va' })
  assert.deepEqual(parseAddress(' 0X140001000 ', base), { value: 0x140001000, form: 'va' })
  assert.deepEqual(parseAddress('0x1000', base), { value: 0x140001000, form: 'rva' })
  assert.deepEqual(parseAddress(0x140001000, base), { value: 0x140001000, form: 'va' })
  assert.equal(parseAddress('140001000', base), null)
  assert.equal(parseAddress('0x', base), null)
  assert.equal(parseAddress('gz_zero', base), null)
})

test('a real-software answer is graded by the range of its target', () => {
  const inside = gradeRun(run(answer('0x140001010')), task, options)
  assert.equal(inside.solved, true)
  assert.deepEqual(inside.address, { parsed: true, form: 'va', inside: true, exactStart: false, inCitedEvidence: null, namedInCitedEvidence: null, citedOperation: null })
  assert.equal(inside.sourceNameCorrect, false)
  assert.equal('mechanismCorrect' in inside, false)

  const exact = gradeRun(run(answer('0x140001000', 'gz_zero')), task, options)
  assert.equal(exact.address?.exactStart, true)
  assert.equal(exact.sourceNameCorrect, true)

  const relative = gradeRun(run(answer('0x1000')), task, options)
  assert.equal(relative.solved, true)
  assert.equal(relative.address?.form, 'rva')

  assert.equal(gradeRun(run(answer('0x140001080')), task, options).solved, false)
  const bare = gradeRun(run(answer('140001000')), task, options)
  assert.equal(bare.solved, false)
  assert.equal(bare.address?.parsed, false)
})

test('challenge-set grades keep their fields, so studies 1 and 2 regrade unchanged', () => {
  const crackme: Challenge = { id: 'c01-compare', family: 'compare', answer: { input: 'indigo-tundra-61' } }
  const final = JSON.stringify({ claims: [
    { id: 'accepted_input', value: 'indigo-tundra-61', confidence: 'observed', authority: 'shipped-artifact' },
    { id: 'check_mechanism', value: 'string_compare', confidence: 'inferred', authority: 'analyst-inference' },
  ] })
  const grade = gradeRun(run(final), crackme, { ...options, kind: undefined })
  assert.equal(grade.solved, true)
  assert.equal(grade.mechanismCorrect, true)
  assert.equal('address' in grade, false)
  assert.equal('sourceNameCorrect' in grade, false)
})

test('saved tool results count as inside the run only where the set allows them', () => {
  const saved = 'C:\\run\\claude-config\\projects\\C--run-work\\session\\tool-results\\toolu_1.txt'
  const transcript = run(answer('0x140001010'), [{ name: 'Read', input: { file_path: saved } }])
  assert.deepEqual(outsidePaths(transcript, 'C:\\run\\work'), [saved])
  assert.deepEqual(outsidePaths(transcript, 'C:\\run\\work', ['C:\\run\\claude-config\\projects']), [])
})

test('the answered address is found in an Evidence result, absolute or relative', () => {
  const evidence = { normalized_result: { procedures: [{ entry: '0x140001000', size: 128 }], base: 4096 } } as unknown as Evidence
  assert.equal(addressInEvidence(evidence, 0x140001000, 0x140000000), true)
  assert.equal(addressInEvidence(evidence, 0x140002000, 0x140000000), false)
  const relative = { normalized_result: { offset: 0x1000 } } as unknown as Evidence
  assert.equal(addressInEvidence(relative, 0x140001000, 0x140000000), true)
})

test('decompiled code names its function through the signature, never through a call or the request', () => {
  const code = (text: string, procedure = '0x140001000') => ({ normalized_result: text, parameters: { procedure } }) as unknown as Evidence
  const own = code('\r\nvoid FUN_140001000(FILE *param_1)\r\n\r\n{\r\n  FUN_140002000(param_1);\r\n}\r\n')
  // Ghidra's default name gives the start without 0x, so only the named test finds it.
  assert.equal(addressInEvidence(own, 0x140001000, 0x140000000), false)
  assert.equal(functionNamedInEvidence(own, 0x140001000, 0x140000000), true)
  // A call to the answered function inside another function's code does not name it.
  assert.equal(functionNamedInEvidence(own, 0x140002000, 0x140000000), false)
  // The request asked for an address inside the function; the result is the containing function.
  assert.equal(functionNamedInEvidence(code('\r\nint FUN_140005530(void)\r\n{\r\n  return 0;\r\n}\r\n', '0x1400056d7'), 0x1400056d7, 0x140000000), false)
  // A function with a symbol name has no default name to match; a structured result still counts by its address.
  assert.equal(functionNamedInEvidence(code('\r\nint main(void)\r\n{\r\n  FUN_140001000();\r\n}\r\n'), 0x140001000, 0x140000000), false)
  assert.equal(functionNamedInEvidence({ normalized_result: { entry: '0x140001000' } } as unknown as Evidence, 0x140001000, 0x140000000), true)
})

test('a real-software batch runs each task on its program target and records the address grade', () => {
  const runner = fileURLToPath(new URL('../run.ts', import.meta.url))
  const fake = fileURLToPath(new URL('./fake-claude.mjs', import.meta.url))
  const folder = mkdtempSync(join(tmpdir(), 'rea-lab-bench-real-'))
  const binary = randomBytes(512)
  mkdirSync(join(folder, 'demo'), { recursive: true })
  writeFileSync(join(folder, 'demo', 'target.exe'), binary)
  const sha256 = createHash('sha256').update(binary).digest('hex')
  writeFileSync(join(folder, 'manifest.json'), JSON.stringify({ set: 'real', programs: [{ id: 'demo', role: 'pilot', file: 'demo/target.exe', sha256, image_base: '0x140000000' }] }))
  writeFileSync(join(folder, 'answers.json'), JSON.stringify({ set: 'real', role: 'pilot', version: 1, tasks: [{ id: task.id, program: 'demo', family: task.family, question: QUESTION, answer: { kind: 'function', name: 'gz_zero', start: '0x140001000', end: '0x140001080' } }] }))
  const home = mkdtempSync(join(tmpdir(), 'rea-lab-bench-home-'))
  const result = spawnSync(process.execPath, [runner, '--study', 'real', '--model', 'fake-model', '--set', folder, '--conditions', 'A'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      REA_LAB_BENCH_HOME: home,
      REA_LAB_BENCH_CLAUDE: fake,
      REA_LAB_BENCH_OAUTH_TOKEN: 'test-token',
      FAKE_CLAUDE_CLAIMS: JSON.stringify([
        { id: 'answer_address', value: '0x140001000', confidence: 'derived', authority: 'analyst-inference' },
        { id: 'source_name', value: 'gz_zero', confidence: 'inferred', authority: 'analyst-inference' },
      ]),
    },
  })
  assert.equal(result.status, 0, result.stderr)
  const studyDir = join(home, 'runs', 'real')
  const record = JSON.parse(readFileSync(join(studyDir, 'results.jsonl'), 'utf8').trim())
  assert.equal(record.key, 'p01-x64-O2-strip-A-r1')
  assert.equal(record.set, 'real-pilot')
  assert.equal(record.program, 'demo')
  assert.equal(record.solved, true)
  assert.deepEqual(record.address, { parsed: true, form: 'va', inside: true, exactStart: true, inCitedEvidence: null, namedInCitedEvidence: null, citedOperation: null })
  assert.equal(record.sourceNameCorrect, true)
  // Studies without an injected skill keep the record shape of studies 3 and 4.
  assert.equal('first_request_usage' in record, false)
  const study = JSON.parse(readFileSync(join(studyDir, 'study.json'), 'utf8'))
  assert.match(study.set_sha256, /^[0-9a-f]{64}$/)
  const diagnostics = readFileSync(join(studyDir, record.key, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)).find((event) => event.subtype === 'fake_diagnostics')
  assert.deepEqual(diagnostics.work_files, ['target.exe'])
  assert.ok(diagnostics.prompt_text.includes(QUESTION))
  assert.deepEqual(diagnostics.additional_directories, [join(studyDir, record.key, 'claude-config', 'projects')])
})

/** A one-program real set, for end-to-end runs of the harness against the fake Claude Code. */
function realFixture() {
  const folder = mkdtempSync(join(tmpdir(), 'rea-lab-bench-real-'))
  const binary = randomBytes(512)
  mkdirSync(join(folder, 'demo'), { recursive: true })
  writeFileSync(join(folder, 'demo', 'target.exe'), binary)
  const sha256 = createHash('sha256').update(binary).digest('hex')
  writeFileSync(join(folder, 'manifest.json'), JSON.stringify({ set: 'real', programs: [{ id: 'demo', role: 'pilot', file: 'demo/target.exe', sha256, image_base: '0x140000000' }] }))
  writeFileSync(join(folder, 'answers.json'), JSON.stringify({ set: 'real', role: 'pilot', version: 1, tasks: [{ id: task.id, program: 'demo', family: task.family, question: QUESTION, answer: { kind: 'function', name: 'gz_zero', start: '0x140001000', end: '0x140001080' } }] }))
  return folder
}

function realBench(home: string, folder: string, conditions: string) {
  const runner = fileURLToPath(new URL('../run.ts', import.meta.url))
  const fake = fileURLToPath(new URL('./fake-claude.mjs', import.meta.url))
  return spawnSync(process.execPath, [runner, '--study', 'skills', '--model', 'fake-model', '--set', folder, '--conditions', conditions], {
    encoding: 'utf8',
    env: {
      ...process.env,
      REA_LAB_BENCH_HOME: home,
      REA_LAB_BENCH_CLAUDE: fake,
      REA_LAB_BENCH_OAUTH_TOKEN: 'test-token',
      FAKE_CLAUDE_CLAIMS: JSON.stringify([{ id: 'answer_address', value: '0x140001000', confidence: 'derived', authority: 'analyst-inference' }]),
    },
  })
}

test('C1 and C2 inject the official and the improved skill into the system prompt, with readable references', () => {
  const home = mkdtempSync(join(tmpdir(), 'rea-lab-bench-home-'))
  const result = realBench(home, realFixture(), 'B,C1,C2')
  assert.equal(result.status, 0, result.stderr)
  const studyDir = join(home, 'runs', 'skills')
  const records = readFileSync(join(studyDir, 'results.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  const byCondition = Object.fromEntries(records.map((record) => [record.condition, record]))
  const diagnostics = (key: string) => readFileSync(join(studyDir, key, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)).find((event) => event.subtype === 'fake_diagnostics')

  // B gets no skill; C1 and C2 get the text, never an installed skill, and the record names which one.
  assert.equal(diagnostics(byCondition.B.key).appended_system_prompt, null)
  assert.equal(byCondition.B.injected_skill, undefined)
  const officialPrompt = diagnostics(byCondition.C1.key).appended_system_prompt
  const improvedPrompt = diagnostics(byCondition.C2.key).appended_system_prompt
  assert.match(officialPrompt, /## Route the target first/)
  assert.doesNotMatch(officialPrompt, /## Locate code in a native binary/)
  assert.match(improvedPrompt, /## Locate code in a native binary/)
  assert.equal(byCondition.C1.injected_skill, 'official')
  assert.equal(byCondition.C2.injected_skill, 'improved')
  for (const condition of ['C1', 'C2']) {
    const record = byCondition[condition]
    const skillDir = join(studyDir, record.key, 'claude-config', 'injected-skill')
    assert.ok(readFileSync(join(skillDir, 'references', 'native-and-artifacts.md'), 'utf8').length > 0)
    assert.ok(diagnostics(record.key).additional_directories.includes(skillDir))
    assert.ok(diagnostics(record.key).appended_system_prompt.includes(join(skillDir, 'references')))
    assert.equal(record.isolation.ok, true, record.isolation.problems.join(', '))
    assert.equal(record.isolation.skillOffered, false)
  }
  // A skill study records the first request's usage in every condition, B included, for the cost sensitivity.
  for (const record of records) assert.deepEqual(record.first_request_usage, { input_tokens: 3, output_tokens: 20, cache_creation_input_tokens: 80, cache_read_input_tokens: 0 })

  // The study locks both skills by digest, and they differ.
  const study = JSON.parse(readFileSync(join(studyDir, 'study.json'), 'utf8'))
  assert.equal(study.skills.C1.skill, 'official')
  assert.equal(study.skills.C2.skill, 'improved')
  assert.match(study.skills.C1.sha256, /^[0-9a-f]{64}$/)
  assert.notEqual(study.skills.C1.sha256, study.skills.C2.sha256)
  assert.ok(study.skills.C2.body_bytes > study.skills.C1.body_bytes)
  assert.equal(study.skills.B, undefined)
})

test('a set folder inside the benchmark home is refused before any run', () => {
  const home = mkdtempSync(join(tmpdir(), 'rea-lab-bench-home-'))
  const inside = join(home, 'sets', 'demo')
  mkdirSync(inside, { recursive: true })
  const outside = realFixture()
  for (const name of ['manifest.json', 'answers.json']) writeFileSync(join(inside, name), readFileSync(join(outside, name)))
  mkdirSync(join(inside, 'demo'))
  writeFileSync(join(inside, 'demo', 'target.exe'), readFileSync(join(outside, 'demo', 'target.exe')))
  const result = realBench(home, inside, 'B')
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /is inside the benchmark home/)
  assert.equal(readdirSync(home).includes('runs'), false)
})
