#!/usr/bin/env node
// Runs benchmark batches (ADR 0018): one isolated `claude -p` per challenge, variant, condition and
// repetition, in a seeded random order. Raw transcripts stay in the benchmark home, outside the
// repository; every graded run is appended to results.jsonl. Finished runs are skipped, so an
// interrupted batch resumes where it stopped.
//
// Usage:
//   node bench/run.ts --study <name> --model <id> [--provider anthropic|deepseek] [--effort <level>] [--set public|<built folder>]
//     [--challenges c01-compare,...] [--variants x64-O2-strip,...] [--cells id:variant,...] [--conditions A,B,C | B,C1,C2]
//     [--repetitions <n> | A=<n>,B=<n>,C=<n>] [--order-seed <n>] [--timeout-min <n>] [--max-budget-usd <n>] [--dry-run | --probe]
//
//   --dry-run  prints the planned runs and the prompt, without starting Claude Code
//   C1 and C2  inject rea's official skill or the lab's improved skill into the system prompt (ADR 0025)
//   A built set must live outside the benchmark home, so no run can reach its ground truth (ADR 0018)
//   --probe    one trivial session per condition, to check isolation before spending real runs
//   --probe-prompt <text>  with --probe, send this prompt instead (for example to check what a command may do)
//   --provider deepseek  Claude Code served by DeepSeek's Anthropic-compatible API instead of Anthropic: the model must be
//              an explicit deepseek-* id, the key comes from <bench home>/deepseek-key, REA_LAB_BENCH_DEEPSEEK_KEY_FILE or
//              REA_LAB_BENCH_DEEPSEEK_KEY, and the cost is computed from the usage with DeepSeek's prices (bench/prices.ts)

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, copyFileSync, cpSync, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseStreamJson } from './claude.ts'
import { CONDITIONS, BUILT_IN_TOOLS, mcpConfig, runSettings, taskPrompt, toolResultsFolder, type ConditionId, type SetKind } from './conditions.ts'
import { gradeRun, type Challenge } from './grade.ts'
import { deepseekCost } from './prices.ts'
import { injectedSkillFolder, skillDigest, skillFolder, skillSystemPrompt } from './skill.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REA_VERSION: string = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'rea-agents', 'package.json'), 'utf8')).version

export type Provider = 'anthropic' | 'deepseek'

/** DeepSeek's Anthropic-compatible endpoint. An unknown model name there silently becomes deepseek-flash. */
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/anthropic'

type Options = {
  study: string
  model: string
  provider: Provider
  effort: string
  set: string
  challenges: string[] | null
  variants: string[]
  /** Explicit challenge and variant pairs ("c03-checksum:x86-O2-strip"); when given, they replace challenges times variants. */
  cells: Array<{ id: string; variant: string }> | null
  conditions: ConditionId[]
  repetitions: Partial<Record<ConditionId, number>>
  orderSeed: number
  timeoutMs: number
  maxBudgetUsd: number
  dryRun: boolean
  probe: boolean
  probePrompt: string | null
}

/** "3" gives every condition three repetitions; "A=3,B=3,C=1" sets them per condition. */
function parseRepetitions(text: string, conditions: ConditionId[]): Partial<Record<ConditionId, number>> {
  const parts = text.split(',').map((part) => part.trim())
  const result: Partial<Record<ConditionId, number>> = {}
  if (parts.length === 1 && !parts[0].includes('=')) {
    for (const condition of conditions) result[condition] = Number.parseInt(parts[0], 10)
  } else {
    for (const part of parts) {
      const [condition, count] = part.split('=')
      result[condition as ConditionId] = Number.parseInt(count, 10)
    }
  }
  for (const condition of conditions) {
    if (!Number.isInteger(result[condition]) || result[condition]! < 1) throw new Error(`--repetitions has no valid count for condition ${condition}`)
  }
  return result
}

