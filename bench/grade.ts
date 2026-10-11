// Deterministic grading of one run (ADR 0018, no LLM judge). The value is scored with the challenge
// oracle; Evidence citations and tool usage are scored with rea's own code (ADR 0019).

import { accepts } from '../challenges/oracle.mjs'
import { claimValue, FAMILY_MECHANISM, parseAnswer } from './answer.ts'
import type { ClaudeRun } from './claude.ts'
import { deliveredEvidence, reaMetrics, type ReaMetrics } from './rea.ts'

export type Challenge = { id: string; family: string; answer: Record<string, unknown> }

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
  if (run.plugins.length > 0) problems.push('plugins_loaded')
  const servers = run.mcpServers.map((server) => server.name)
  if (servers.some((name) => name !== 'rea') || (!options.withRea && servers.length > 0)) problems.push('unexpected_mcp_server')
  if (options.withRea && !run.mcpServers.some((server) => server.name === 'rea' && server.status === 'connected')) problems.push('rea_not_connected')
  if (skillOffered !== options.withSkill) problems.push(options.withSkill ? 'skill_missing' : 'skill_leaked')
  return { ok: problems.length === 0, problems, plugins: run.plugins, mcpServers: servers, skillOffered }
}

export type Grade = {
  /** Primary outcome: the oracle accepts the answer's accepted_input. */
  solved: boolean
  /** The model stopped with a safety refusal at least once; reported apart, and not solved unless it answered. */
  refused: boolean
  answerFound: boolean
  strictManifest: boolean
  manifestProblems: string[]
  mechanismCorrect: boolean
  grounding: Grounding | null
  rea: ReaMetrics | null
  skillLoaded: boolean
  toolCalls: Record<string, number>
  permissionDenials: number
  /** Paths in tool inputs that point outside the run's work folder, flagged for review as possible contamination. */
  outsidePaths: string[]
  isolation: Isolation
}

/** Absolute paths or parent-folder steps in tool inputs that point outside the run's work folder. */
export function outsidePaths(run: ClaudeRun, workDir: string): string[] {
  const normalize = (path: string) => path.replace(/\\/g, '/').replace(/^\/([a-z])\//i, '$1:/').toLowerCase()
  const root = normalize(workDir).replace(/\/+$/, '')
  const strings = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : []
  const found = new Set<string>()
  for (const call of run.toolCalls) {
    for (const text of strings(call.input)) {
      for (const match of text.matchAll(/(?:[A-Za-z]:[\\/]|\/[a-z]\/|\/mnt\/|~\/)[^\s"'|;&<>]*/g)) {
        if (!normalize(match[0]).startsWith(root)) found.add(match[0])
      }
      if (/(^|[\s"'\\/])\.\.([\\/]|$)/.test(text)) found.add(`${call.name}: parent folder`)
    }
  }
  return [...found]
}

export function gradeRun(run: ClaudeRun, challenge: Challenge, options: { withRea: boolean; withSkill: boolean; targetSha256: string; workDir: string }): Grade {
  const answer = parseAnswer(run.result?.text ?? run.finalText, options.withRea)
  const input = claimValue(answer.claims, 'accepted_input')
  const toolCalls: Record<string, number> = {}
  for (const call of run.toolCalls) toolCalls[call.name] = (toolCalls[call.name] ?? 0) + 1

  let grounding: Grounding | null = null
  if (options.withRea) {
    const delivered = deliveredEvidence(run)
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

  return {
    solved: typeof input === 'string' && accepts(challenge, input),
    refused: run.refusals > 0,
    answerFound: answer.claims !== null,
    strictManifest: answer.strict,
    manifestProblems: answer.problems,
    mechanismCorrect: claimValue(answer.claims, 'check_mechanism') === FAMILY_MECHANISM[challenge.family],
    grounding,
    rea: options.withRea ? reaMetrics(run) : null,
    skillLoaded: run.toolCalls.some(
      (call) => call.name === 'Skill' && JSON.stringify(call.input ?? {}).includes('reverse-engineer-anything'),
    ),
    toolCalls,
    permissionDenials: run.result?.permissionDenials.length ?? 0,
    outsidePaths: outsidePaths(run, options.workDir),
    isolation: checkIsolation(run, options),
  }
}
