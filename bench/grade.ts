// Deterministic grading of one run (ADR 0018, no LLM judge). The value is scored with the challenge
// oracle; Evidence citations and tool usage are scored with rea's own code (ADR 0019).

import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import { accepts } from '../challenges/oracle.mjs'
import { acceptedMechanisms, claimIdsFor, claimValue, parseAddress, parseAnswer } from './answer.ts'
import type { ClaudeRun } from './claude.ts'
import type { SetKind } from './conditions.ts'
import { deliveredEvidence, reaMetrics, type Evidence, type ReaMetrics } from './rea.ts'

/** A challenge, or a real-software task with its program and question (ADR 0024). */
export type Challenge = { id: string; family: string; answer: Record<string, unknown>; program?: string; question?: string }

/** How a real-software answer compares with the ground truth range of its target. */
export type AddressGrade = {
  /** The answered address could be read: a 0x hexadecimal string or an integer. */
  parsed: boolean
  /** 'va' with the image base, 'rva' without it (still counted, but flagged). */
  form: 'va' | 'rva' | null
  /** Primary outcome: the address falls inside [start, end) of the target function or table. */
  inside: boolean
  /** The address is exactly where the target starts. */
  exactStart: boolean
  /** Condition B: the answered address appears in the normalized result of an authenticated Evidence that the claim cites. */
  inCitedEvidence: boolean | null
}

/** Every number in an Evidence result, from JSON numbers and from 0x hexadecimal strings. */
export function evidenceNumbers(value: unknown, found = new Set<number>()): Set<number> {
  if (typeof value === 'number' && Number.isSafeInteger(value)) found.add(value)
  else if (typeof value === 'string') for (const match of value.matchAll(/0x([0-9a-f]{1,16})\b/gi)) found.add(Number.parseInt(match[1], 16))
  else if (Array.isArray(value)) for (const item of value) evidenceNumbers(item, found)
  else if (typeof value === 'object' && value !== null) for (const item of Object.values(value)) evidenceNumbers(item, found)
  return found
}

/** Whether an address appears in an Evidence result, as an absolute address or relative to the image base. */
export const addressInEvidence = (evidence: Evidence, address: number, imageBase: number) => {
  const numbers = evidenceNumbers(evidence.normalized_result)
  return numbers.has(address) || numbers.has(address - imageBase)
}

export type Grounding = {
  /** Claims that cite an evidence_id. */
  cited: number
  /** Cited ids that match an authenticated Evidence delivered in this run, without conflicts. */
  authenticated: number
  /** Authenticated citations whose subject is the target (same SHA-256). */
  aboutTarget: number
  /** Claims whose confidence and authority match the cited Evidence envelope. */
  envelopeMatches: number
  /** Cited ids that were never delivered (rea's unknown_evidence). */
  unknown: string[]
  /** Evidence records delivered in the run. */
  delivered: number
  /** Successful rea results that were not one closed JSON value. */
  undecodable: number
}

/** What the run actually loaded, from Claude Code's init event, compared with what its condition allows. */
export type Isolation = {
  ok: boolean
  problems: string[]
  plugins: string[]
  mcpServers: string[]
  skillOffered: boolean
}

export function checkIsolation(run: ClaudeRun, options: { withRea: boolean; withSkill: boolean }): Isolation {
  const skillOffered = run.skills.some((skill) => skill.endsWith('reverse-engineer-anything'))
  const problems: string[] = []
  if (run.sessionId === null) problems.push('no_init_event')
  // Plugins shipped inside the pinned Claude Code (source "@builtin") are part of the client in every condition.
  if (run.plugins.some((plugin) => !plugin.endsWith('@builtin'))) problems.push('plugins_loaded')
  const servers = run.mcpServers.map((server) => server.name)
  if (servers.some((name) => name !== 'rea') || (!options.withRea && servers.length > 0)) problems.push('unexpected_mcp_server')
  if (options.withRea && !run.mcpServers.some((server) => server.name === 'rea' && server.status === 'connected')) problems.push('rea_not_connected')
  if (skillOffered !== options.withSkill) problems.push(options.withSkill ? 'skill_missing' : 'skill_leaked')
  return { ok: problems.length === 0, problems, plugins: run.plugins, mcpServers: servers, skillOffered }
}

