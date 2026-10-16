#!/usr/bin/env node
// Post-hoc context measures of a study, read from its saved transcripts (events.jsonl and the files where
// Claude Code saved oversized tool results). Exploratory: none of this was preregistered. Prints JSON with no
// local paths, so the output can be published beside a study's results.
//
// Usage: node bench/context.ts --study <name>

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { benchHome } from './run.ts'

type Usage = { input_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number }
const inputOf = (usage: Usage) => (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)
const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted.length === 0 ? null : sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
}

type RunContext = {
  condition: string
  /** Distinct API requests (assistant message ids) and the input of the first one. */
  requests: number
  firstRequestInput: number
  totalInput: number
  toolCalls: Map<string, number>
  /** rea results Claude Code saved to a file, by tool, with their sizes in bytes. */
  saved: Array<{ tool: string; bytes: number }>
  /** rea tools that Claude Code's init event listed for the run. */
  advertisedReaTools: number
}

function readRun(runDir: string, condition: string): RunContext {
  const usageById = new Map<string, Usage>()
  const toolUseIds = new Map<string, string>()
  let advertisedReaTools = 0
  for (const line of readFileSync(join(runDir, 'events.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue
    let event: { type?: string; subtype?: string; tools?: unknown; message?: { id?: string; usage?: Usage; content?: unknown } }
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event.type === 'system' && event.subtype === 'init' && Array.isArray(event.tools))
      advertisedReaTools = event.tools.filter((tool) => typeof tool === 'string' && tool.startsWith('mcp__rea__')).length
    if (event.type !== 'assistant' || !event.message?.id) continue
    if (event.message.usage && !usageById.has(event.message.id)) usageById.set(event.message.id, event.message.usage)
    for (const block of Array.isArray(event.message.content) ? event.message.content : [])
      if (block?.type === 'tool_use' && typeof block.id === 'string') toolUseIds.set(block.id, block.name)
  }
  const usages = [...usageById.values()]
  const toolCalls = new Map<string, number>()
  for (const name of toolUseIds.values()) toolCalls.set(name, (toolCalls.get(name) ?? 0) + 1)
  const saved: RunContext['saved'] = []
  const projects = join(runDir, 'claude-config', 'projects')
  const walk = (folder: string) => {
    if (!existsSync(folder)) return
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name)
      if (entry.isDirectory()) walk(path)
      else {
        const match = /^mcp-rea-([a-z0-9_]+)-\d+\.txt$/.exec(entry.name)
        if (match && folder.endsWith('tool-results')) saved.push({ tool: match[1], bytes: statSync(path).size })
      }
    }
  }
  walk(projects)
  return {
    condition,
    requests: usages.length,
    firstRequestInput: usages.length ? inputOf(usages[0]) : 0,
    totalInput: usages.reduce((total, usage) => total + inputOf(usage), 0),
    toolCalls,
    saved,
    advertisedReaTools,
  }
}

function main() {
  const argv = process.argv.slice(2)
  const study = argv[argv.indexOf('--study') + 1]
  if (!argv.includes('--study') || !study) throw new Error('--study is required')
  const studyDir = join(benchHome(), 'runs', study)
  const runs: RunContext[] = []
  for (const key of readdirSync(studyDir).sort()) {
    const match = /-([A-C])-r\d+$/.exec(key)
    if (!match || !existsSync(join(studyDir, key, 'events.jsonl'))) continue
    runs.push(readRun(join(studyDir, key), match[1]))
  }
  const byCondition = (condition: string) => runs.filter((run) => run.condition === condition)
  const firstInput = Object.fromEntries(['A', 'B', 'C'].map((condition) => [condition, median(byCondition(condition).map((run) => run.firstRequestInput))]))
  const withRea = byCondition('B')
  const overhead = firstInput.B !== null && firstInput.A !== null ? firstInput.B - firstInput.A : null
  const shares = overhead === null ? [] : withRea.map((run) => (run.requests * overhead) / run.totalInput)
  const tools = new Map<string, { calls: number; runs: number; saved: number[] }>()
  for (const run of withRea) {
    for (const [name, count] of run.toolCalls) {
      if (!name.startsWith('mcp__rea__')) continue
      const tool = tools.get(name.slice(10)) ?? { calls: 0, runs: 0, saved: [] }
      tool.calls += count
      tool.runs += 1
      tools.set(name.slice(10), tool)
    }
    for (const file of run.saved) (tools.get(file.tool) ?? tools.set(file.tool, { calls: 0, runs: 0, saved: [] }).get(file.tool)!).saved.push(file.bytes)
  }
  const usedTool = (name: string) => withRea.filter((run) => (run.toolCalls.get(name) ?? 0) > 0).length
  console.log(JSON.stringify({
    study,
    note: 'Post hoc and exploratory; measured from the saved transcripts, which are not published (ADR 0014).',
    runsWithRea: withRea.length,
    advertisedReaTools: median(withRea.map((run) => run.advertisedReaTools)),
    savedResults: {
      runs: withRea.filter((run) => run.saved.length > 0).length,
      results: withRea.reduce((total, run) => total + run.saved.length, 0),
      byTool: Object.fromEntries([...tools].filter(([, tool]) => tool.saved.length > 0 || tool.calls > 0).sort(([left], [right]) => left.localeCompare(right)).map(([name, tool]) => [name, {
        calls: tool.calls,
        saved: tool.saved.length,
        bytes: tool.saved.length ? { min: Math.min(...tool.saved), median: median(tool.saved), max: Math.max(...tool.saved) } : null,
      }])),
    },
    pagedRoutesUsed: { analyze_function: usedTool('mcp__rea__analyze_function'), inspect_analysis_view: usedTool('mcp__rea__inspect_analysis_view') },
    toolSearch: { runs: usedTool('ToolSearch'), medianCalls: median(withRea.map((run) => run.toolCalls.get('ToolSearch') ?? 0)) },
    firstRequestInputMedian: firstInput,
    perRequestOverhead: overhead,
    overheadShareOfInput: shares.length ? { median: median(shares), min: Math.min(...shares), max: Math.max(...shares) } : null,
    totalInputMedianPerMessage: Object.fromEntries(['A', 'B'].map((condition) => [condition, median(byCondition(condition).map((run) => run.totalInput))])),
    medianRequests: Object.fromEntries(['A', 'B'].map((condition) => [condition, median(byCondition(condition).map((run) => run.requests))])),
  }, null, 2))
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