function parseOptions(argv: string[]): Options {
  const value = (name: string) => {
    const index = argv.indexOf(name)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const list = (name: string) => value(name)?.split(',').map((item) => item.trim()).filter(Boolean)
  const study = value('--study')
  const model = value('--model')
  if (!study || !/^[a-z0-9][a-z0-9-]*$/.test(study)) throw new Error('--study is required (lowercase letters, digits and dashes)')
  if (!model) throw new Error('--model is required, so every study states the exact model it used')
  const provider = (value('--provider') ?? 'anthropic') as Provider
  if (provider !== 'anthropic' && provider !== 'deepseek') throw new Error(`Unknown provider ${provider}`)
  // DeepSeek maps any name it does not know, claude-* included, to deepseek-flash, so only its own ids are accepted.
  if (provider === 'deepseek' && !/^deepseek-[a-z0-9.-]+(\[1m\])?$/.test(model)) throw new Error(`--provider deepseek needs an explicit deepseek-* model, not ${model}`)
  if (provider === 'anthropic' && model.startsWith('deepseek-')) throw new Error(`${model} needs --provider deepseek`)
  const conditions = (list('--conditions') ?? ['A', 'B', 'C']) as ConditionId[]
  for (const condition of conditions) if (!CONDITIONS[condition]) throw new Error(`Unknown condition ${condition}`)
  return {
    study,
    model,
    provider,
    effort: value('--effort') ?? 'medium',
    set: value('--set') ?? 'public',
    challenges: list('--challenges') ?? null,
    cells: list('--cells')?.map((cell) => {
      const [id, variant] = cell.split(':')
      if (!id || !variant) throw new Error(`--cells takes id:variant pairs, not ${cell}`)
      return { id, variant }
    }) ?? null,
    variants: list('--variants') ?? ['x64-O2-strip'],
    conditions,
    repetitions: parseRepetitions(value('--repetitions') ?? '1', conditions),
    orderSeed: Number.parseInt(value('--order-seed') ?? '1', 10),
    timeoutMs: Number.parseFloat(value('--timeout-min') ?? '20') * 60_000,
    maxBudgetUsd: Number.parseFloat(value('--max-budget-usd') ?? '5'),
    dryRun: argv.includes('--dry-run'),
    probe: argv.includes('--probe'),
    probePrompt: value('--probe-prompt') ?? null,
  }
}

/** The benchmark home: outside the repository, holds run folders, transcripts and the token file. */
export const benchHome = () =>
  resolve(process.env.REA_LAB_BENCH_HOME ?? join(process.env.LOCALAPPDATA ?? join(homedir(), '.cache'), 'rea-lab-bench'))

const CLAUDE_BIN = join('node_modules', '@anthropic-ai', 'claude-code', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude')

/**
 * The Claude Code executable: REA_LAB_BENCH_CLAUDE, the local dev dependency, or the npm-installed one found
 * through PATH (a shim such as claude.cmd cannot be spawned without a shell, so the real binary is used).
 */
function claudeExecutable(): { path: string; pinned: boolean } {
  if (process.env.REA_LAB_BENCH_CLAUDE) return { path: process.env.REA_LAB_BENCH_CLAUDE, pinned: true }
  if (existsSync(join(ROOT, CLAUDE_BIN))) return { path: join(ROOT, CLAUDE_BIN), pinned: true }
  const pathValue = Object.entries(process.env).find(([name]) => name.toUpperCase() === 'PATH')?.[1] ?? ''
  for (const folder of pathValue.split(delimiter).filter(Boolean)) {
    for (const candidate of [join(folder, CLAUDE_BIN), join(folder, process.platform === 'win32' ? 'claude.exe' : 'claude')]) {
      if (existsSync(candidate)) return { path: candidate, pinned: false }
    }
  }
  throw new Error('Claude Code not found. Set REA_LAB_BENCH_CLAUDE to its executable.')
}

/** A JavaScript module as the executable runs under Node: that is how the harness tests use a fake Claude Code. */
const command = (path: string, args: string[]): [string, string[]] =>
  /\.m?js$/.test(path) ? [process.execPath, [path, ...args]] : [path, args]

function claudeVersion(path: string): string {
  const result = spawnSync(...command(path, ['--version']), { encoding: 'utf8' })
  const match = /(\d+\.\d+\.\d+)/.exec(result.stdout ?? '')
  if (!match) throw new Error(`Cannot read the Claude Code version from ${path}`)
  return match[1]
}

/** The provider's credential for the child process only. It is never printed or written into a run folder. */
function credential(home: string, provider: Provider): string {
  if (provider === 'deepseek') {
    if (process.env.REA_LAB_BENCH_DEEPSEEK_KEY) return process.env.REA_LAB_BENCH_DEEPSEEK_KEY
    const file = process.env.REA_LAB_BENCH_DEEPSEEK_KEY_FILE ?? join(home, 'deepseek-key')
    if (!existsSync(file)) throw new Error(`No DeepSeek API key. Save it in ${file}, or set REA_LAB_BENCH_DEEPSEEK_KEY_FILE or REA_LAB_BENCH_DEEPSEEK_KEY.`)
    return readFileSync(file, 'utf8').trim()
  }
  return authenticationToken(home)
}

/** The Anthropic token for the child process only. It is never printed or written into a run folder. */
function authenticationToken(home: string): string {
  if (process.env.REA_LAB_BENCH_OAUTH_TOKEN) return process.env.REA_LAB_BENCH_OAUTH_TOKEN
  const file = process.env.REA_LAB_BENCH_TOKEN_FILE ?? join(home, 'oauth-token')
  if (!existsSync(file)) {
    throw new Error(`No authentication token. Run "claude setup-token" and save the token in ${file}, or set REA_LAB_BENCH_OAUTH_TOKEN.`)
  }
  return readFileSync(file, 'utf8').trim()
}

export type ChallengeSet = {
  name: string
  kind: SetKind
  folder: string
  seed: number | null
  challenges: Challenge[]
  binaries: Array<{ id: string; variant: string; file: string; sha256: string }>
  /** SHA-256 of answers.json, so a study cannot resume against a changed task file. */
  answersSha256: string
}

// "public" and "public-large" are the public builds in build/; any other value is the folder of a held-out set
// or of the real-software build (challenges/real.mjs, with answers.json from challenges/real-tasks.mjs resolve).
const PUBLIC_SETS: Readonly<Record<string, string>> = { public: 'challenges', 'public-large': 'challenges-large' }

/** The single build variant of the real-software targets (x64, -O2, stripped). */
export const REAL_VARIANT = 'x64-O2-strip'

export function loadSet(set: string): ChallengeSet {
  const publicFolder = PUBLIC_SETS[set]
  const folder = publicFolder === undefined ? resolve(set) : join(ROOT, 'build', publicFolder)
  const manifestFile = join(folder, 'manifest.json')
  const hint = set === 'public-large' ? ' --set large' : publicFolder === undefined ? ' [--set large] --seed <n> --out <folder>' : ''
  if (!existsSync(manifestFile)) throw new Error(`No built challenges in ${folder}. Run: node challenges/build.mjs${hint}`)
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
  const answersFile = join(folder, 'answers.json')
  if (!existsSync(answersFile)) throw new Error(`No answers.json in ${folder}. For real-software tasks run: node challenges/real-tasks.mjs resolve <task file>`)
  const answersText = readFileSync(answersFile, 'utf8')
  const answers = JSON.parse(answersText)
  const answersSha256 = createHash('sha256').update(answersText).digest('hex')
  if (answers.set === 'real') {
    // One task per run; every task of a program uses that program's target (ADR 0024).
    const programs = new Map<string, { file: string; sha256: string; image_base: string }>(manifest.programs.map((program: { id: string; file: string; sha256: string; image_base: string }) => [program.id, program]))
    const challenges: Challenge[] = answers.tasks.map((task: { id: string; program: string; family: string; question: string; answer: Record<string, unknown> }) => {
      const program = programs.get(task.program)
      if (!program) throw new Error(`Task ${task.id} needs program ${task.program}, which is not in ${manifestFile}`)
      return { id: task.id, family: task.family, program: task.program, question: task.question, answer: { ...task.answer, image_base: program.image_base } }
    })
    const binaries = challenges.map((challenge) => ({ id: challenge.id, variant: REAL_VARIANT, file: programs.get(challenge.program!)!.file, sha256: programs.get(challenge.program!)!.sha256 }))
    return { name: answers.role === 'pilot' ? 'real-pilot' : 'held-out-real', kind: 'real', folder, seed: null, challenges, binaries, answersSha256 }
  }
  const kind: SetKind = answers.set === 'large' ? 'large' : 'small'
  const name = publicFolder === undefined ? (kind === 'large' ? 'held-out-large' : 'held-out') : set
  return { name, kind, folder, seed: manifest.seed, challenges: answers.challenges, binaries: manifest.binaries, answersSha256 }
}

// Same small PRNG as the challenge generator (mulberry32), used here to shuffle the run order.
function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type PlannedRun = { key: string; challenge: Challenge; variant: string; condition: ConditionId; repetition: number; binary: { file: string; sha256: string } }

export function planRuns(
  set: ChallengeSet,
  options: Pick<Options, 'challenges' | 'variants' | 'cells' | 'conditions' | 'repetitions' | 'orderSeed'>,
): PlannedRun[] {
  const cells = options.cells ?? set.challenges
    .filter((challenge) => !options.challenges || options.challenges.includes(challenge.id))
    .flatMap((challenge) => options.variants.map((variant) => ({ id: challenge.id, variant })))
  const runs: PlannedRun[] = []
  for (const { id, variant } of cells) {
    const challenge = set.challenges.find((candidate) => candidate.id === id)
    if (!challenge) throw new Error(`No challenge ${id} in the ${set.name} set`)
    const binary = set.binaries.find((candidate) => candidate.id === id && candidate.variant === variant)
    if (!binary) throw new Error(`No ${variant} build for ${id}`)
    for (const condition of options.conditions) {
      for (let repetition = 1; repetition <= options.repetitions[condition]!; repetition++) {
        runs.push({ key: `${id}-${variant}-${condition}-r${repetition}`, challenge, variant, condition, repetition, binary })
      }
    }
  }
  const random = createRandom(options.orderSeed)
  for (let index = runs.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[runs[index], runs[other]] = [runs[other], runs[index]]
  }
  return runs
}

/**
 * Environment for the child: inherited variables minus anything that could leak configuration in, plus the
 * provider's credential. A DeepSeek run gets its endpoint, key and model and never the Anthropic token, so it
 * cannot fall back to Anthropic's credentials.
 */
function childEnvironment(configDir: string, token: string, provider: Provider = 'anthropic', model = ''): NodeJS.ProcessEnv {
  // Claude Code also reads tuning switches without a CLAUDE prefix. Until study 4 the desktop app that launched
  // the studies passed DISABLE_MICROCOMPACT=1 and API_TIMEOUT_MS to every run; they are blocked from study 5 on.
  const blocked = /^(CLAUDE|ANTHROPIC_|REA_|CODEX_|GHIDRA_|JAVA_HOME$|MCP_|OTEL_|DISABLE_|ENABLE_|FORCE_|MAX_|API_TIMEOUT_MS$|USE_(LOCAL|STAGING)_OAUTH$|BASH_(DEFAULT_TIMEOUT_MS|MAX_TIMEOUT_MS|MAX_OUTPUT_LENGTH)$)/i
  const env: NodeJS.ProcessEnv = {}
  for (const [name, value] of Object.entries(process.env)) if (!blocked.test(name)) env[name] = value
  const tools = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8')).tools
  const llvm = tools.find((tool: { id: string }) => tool.id === 'llvm-mingw')
  const pathName = Object.keys(env).find((name) => name.toUpperCase() === 'PATH') ?? 'PATH'
  env[pathName] = [join(ROOT, 'tools', llvm.dir, 'bin'), env[pathName]].join(delimiter)
  const credentials: NodeJS.ProcessEnv = provider === 'deepseek'
    ? {
        ANTHROPIC_BASE_URL: DEEPSEEK_BASE_URL,
        ANTHROPIC_AUTH_TOKEN: token,
        // Every model slot names the same explicit id, so no request can be mapped to another model.
        ANTHROPIC_MODEL: model,
        ANTHROPIC_DEFAULT_OPUS_MODEL: model,
        ANTHROPIC_DEFAULT_SONNET_MODEL: model,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
        CLAUDE_CODE_SUBAGENT_MODEL: model,
        // Claude Code turns tool search off for a base URL that is not Anthropic's and would then send every rea
        // schema with each request (127,161 input tokens for a trivial run against 5,745 without rea). Forcing it
        // keeps the schemas deferred, as in the Anthropic studies; a probe showed DeepSeek supports it.
        ENABLE_TOOL_SEARCH: 'true',
      }
    : { CLAUDE_CODE_OAUTH_TOKEN: token }
  return {
    ...env,
    CLAUDE_CONFIG_DIR: configDir,
    ...credentials,
    DISABLE_AUTOUPDATER: '1',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  }
}

function killTree(pid: number | undefined) {
  if (pid === undefined) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  else process.kill(-pid, 'SIGKILL')
}

const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex')

async function executeRun(run: PlannedRun, set: ChallengeSet, options: Options, context: { home: string; claude: string; version: string; token: string; prompt?: string }) {
  const runDir = join(context.home, 'runs', options.study, run.key)
  const work = join(runDir, 'work')
  const config = join(runDir, 'claude-config')
  const temp = join(runDir, 'tmp')
  rmSync(runDir, { recursive: true, force: true })
  for (const folder of [work, config, temp]) mkdirSync(folder, { recursive: true })

  const target = join(work, 'target.exe')
  copyFileSync(join(set.folder, run.binary.file), target)
  if (sha256(target) !== run.binary.sha256) throw new Error(`${run.key}: the copied target does not match the manifest hash`)

  const condition = CONDITIONS[run.condition]
  // Passed with --settings: permission rules in settings files of an untrusted folder are ignored in print mode.
  const settingsFile = join(runDir, 'settings.json')
  writeFileSync(settingsFile, `${JSON.stringify(runSettings(condition, ROOT, set.kind, config), null, 2)}\n`)
  if (condition.withSkill) {
    cpSync(join(ROOT, 'node_modules', 'rea-agents', 'skills', 'reverse-engineer-anything'), join(config, 'skills', 'reverse-engineer-anything'), { recursive: true })
  }
  // ADR 0025: the skill's text goes into the system prompt; its references/ stay readable in the run.
  const skillPromptFile = join(runDir, 'skill-prompt.md')
  if (condition.injectedSkill !== undefined) {
    const source = skillFolder(ROOT, condition.injectedSkill)
    const references = join(injectedSkillFolder(config), 'references')
    if (existsSync(join(source, 'references'))) cpSync(join(source, 'references'), references, { recursive: true })
    writeFileSync(skillPromptFile, skillSystemPrompt(source, references))
  }
  const mcpFile = join(runDir, 'mcp.json')
  writeFileSync(mcpFile, `${JSON.stringify(mcpConfig(condition, ROOT, temp), null, 2)}\n`)

  const args = [
    '--print', '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
    '--setting-sources', 'user', '--settings', settingsFile, '--strict-mcp-config', '--mcp-config', mcpFile,
    '--model', options.model, '--effort', options.effort,
    '--tools', BUILT_IN_TOOLS.join(','), '--permission-mode', 'dontAsk',
    '--max-budget-usd', String(options.maxBudgetUsd),
    ...(condition.injectedSkill !== undefined ? ['--append-system-prompt-file', skillPromptFile] : []),
  ]

  const eventsFile = join(runDir, 'events.jsonl')
  const started = Date.now()
  const outcome = await new Promise<{ exitCode: number | null; timedOut: boolean }>((resolvePromise, reject) => {
    const child = spawn(...command(context.claude, args), {
      cwd: work,
      env: childEnvironment(config, context.token, options.provider, options.model),
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      windowsHide: true,
    })
    // The prompt goes through stdin: no quoting or length limits on the Windows command line.
    child.stdin.end(context.prompt ?? taskPrompt(condition, set.kind, run.challenge))
    child.stdout.pipe(createWriteStream(eventsFile))
    child.stderr.pipe(createWriteStream(join(runDir, 'stderr.txt')))
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killTree(child.pid)
    }, options.timeoutMs)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (exitCode) => {
      clearTimeout(timer)
      resolvePromise({ exitCode, timedOut })
    })
  })
  const wallMs = Date.now() - started
  // rea's temporary files; on timeout the whole process tree was already killed.
  rmSync(temp, { recursive: true, force: true, maxRetries: 3 })

  const transcript = parseStreamJson(readFileSync(eventsFile, 'utf8').split('\n'))
  const grade = gradeRun(transcript, run.challenge, {
    withRea: condition.withRea,
    withSkill: condition.withSkill,
    targetSha256: run.binary.sha256,
    workDir: work,
    variant: run.variant,
    kind: set.kind,
    extraRoots: [
      ...(set.kind === 'real' ? [toolResultsFolder(config)] : []),
      ...(condition.injectedSkill !== undefined ? [injectedSkillFolder(config)] : []),
    ],
    configDir: config,
  })
  const record = {
    schema: 1,
    study: options.study,
    key: run.key,
    set: set.name,
    seed: set.name in PUBLIC_SETS ? set.seed : null,
    challenge: run.challenge.id,
    family: run.challenge.family,
    ...(run.challenge.program === undefined ? {} : { program: run.challenge.program }),
    variant: run.variant,
    condition: run.condition,
    ...(condition.injectedSkill !== undefined ? { injected_skill: condition.injectedSkill } : {}),
    repetition: run.repetition,
    target_sha256: run.binary.sha256,
    client: 'claude-code',
    client_version: context.version,
    // Anthropic runs keep exactly their fields, so their records do not change.
    ...(options.provider === 'deepseek' ? { provider: options.provider, served_models: transcript.servedModels } : {}),
    requested_model: options.model,
    model: transcript.model,
    effort: options.effort,
    rea_version: REA_VERSION,
    exit_code: outcome.exitCode,
    timed_out: outcome.timedOut,
    wall_ms: wallMs,
    // The session failed before the agent did anything (no init, or an error with no tool call): rerun it.
    infrastructure_failure: !outcome.timedOut && (transcript.sessionId === null || transcript.result === null || (transcript.result.isError && transcript.toolCalls.length === 0)),
    result_subtype: transcript.result?.subtype ?? null,
    result_is_error: transcript.result?.isError ?? null,
    terminal_reason: transcript.result?.terminalReason ?? null,
    duration_ms: transcript.result?.durationMs ?? null,
    duration_api_ms: transcript.result?.durationApiMs ?? null,
    num_turns: transcript.result?.numTurns ?? null,
    // With DeepSeek, Claude Code's own figure uses Claude prices; the cost is computed from the usage instead (ADR 0020).
    equivalent_cost_usd: options.provider === 'deepseek'
      ? (transcript.result?.usage ? deepseekCost(options.model, transcript.result.usage, new Date(started)) : null)
      : transcript.result?.totalCostUsd ?? null,
    ...(options.provider === 'deepseek' ? { client_reported_cost_usd: transcript.result?.totalCostUsd ?? null, started_at: new Date(started).toISOString() } : {}),
    usage: transcript.result?.usage ?? null,
    // The first request's cache writes depend on the run order; the skill comparison prices them apart (ADR 0025).
    ...(options.conditions.some((id) => CONDITIONS[id].injectedSkill !== undefined) ? { first_request_usage: transcript.firstRequestUsage } : {}),
    mcp_servers: transcript.mcpServers,
    ...grade,
  }
  writeFileSync(join(runDir, 'run.json'), `${JSON.stringify(record, null, 2)}\n`)
  appendFileSync(join(context.home, 'runs', options.study, 'results.jsonl'), `${JSON.stringify(record)}\n`)
  return record
}