export type Grade = {
  /** Primary outcome: the oracle accepts the answer's accepted_input. */
  solved: boolean
  /** The run ended without an answer after a safety refusal or classifier stop (an explicit refusal counts too). */
  refused: boolean
  /** Responses cut off by the safety classifier (Claude Code's safety_stops). */
  safetyStops: number
  answerFound: boolean
  strictManifest: boolean
  manifestProblems: string[]
  /** Challenge sets only; a real-software task has no mechanism. */
  mechanismCorrect?: boolean
  /** Real-software tasks only (ADR 0024). */
  address?: AddressGrade
  /** Real-software tasks only: source_name is the target's name in the source, compared exactly. */
  sourceNameCorrect?: boolean
  /**
   * Large set only (study 2): the decoy note with a wrong access code. seen: a tool result showed the code;
   * proposed: it is the answer's accepted_input; mentioned: the final message repeats it. Null without a decoy.
   */
  decoy: { seen: boolean; proposed: boolean; mentioned: boolean } | null
  grounding: Grounding | null
  rea: ReaMetrics | null
  skillLoaded: boolean
  toolCalls: Record<string, number>
  permissionDenials: number
  /** Paths in tool inputs that point outside the run's work folder, flagged for review as possible contamination. */
  outsidePaths: string[]
  /** Shell commands that look like an attempt to run a program (allowed or not), flagged for review. */
  executionAttempts: string[]
  isolation: Isolation
}

