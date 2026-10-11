// Reuses rea's own evaluation code (ADR 0019): parseEvidence authenticates the Evidence that reached the
// agent, and evaluateCodexEvents computes rea's tool-usage metrics. Both come from the pinned rea 6.4.0
// package. evaluateCodexEvents reads Codex events, so this module turns a Claude Code run into them.

import { parseEvidence } from 'rea-agents/dist/domain/evidence.js'
import { evaluateCodexEvents } from 'rea-agents/dist/evaluation/CodexAgentEval.js'
import type { ClaudeRun } from './claude.ts'

export const REA_TOOL_PREFIX = 'mcp__rea__'

export type Evidence = {
  evidence_id: string
  operation: string
  confidence: string
  authority: string
  subject: { name?: string; local_path?: string; digest: { sha256: string } } | null
  normalized_result: unknown
}

export type DeliveredEvidence = {
  records: Map<string, Evidence>
  conflicts: Set<string>
  /** Successful rea results whose text was not one closed JSON value (for example, truncated). */
  undecodable: number
}

/** rea's tool-usage metrics, with rea's field names. */
export type ReaMetrics = {
  naturalUse: boolean
  firstTool: string | null
  correctFirstTool: boolean
  repeatedCallCount: number
  inputValidationFailureCount: number
  requiredToolSubsequenceMet: boolean
  reaCallCount: number
  reaErrorCount: number
}

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)

// Claude Code may append a reminder block to tool results; it is not part of what rea returned.
const REMINDER_SUFFIX = /\s*<system-reminder>[\s\S]*<\/system-reminder>\s*$/u

/** Parses a tool result text as one closed JSON value, without prose around it, or returns undefined. */
export function closedJson(text: string): unknown {
  try {
    return JSON.parse(text.replace(REMINDER_SUFFIX, ''))
  } catch {
    return undefined
  }
}

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (!isObject(value)) return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
}
const sameJson = (left: unknown, right: unknown) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right))

const reaCalls = (run: ClaudeRun) => run.toolCalls.filter((call) => call.name.startsWith(REA_TOOL_PREFIX))

/** Authenticates every Evidence that a successful rea call delivered to the agent, indexed by evidence_id. */
export function deliveredEvidence(run: ClaudeRun): DeliveredEvidence {
  const delivered: DeliveredEvidence = { records: new Map(), conflicts: new Set(), undecodable: 0 }
  for (const call of reaCalls(run)) {
    if (!call.result || call.result.isError) continue
    const value = closedJson(call.result.text)
    if (value === undefined) {
      delivered.undecodable++
      continue
    }
    let evidence: Evidence
    try {
      evidence = parseEvidence(value) as Evidence
    } catch {
      continue // session tools such as open_binary return {result}, which is not Evidence
    }
    if (evidence.operation !== call.name.slice(REA_TOOL_PREFIX.length)) continue
    const previous = delivered.records.get(evidence.evidence_id)
    if (previous && !sameJson(previous, evidence)) delivered.conflicts.add(evidence.evidence_id)
    else delivered.records.set(evidence.evidence_id, evidence)
  }
  return delivered
}

/** Turns a Claude Code run into the Codex events that rea's evaluator reads. Only rea calls are included. */
export function toCodexEvents(run: ClaudeRun): unknown[] {
  const events: unknown[] = []
  for (const call of reaCalls(run)) {
    const text = call.result?.text ?? ''
    const parsed = call.result ? closedJson(text) : undefined
    const failed = !call.result || call.result.isError
    events.push({
      type: 'item.completed',
      item: {
        type: 'mcp_tool_call',
        id: call.id,
        server: 'rea',
        tool: call.name.slice(REA_TOOL_PREFIX.length),
        arguments: call.input ?? {},
        status: failed ? 'failed' : 'completed',
        result: { content: [{ type: 'text', text }], structured_content: isObject(parsed) ? parsed : null, isError: failed },
      },
    })
  }
  if (run.finalText !== null) events.push({ type: 'item.completed', item: { type: 'agent_message', text: run.finalText } })
  const usage = run.result?.usage
  if (usage) {
    // Codex counts cached tokens inside input_tokens; Anthropic reports them apart.
    events.push({
      type: 'turn.completed',
      usage: {
        input_tokens: usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens,
        cached_input_tokens: usage.cache_read_input_tokens,
        output_tokens: usage.output_tokens,
      },
    })
  }
  return events
}

/** rea's tool-usage metrics for a native target: the first call should open it and the session should be closed. */
export function reaMetrics(run: ClaudeRun): ReaMetrics {
  const metrics = evaluateCodexEvents(toCodexEvents(run), 'open_binary', {
    requiredToolSubsequence: ['open_binary', 'close_binary'],
  })
  return {
    naturalUse: metrics.naturalUse,
    firstTool: metrics.firstTool,
    correctFirstTool: metrics.correctFirstTool,
    repeatedCallCount: metrics.repeatedCallCount,
    inputValidationFailureCount: metrics.inputValidationFailureCount,
    requiredToolSubsequenceMet: metrics.requiredToolSubsequenceMet,
    reaCallCount: metrics.reaCalls.length,
    reaErrorCount: metrics.reaCalls.filter((call: { error: boolean }) => call.error).length,
  }
}
