import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

// End-to-end runs of bench/run.ts against a fake Claude Code: preparation, isolation, grading and resuming,
// without network access or a real model.

const runner = fileURLToPath(new URL('../run.ts', import.meta.url))
const fake = fileURLToPath(new URL('./fake-claude.mjs', import.meta.url))

function fixtureSet() {
  const folder = mkdtempSync(join(tmpdir(), 'rea-lab-bench-set-'))
  const binary = randomBytes(256)
  mkdirSync(join(folder, 'bin', 'c01-compare'), { recursive: true })
  writeFileSync(join(folder, 'bin', 'c01-compare', 'c01.exe'), binary)
  const sha256 = createHash('sha256').update(binary).digest('hex')
  writeFileSync(join(folder, 'manifest.json'), JSON.stringify({
    seed: 1,
    binaries: [{ id: 'c01-compare', variant: 'x64-O2-strip', file: 'bin/c01-compare/c01.exe', size: binary.length, sha256 }],
  }))
  writeFileSync(join(folder, 'answers.json'), JSON.stringify({
    challenges: [{ id: 'c01-compare', family: 'compare', description: 'test', answer: { input: 'indigo-tundra-61' } }],
  }))
  return folder
}

function bench(home: string, set: string, study: string, conditions: string, extra: Record<string, string> = {}) {
  return spawnSync(process.execPath, [runner, '--study', study, '--model', 'fake-model', '--set', set, '--conditions', conditions], {
    encoding: 'utf8',
    env: {
      ...process.env,
      REA_LAB_BENCH_HOME: home,
      REA_LAB_BENCH_CLAUDE: fake,
      REA_LAB_BENCH_OAUTH_TOKEN: 'test-token',
      FAKE_CLAUDE_ANSWER: 'indigo-tundra-61',
      CLAUDECODE: '1',
      ANTHROPIC_MODEL: 'should-not-leak',
      ...extra,
    },
  })
}

const diagnostics = (runDir: string) =>
  readFileSync(join(runDir, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)).find((event) => event.subtype === 'fake_diagnostics')

test('a batch isolates, grades and records each run, and resumes without repeating work', () => {
  const home = mkdtempSync(join(tmpdir(), 'rea-lab-bench-home-'))
  const set = fixtureSet()
  const first = bench(home, set, 'unit', 'A,C')
  assert.equal(first.status, 0, first.stderr)

  const studyDir = join(home, 'runs', 'unit')
  const records = readFileSync(join(studyDir, 'results.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  assert.equal(records.length, 2)
  for (const record of records) {
    assert.equal(record.solved, true)
    assert.equal(record.client_version, '9.9.9')
    assert.equal(record.infrastructure_failure, false)
    assert.deepEqual(record.isolation.problems, [])
  }

  const a = diagnostics(join(studyDir, 'c01-compare-x64-O2-strip-A-r1'))
  const c = diagnostics(join(studyDir, 'c01-compare-x64-O2-strip-C-r1'))
  assert.deepEqual(a.work_files, ['target.exe'])
  assert.deepEqual(a.config_dir_files, [])
  assert.deepEqual(c.config_dir_files, ['skills'])
  assert.deepEqual(a.inherited, ['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CONFIG_DIR'])
  assert.equal(a.has_token, true)
  assert.equal(a.prompt_mentions_target, true)
  assert.equal(a.allow.includes('mcp__rea'), false)
  assert.equal(c.allow.includes('mcp__rea'), true)
  assert.equal(readFileSync(join(studyDir, 'c01-compare-x64-O2-strip-A-r1', 'events.jsonl'), 'utf8').includes('test-token'), false)

  const second = bench(home, set, 'unit', 'A,C')
  assert.equal(second.status, 0, second.stderr)
  assert.equal(second.stdout.match(/already done/g)?.length, 2)
  assert.equal(readFileSync(join(studyDir, 'results.jsonl'), 'utf8').trim().split('\n').length, 2)

  const changed = spawnSync(process.execPath, [runner, '--study', 'unit', '--model', 'another-model', '--set', set, '--conditions', 'A'], {
    encoding: 'utf8',
    env: { ...process.env, REA_LAB_BENCH_HOME: home, REA_LAB_BENCH_CLAUDE: fake, REA_LAB_BENCH_OAUTH_TOKEN: 'test-token' },
  })
  assert.notEqual(changed.status, 0)
  assert.match(changed.stderr, /was started with model fake-model/)
})

test('an infrastructure failure is retried twice and every attempt is kept', () => {
  const home = mkdtempSync(join(tmpdir(), 'rea-lab-bench-home-'))
  const result = bench(home, fixtureSet(), 'auth', 'A', { FAKE_CLAUDE_MODE: 'auth-error' })
  assert.equal(result.status, 0, result.stderr)
  const runDir = join(home, 'runs', 'auth', 'c01-compare-x64-O2-strip-A-r1')
  assert.ok(existsSync(`${runDir}.attempt-1`) && existsSync(`${runDir}.attempt-2`))
  const record = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'))
  assert.equal(record.infrastructure_failure, true)
  assert.equal(record.terminal_reason, 'api_error')
  assert.equal(result.stdout.match(/infrastructure failure/g)?.length, 3)
})
