#!/usr/bin/env node
// Runs a scripted rea session over MCP through the project launcher: opens one target, calls the
// tools listed in a plan, saves every response, exports the session's Evidence bundle and closes the
// binary. Useful for writeups and for recording fixtures. Outputs contain local paths, so write them
// under an ignored folder and publish only what scripts/sanitize.mjs has cleaned.
//
// Usage: node scripts/rea-session.mjs <plan.json> <out-folder>
// Plan:  { "target": "targets/x.exe", "steps": [{ "tool": "binary_overview", "args": {} }, ...] }
// An argument written as { "$evidence": "<path to a saved response>" } is replaced by the Evidence
// record in that file, so a step can compare records produced by an earlier session.

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [planPath, outArgument] = process.argv.slice(2)
if (!planPath || !outArgument) {
  console.error('Usage: node scripts/rea-session.mjs <plan.json> <out-folder>')
  process.exit(2)
}
const plan = JSON.parse(readFileSync(resolve(planPath), 'utf8'))
const outDir = resolve(outArgument)
mkdirSync(outDir, { recursive: true })

const server = spawn(process.execPath, [join(ROOT, 'scripts', 'rea-mcp.mjs')], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] })
let stdoutBuffer = ''
let stderrText = ''
const pending = new Map()
server.stderr.on('data', (chunk) => { stderrText += chunk })
server.stdout.on('data', (chunk) => {
  stdoutBuffer += chunk
  let newline
  while ((newline = stdoutBuffer.indexOf('\n')) >= 0) {
    const line = stdoutBuffer.slice(0, newline).trim()
    stdoutBuffer = stdoutBuffer.slice(newline + 1)
    if (!line) continue
    const message = JSON.parse(line)
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
  }
})

let nextId = 1
const request = (method, params) => new Promise((resolveResponse) => {
  const id = nextId++
  pending.set(id, resolveResponse)
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
})

function resolveArguments(value) {
  if (Array.isArray(value)) return value.map(resolveArguments)
  if (value && typeof value === 'object') {
    if (typeof value.$evidence === 'string') {
      const saved = JSON.parse(readFileSync(resolve(ROOT, value.$evidence), 'utf8'))
      return saved?.result ?? saved
    }
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, resolveArguments(inner)]))
  }
  return value
}

const summary = []
async function call(index, tool, rawArgs) {
  const args = resolveArguments(rawArgs)
  const started = Date.now()
  const response = await request('tools/call', { name: tool, arguments: args })
  const result = response.result ?? {}
  const text = result.content?.find((item) => item.type === 'text')?.text
  let payload = result.structuredContent ?? null
  if (payload === null && text) {
    try { payload = JSON.parse(text) } catch { payload = { text } }
  }
  const ok = !(result.isError || response.error)
  const record = payload?.result ?? payload
  const entry = { step: index, tool, args: rawArgs, ok, seconds: (Date.now() - started) / 1000, evidence_id: record?.evidence_id ?? null }
  summary.push(entry)
  writeFileSync(join(outDir, `${String(index).padStart(2, '0')}-${tool}.json`), `${JSON.stringify(payload ?? response.error ?? null, null, 2)}\n`)
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(index).padStart(2, '0')} ${tool} (${entry.seconds.toFixed(1)} s)${entry.evidence_id ? ` ${entry.evidence_id.slice(0, 15)}...` : ''}`)
  return { ok, payload }
}

const guard = setTimeout(() => {
  console.error(`Session timed out. Last stderr:\n${stderrText.slice(-1500)}`)
  server.kill()
  process.exit(1)
}, 20 * 60 * 1000)
guard.unref()

await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'rea-lab-session', version: '1' } })
server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)

let step = 0
const opened = await call(step++, 'open_binary', { path: resolve(ROOT, plan.target) })
if (opened.ok) {
  for (const { tool, args = {} } of plan.steps) await call(step++, tool, args)
  await call(step++, 'export_evidence_bundle', { path: join(outDir, 'bundle.json'), overwrite: true })
  await call(step++, 'close_binary', {})
}
writeFileSync(join(outDir, 'session.json'), `${JSON.stringify({ target: plan.target, steps: summary }, null, 2)}\n`)
server.stdin.end()
await new Promise((resolveExit) => {
  server.on('exit', resolveExit)
  setTimeout(() => { server.kill(); resolveExit() }, 15000).unref()
})
const failed = summary.filter((entry) => !entry.ok).length
console.log(`${summary.length} calls, ${failed} failed. Responses in ${outDir}`)
process.exit(failed > 0 ? 1 : 0)