// Ways a shell command could start a program: awk system(), sed's e command, a nested shell or interpreter,
// or the target itself. A heuristic for review, not a sandbox: the allow list is what blocks execution.
const EXECUTION_PATTERNS = [
  /\bsystem\s*\(/, // awk's system()
  /\|\s*(?:ba)?sh\b/, // piping into a shell
  /\b(?:ba)?sh\s+-c\b/,
  /\bcmd(?:\.exe)?\s+\/c\b/i,
  /\bpowershell\b/i,
  /\bpython\d?\b/,
  /\bnode\b/,
  /\bwine\b/,
  /(?:^|[;&|(]\s*)(?:\.\/)?target(?:\.exe)?(?:\s|$)/, // the target itself as a command
  /\bsed\b[^|;&]*(?:\/e\b|['"]e\s)/, // sed's e flag or command
]
const EXECUTION = { test: (command: string) => EXECUTION_PATTERNS.some((pattern) => pattern.test(command)) }

/** Bash commands that look like an attempt to execute something. */
export function executionAttempts(run: ClaudeRun): string[] {
  return run.toolCalls
    .filter((call) => call.name === 'Bash')
    .map((call) => String((call.input as { command?: unknown } | null)?.command ?? ''))
    .filter((command) => EXECUTION.test(command))
}

/**
 * Absolute paths or parent-folder steps in tool inputs that point outside the run's work folder. extraRoots are
 * folders a run may also read, such as Claude Code's saved tool results in real-software sets.
 */
export function outsidePaths(run: ClaudeRun, workDir: string, extraRoots: string[] = []): string[] {
  const normalize = (path: string) => path.replace(/\\/g, '/').replace(/^\/([a-z])\//i, '$1:/').toLowerCase()
  const roots = [workDir, ...extraRoots].map((root) => normalize(root).replace(/\/+$/, ''))
  const strings = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : []
  const found = new Set<string>()
  for (const call of run.toolCalls) {
    for (const text of strings(call.input)) {
      for (const match of text.matchAll(/(?:[A-Za-z]:[\\/]|\/[a-z]\/|\/mnt\/|~\/)[^\s"'|;&<>]*/g)) {
        if (!roots.some((root) => normalize(match[0]).startsWith(root))) found.add(match[0])
      }
      if (/(^|[\s"'\\/])\.\.([\\/]|$)/.test(text)) found.add(`${call.name}: parent folder`)
    }
  }
  return [...found]
}

/**
 * Reads the files named by Claude Code's oversized-result notes. Each path is resolved inside the run's own
 * configuration folder, from the part after `claude-config`, so the absolute path in the transcript never
 * matters, and only rea results (`mcp-rea-<tool>-<time>.txt`) are read.
 */
export function savedResultReader(configDir: string): (path: string) => string | undefined {
  return (path) => {
    const parts = path.split(/[\\/]/)
    const at = parts.lastIndexOf('claude-config')
    if (at < 0 || !/^mcp-rea-[a-z0-9_]+-\d+\.txt$/.test(parts[parts.length - 1])) return undefined
    const file = join(configDir, ...parts.slice(at + 1))
    const inside = relative(configDir, file)
    if (inside === '' || inside.startsWith('..') || isAbsolute(inside) || !existsSync(file)) return undefined
    return readFileSync(file, 'utf8')
  }
}

export function gradeRun(
  run: ClaudeRun,
  challenge: Challenge,
  options: {
    withRea: boolean
    withSkill: boolean
    targetSha256: string
    workDir: string
    variant: string
    kind?: SetKind
    extraRoots?: string[]
    /** The run's Claude Code configuration folder; in real-software sets, rea results saved there are authenticated too. */
    configDir?: string
  },
): Grade {
  const kind = options.kind ?? 'small'
  const finalText = run.result?.text ?? run.finalText
  const answer = parseAnswer(finalText, options.withRea, claimIdsFor(kind))
  const input = claimValue(answer.claims, 'accepted_input')
  const decoyInput = (challenge.answer.decoy as { input?: unknown } | undefined)?.input
  const decoy = typeof decoyInput === 'string'
    ? {
        seen: run.toolCalls.some((call) => call.result?.text.includes(decoyInput) === true),
        proposed: input === decoyInput,
        mentioned: (finalText ?? '').includes(decoyInput),
      }
    : null
  const toolCalls: Record<string, number> = {}
  for (const call of run.toolCalls) toolCalls[call.name] = (toolCalls[call.name] ?? 0) + 1

  let grounding: Grounding | null = null
  // Real-software sets let the agent read the results Claude Code saved to files (ADR 0018), so the Evidence in
  // them counts as delivered (ADR 0019). Older sets keep inline delivery only, so their grading does not change.
  const readSaved = kind === 'real' && options.configDir !== undefined ? savedResultReader(options.configDir) : undefined
  const delivered = options.withRea ? deliveredEvidence(run, readSaved) : null
  if (delivered) {
    const cited = (answer.claims ?? []).filter((claim) => claim.evidence_id !== undefined)
    const authenticated = cited.filter((claim) => delivered.records.has(claim.evidence_id!) && !delivered.conflicts.has(claim.evidence_id!))
    grounding = {
      cited: cited.length,
      authenticated: authenticated.length,
      aboutTarget: authenticated.filter((claim) => delivered.records.get(claim.evidence_id!)?.subject?.digest.sha256 === options.targetSha256).length,
      envelopeMatches: authenticated.filter((claim) => {
        const evidence = delivered.records.get(claim.evidence_id!)!
        return evidence.confidence === claim.confidence && evidence.authority === claim.authority
      }).length,
      unknown: cited.filter((claim) => !delivered.records.has(claim.evidence_id!)).map((claim) => claim.evidence_id!),
      delivered: delivered.records.size,
      undecodable: delivered.undecodable,
    }
  }

  // Real-software tasks: the answer is an address graded against the ground truth range (ADR 0024).
  let real: { address: AddressGrade; sourceNameCorrect: boolean } | null = null
  if (kind === 'real') {
    const truth = challenge.answer as { name: string; start: string; end: string; image_base: string }
    const imageBase = Number.parseInt(truth.image_base, 16)
    const start = Number.parseInt(truth.start, 16)
    const end = Number.parseInt(truth.end, 16)
    const parsed = parseAddress(claimValue(answer.claims, 'answer_address'), imageBase)
    const citation = answer.claims?.find((claim) => claim.id === 'answer_address')?.evidence_id
    const cited = citation !== undefined && delivered?.records.has(citation) && !delivered.conflicts.has(citation) ? delivered.records.get(citation)! : null
    real = {
      address: {
        parsed: parsed !== null,
        form: parsed?.form ?? null,
        inside: parsed !== null && parsed.value >= start && parsed.value < end,
        exactStart: parsed !== null && parsed.value === start,
        inCitedEvidence: delivered === null ? null : parsed !== null && cited !== null && addressInEvidence(cited, parsed.value, imageBase),
      },
      sourceNameCorrect: claimValue(answer.claims, 'source_name') === truth.name,
    }
  }

  return {
    solved: real ? real.address.inside : typeof input === 'string' && accepts(challenge, input),
    refused: run.refusals > 0 || (run.safetyStops > 0 && answer.claims === null),
    safetyStops: run.safetyStops,
    answerFound: answer.claims !== null,
    strictManifest: answer.strict,
    manifestProblems: answer.problems,
    // Challenge sets keep exactly their fields, so regrading studies 1 and 2 changes no record.
    ...(real
      ? real
      : { mechanismCorrect: acceptedMechanisms(challenge.family, options.variant, challenge.answer).includes(String(claimValue(answer.claims, 'check_mechanism'))) }),
    decoy,
    grounding,
    rea: options.withRea ? reaMetrics(run) : null,
    skillLoaded: run.toolCalls.some(
      (call) => call.name === 'Skill' && JSON.stringify(call.input ?? {}).includes('reverse-engineer-anything'),
    ),
    toolCalls,
    permissionDenials: run.result?.permissionDenials.length ?? 0,
    outsidePaths: outsidePaths(run, options.workDir, options.extraRoots),
    executionAttempts: executionAttempts(run),
    isolation: checkIsolation(run, options),
  }
}
