// Reads the stream-json output of `claude -p --output-format stream-json --verbose` into one record per
// run. The parser is tolerant: unknown event types and fields are ignored, so a newer Claude Code that
// adds fields does not break old transcripts, and the raw JSONL stays the source of truth.

export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}

export type ToolCall = {
  id: string
  name: string
  input: unknown
  /** Assistant turn (1-based) in which the call was made. */
  turn: number
  result?: { isError: boolean; text: string }
}

export type ClaudeResult = {
  subtype: string
  isError: boolean
  numTurns: number | null
  durationMs: number | null
  durationApiMs: number | null
  totalCostUsd: number | null
  usage: Usage | null
  permissionDenials: Array<{ tool_name?: string; tool_use_id?: string }>
  /** Why the session ended, for example "api_error"; a failed run can still report subtype "success". */
  terminalReason: string | null
  text: string | null
  structuredOutput: unknown
}

export type ClaudeRun = {
  sessionId: string | null
  model: string | null
  /** Models named by the API in the main agent's messages, in order of first use: what actually served the run. */
  servedModels: string[]
  claudeCodeVersion: string | null
  tools: string[]
  mcpServers: Array<{ name: string; status: string }>
  /** Plugins (as name@source, for example "x@builtin") and skills loaded at start, to prove nothing leaked in. */
  plugins: string[]
  skills: string[]
  permissionMode: string | null
  toolCalls: ToolCall[]
  assistantTurns: number
  /** Text blocks of the last assistant message that had any text. */
  finalText: string | null
  result: ClaudeResult | null
  /** Lines that were not valid JSON, kept for diagnosis. */
  invalidLines: number
  /** Messages that Claude Code wrote itself, such as an authentication error. */
  syntheticMessages: number
  /** Model messages that stopped with stop_reason "refusal" (a safety refusal), counted as their own outcome. */
  refusals: number
  /**
   * Responses cut off by the model's safety classifier. Claude Code reports each one as a synthetic user message
   * with refused_message_id, and their total as safety_stops in the result; the larger of the two is kept.
   */
  safetyStops: number
  /** Usage of the main agent's first API request, whose cache writes depend on the order of the runs (ADR 0025). */
  firstRequestUsage: Usage | null
}

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const numberOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const stringOrNull = (value: unknown) => (typeof value === 'string' ? value : null)

function usageOf(value: unknown): Usage | null {
  if (!isObject(value)) return null
  const field = (name: string) => numberOrNull(value[name]) ?? 0
  return {
    input_tokens: field('input_tokens'),
    output_tokens: field('output_tokens'),
    cache_creation_input_tokens: field('cache_creation_input_tokens'),
    cache_read_input_tokens: field('cache_read_input_tokens'),
  }
}

/** Joins the text of a tool_result content, which is either a string or a list of content blocks. */
export function toolResultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => (isObject(block) && block.type === 'text' && typeof block.text === 'string' ? block.text : ''))
    .filter((text) => text.length > 0)
    .join('\n')
}

export function parseStreamJson(lines: Iterable<string>): ClaudeRun {
  const run: ClaudeRun = {
    sessionId: null,
    model: null,
    servedModels: [],
    claudeCodeVersion: null,
    tools: [],
    mcpServers: [],
    plugins: [],
    skills: [],
    permissionMode: null,
    toolCalls: [],
    assistantTurns: 0,
    finalText: null,
    result: null,
    invalidLines: 0,
    syntheticMessages: 0,
    refusals: 0,
    safetyStops: 0,
    firstRequestUsage: null,
  }
  const callsById = new Map<string, ToolCall>()
  let lastMessageId: string | null = null

  for (const line of lines) {
    if (line.trim() === '') continue
    let event: unknown
    try {
      event = JSON.parse(line)
    } catch {
      run.invalidLines++
      continue
    }
    if (!isObject(event)) continue

    if (event.type === 'system' && event.subtype === 'init') {
      run.sessionId = stringOrNull(event.session_id)
      run.model = stringOrNull(event.model)
      run.claudeCodeVersion = stringOrNull(event.claude_code_version)
      run.tools = Array.isArray(event.tools) ? event.tools.filter((tool): tool is string => typeof tool === 'string') : []
      run.plugins = Array.isArray(event.plugins) ? event.plugins.filter(isObject).map((plugin) => String(plugin.source ?? plugin.name)) : []
      run.skills = Array.isArray(event.skills) ? event.skills.filter((skill): skill is string => typeof skill === 'string') : []
      run.permissionMode = stringOrNull(event.permissionMode)
      run.mcpServers = Array.isArray(event.mcp_servers)
        ? event.mcp_servers.filter(isObject).map((server) => ({ name: String(server.name), status: String(server.status) }))
        : []
      continue
    }

    if (event.type === 'assistant' && isObject(event.message)) {
      // Subagent messages carry a parent tool id; the benchmark counts only the main agent.
      if (event.parent_tool_use_id) continue
      const message = event.message
      // Claude Code reports its own errors (authentication, limits) as synthetic messages, not model turns.
      if (message.model === '<synthetic>') {
        run.syntheticMessages++
        continue
      }
      if (typeof message.model === 'string' && !run.servedModels.includes(message.model)) run.servedModels.push(message.model)
      // One API message can arrive split over several events that share its id.
      const messageId = stringOrNull(message.id)
      if (messageId === null || messageId !== lastMessageId) run.assistantTurns++
      lastMessageId = messageId
      if (run.firstRequestUsage === null) run.firstRequestUsage = usageOf(message.usage)
      if (message.stop_reason === 'refusal') run.refusals++
      const content = Array.isArray(message.content) ? message.content.filter(isObject) : []
      const texts = content.filter((block) => block.type === 'text' && typeof block.text === 'string').map((block) => block.text as string)
      if (texts.length > 0) run.finalText = texts.join('\n')
      for (const block of content) {
        if (block.type !== 'tool_use' || typeof block.id !== 'string') continue
        const call: ToolCall = { id: block.id, name: String(block.name), input: block.input, turn: run.assistantTurns }
        callsById.set(call.id, call)
        run.toolCalls.push(call)
      }
      continue
    }

    if (event.type === 'user' && isObject(event.message) && !event.parent_tool_use_id) {
      if (typeof event.refused_message_id === 'string') run.safetyStops++
      const content = Array.isArray(event.message.content) ? event.message.content.filter(isObject) : []
      for (const block of content) {
        if (block.type !== 'tool_result' || typeof block.tool_use_id !== 'string') continue
        const call = callsById.get(block.tool_use_id)
        if (call) call.result = { isError: block.is_error === true, text: toolResultText(block.content) }
      }
      continue
    }

    if (event.type === 'result') {
      run.result = {
        subtype: String(event.subtype),
        isError: event.is_error === true,
        numTurns: numberOrNull(event.num_turns),
        durationMs: numberOrNull(event.duration_ms),
        durationApiMs: numberOrNull(event.duration_api_ms),
        totalCostUsd: numberOrNull(event.total_cost_usd),
        usage: usageOf(event.usage),
        permissionDenials: Array.isArray(event.permission_denials) ? event.permission_denials.filter(isObject) : [],
        terminalReason: stringOrNull(event.terminal_reason),
        text: stringOrNull(event.result),
        structuredOutput: event.structured_output ?? null,
      }
      run.safetyStops = Math.max(run.safetyStops, numberOrNull(event.safety_stops) ?? 0)
    }
  }
  return run
}
