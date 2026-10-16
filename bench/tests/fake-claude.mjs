#!/usr/bin/env node
// A stand-in for `claude -p --output-format stream-json`, used only by the harness tests. It reports what
// the harness gave it (configuration folder, inherited variables, files in the work folder, MCP servers,
// skill) as a diagnostic event, then answers with FAKE_CLAUDE_ANSWER or fails like an expired login.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
if (args.includes('--version')) {
  console.log('9.9.9 (Claude Code)')
  process.exit(0)
}

const value = (name) => args[args.indexOf(name) + 1]
const emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`)
const prompt = readFileSync(0, 'utf8')
const mcp = JSON.parse(readFileSync(value('--mcp-config'), 'utf8'))
const settings = JSON.parse(readFileSync(value('--settings'), 'utf8'))
const configDir = process.env.CLAUDE_CONFIG_DIR
const skills = existsSync(join(configDir, 'skills', 'reverse-engineer-anything')) ? ['reverse-engineer-anything'] : []

emit({
  type: 'system',
  subtype: 'init',
  session_id: 'fake-session',
  model: value('--model'),
  claude_code_version: '9.9.9',
  tools: value('--tools').split(','),
  mcp_servers: Object.keys(mcp.mcpServers).map((name) => ({ name, status: 'connected' })),
  plugins: [],
  skills,
  permissionMode: value('--permission-mode'),
})
emit({
  type: 'system',
  subtype: 'fake_diagnostics',
  config_dir_files: readdirSync(configDir),
  work_files: readdirSync(process.cwd()),
  inherited: Object.keys(process.env).filter((name) => /^(CLAUDE|ANTHROPIC_|REA_|GHIDRA_|MCP_)/i.test(name)).sort(),
  has_token: Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN),
  prompt_mentions_target: prompt.includes('target.exe'),
  prompt_text: prompt,
  allow: settings.permissions.allow,
  additional_directories: settings.permissions.additionalDirectories ?? [],
  appended_system_prompt: args.includes('--append-system-prompt-file') ? readFileSync(value('--append-system-prompt-file'), 'utf8') : null,
})

if (process.env.FAKE_CLAUDE_MODE === 'auth-error') {
  emit({ type: 'assistant', message: { id: 'synthetic', model: '<synthetic>', content: [{ type: 'text', text: 'Failed to authenticate' }] } })
  emit({ type: 'result', subtype: 'success', is_error: true, terminal_reason: 'api_error', num_turns: 1, result: 'Failed to authenticate', permission_denials: [] })
  process.exit(1)
}

emit({ type: 'assistant', parent_tool_use_id: null, message: { id: 'm1', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'llvm-strings target.exe' } }] } })
emit({ type: 'user', parent_tool_use_id: null, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ACCESS GRANTED', is_error: false }] } })
// FAKE_CLAUDE_CLAIMS replaces the crackme claims, for example with a real-software task's answer.
const answer = JSON.stringify({
  claims: process.env.FAKE_CLAUDE_CLAIMS
    ? JSON.parse(process.env.FAKE_CLAUDE_CLAIMS)
    : [
        { id: 'accepted_input', value: process.env.FAKE_CLAUDE_ANSWER ?? '', confidence: 'observed', authority: 'shipped-artifact' },
        { id: 'check_mechanism', value: 'string_compare', confidence: 'inferred', authority: 'analyst-inference' },
      ],
})
emit({ type: 'assistant', parent_tool_use_id: null, message: { id: 'm2', content: [{ type: 'text', text: answer }] } })
emit({
  type: 'result', subtype: 'success', is_error: false, terminal_reason: 'completed', num_turns: 2, duration_ms: 1200, duration_api_ms: 900,
  total_cost_usd: 0.01, result: answer, permission_denials: [],
  usage: { input_tokens: 5, output_tokens: 50, cache_creation_input_tokens: 100, cache_read_input_tokens: 0 },
})