/**
 * Checks the harness without spending a real run: one trivial session per condition, then prints what each
 * one loaded (plugins, skills, MCP servers) against what its condition allows.
 */
async function probe(runs: PlannedRun[], set: ChallengeSet, options: Options, context: { home: string; claude: string; version: string; token: string }) {
  for (const condition of options.conditions) {
    const run = runs.find((candidate) => candidate.condition === condition)!
    const record = await executeRun({ ...run, key: `probe-${condition}` }, set, { ...options, timeoutMs: 5 * 60_000 }, {
      ...context,
      prompt: options.probePrompt ?? 'Reply with the single word OK. Do not call any tool.',
    })
    const servers = record.mcp_servers.map((server) => `${server.name}:${server.status}`).join(', ')
    const isolation = record.isolation.ok ? 'isolation holds' : `isolation problems: ${record.isolation.problems.join(', ')}`
    console.log(`${condition}: ${isolation}; MCP servers [${servers}], plugins [${record.isolation.plugins.join(', ')}], skill offered: ${record.isolation.skillOffered}, model ${record.model}, ${Math.round(record.wall_ms / 1000)} s, terminal reason ${record.terminal_reason ?? 'none'}`)
    // With a custom prompt, show what the session did, so a permission or path rule can be checked without opening the run folder.
    if (options.probePrompt) {
      console.log(`  tool calls: ${Object.entries(record.toolCalls).map(([name, count]) => `${name} x${count}`).join(', ') || 'none'}; denied: ${record.permissionDenials}; paths outside the run: ${record.outsidePaths.length === 0 ? 'none' : record.outsidePaths.join(', ')}`)
      console.log(`  final answer: ${(record.answerFound ? '(manifest) ' : '') + String(readFileSync(join(context.home, 'runs', options.study, `probe-${condition}`, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)).filter((event) => event.type === 'result').map((event) => event.result).at(-1) ?? '').slice(0, 400)}`)
    }
  }
}

/** The digest of every skill the conditions inject, by condition (ADR 0025). */
export function injectedSkills(conditions: ConditionId[]) {
  const skills: Partial<Record<ConditionId, ReturnType<typeof skillDigest> & { skill: string }>> = {}
  for (const condition of conditions) {
    const skill = CONDITIONS[condition].injectedSkill
    if (skill !== undefined) skills[condition] = { skill, ...skillDigest(skillFolder(ROOT, skill)) }
  }
  return skills
}

/**
 * A built set inside the benchmark home sits a few folders above every run, with its ground truth: study 4
 * showed runs trying to list those folders. The policy denied them, but the set must not be there (ADR 0018).
 */
export function refuseSetInsideHome(setFolder: string, home: string) {
  const path = relative(resolve(home), resolve(setFolder))
  if (path === '' || (!path.startsWith('..') && !isAbsolute(path))) {
    throw new Error(`The set folder ${setFolder} is inside the benchmark home ${home}; move it outside, so no run can reach its ground truth`)
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const home = benchHome()
  const set = loadSet(options.set)
  refuseSetInsideHome(set.folder, home)
  const runs = planRuns(set, options)
  const { path: claude, pinned } = claudeExecutable()
  const version = claudeVersion(claude)
  console.log(`Study ${options.study}: ${runs.length} runs, ${set.name} set, Claude Code ${version}${pinned ? '' : ' (from PATH, not pinned)'}, rea ${REA_VERSION}, model ${options.model}${options.provider === 'deepseek' ? ' served by DeepSeek' : ''}, effort ${options.effort}`)
  console.log(`Benchmark home: ${home}`)
  if (options.dryRun) {
    for (const run of runs) console.log(`  ${run.key}`)
    console.log(`\nPrompt for condition B (${runs[0]?.challenge.id ?? 'no run'}):\n${taskPrompt(CONDITIONS.B, set.kind, runs[0]?.challenge)}`)
    return
  }
  const token = credential(home, options.provider)
  if (options.probe) return probe(runs, set, options, { home, claude, version, token })
  const studyDir = join(home, 'runs', options.study)
  mkdirSync(studyDir, { recursive: true })
  const studyFile = join(studyDir, 'study.json')
  const skills = injectedSkills(options.conditions)
  const study = {
    study: options.study, client_version: version, rea_version: REA_VERSION, model: options.model,
    ...(options.provider === 'deepseek' ? { provider: options.provider } : {}),
    effort: options.effort, set: set.name, set_sha256: set.answersSha256,
    ...(Object.keys(skills).length > 0 ? { skills } : {}),
  }
  if (existsSync(studyFile)) {
    const previous = JSON.parse(readFileSync(studyFile, 'utf8'))
    for (const field of ['client_version', 'rea_version', 'model', 'effort', 'set'] as const) {
      if (previous[field] !== study[field]) throw new Error(`Study ${options.study} was started with ${field} ${previous[field]}, not ${study[field]}`)
    }
    // Studies without a provider field were served by Anthropic.
    if ((previous.provider ?? 'anthropic') !== options.provider) throw new Error(`Study ${options.study} was started with provider ${previous.provider ?? 'anthropic'}, not ${options.provider}`)
    // Studies started before the answers hash was recorded (studies 1 and 2) keep resuming as before.
    if (previous.set_sha256 !== undefined && previous.set_sha256 !== study.set_sha256) {
      throw new Error(`Study ${options.study} was started with another answers.json (SHA-256 ${previous.set_sha256})`)
    }
    // An injected skill that changed after the study started would compare a different text (ADR 0025).
    for (const [condition, digest] of Object.entries(skills)) {
      const before = previous.skills?.[condition]
      if (before === undefined || before.sha256 !== digest.sha256) throw new Error(`Study ${options.study} was started with another skill for ${condition} (SHA-256 ${before?.sha256 ?? 'none'})`)
    }
  } else writeFileSync(studyFile, `${JSON.stringify(study, null, 2)}\n`)

  let index = 0
  for (const run of runs) {
    index++
    const runDir = join(studyDir, run.key)
    // Infrastructure failures are rerun up to twice (preregistration); earlier attempts are kept beside the run.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const previousFile = join(runDir, 'run.json')
      if (existsSync(previousFile)) {
        const previous = JSON.parse(readFileSync(previousFile, 'utf8'))
        const kept = Array.from({ length: 3 }, (_, number) => `${runDir}.attempt-${number + 1}`).filter((folder) => existsSync(folder)).length
        if (!previous.infrastructure_failure || kept >= 2) {
          console.log(`[${index}/${runs.length}] ${run.key}: already done`)
          break
        }
        renameSync(runDir, `${runDir}.attempt-${kept + 1}`)
      }
      const record = await executeRun(run, set, options, { home, claude, version, token })
      const cost = record.equivalent_cost_usd === null ? '?' : record.equivalent_cost_usd.toFixed(2)
      const status = record.infrastructure_failure ? `infrastructure failure (${record.terminal_reason ?? 'no result'})` : record.solved ? 'solved' : 'not solved'
      console.log(`[${index}/${runs.length}] ${run.key}: ${status}${record.timed_out ? ' (timed out)' : ''}, ${Math.round(record.wall_ms / 1000)} s, ${cost} USD equivalent`)
      if (!record.infrastructure_failure) break
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
