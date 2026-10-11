// The three benchmark conditions (ADR 0018). Only the presence of rea and of its skill changes between
// them; tools, prompt structure, model and limits stay the same.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CLAIM_IDS, MECHANISMS } from './answer.ts'

export type ConditionId = 'A' | 'B' | 'C'

export type Condition = { id: ConditionId; label: string; withRea: boolean; withSkill: boolean }

export const CONDITIONS: Readonly<Record<ConditionId, Condition>> = {
  A: { id: 'A', label: 'command-line tools only', withRea: false, withSkill: false },
  B: { id: 'B', label: 'command-line tools and rea', withRea: true, withSkill: false },
  C: { id: 'C', label: 'command-line tools, rea and its skill', withRea: true, withSkill: true },
}

/** Built-in Claude Code tools offered in every condition (`--tools`). MCP tools are not affected by it. */
export const BUILT_IN_TOOLS = ['Bash', 'Read', 'Grep', 'Glob', 'Skill', 'ToolSearch']

/**
 * Static analysis commands the agent may run, with the text filters agents reach for every day (pilot 3: a
 * denied awk made an agent stop). No interpreter is allowed; awk and sed could still start a program, so
 * the grader flags any command that tries to run something (grade.ts, executionAttempts).
 */
export const ALLOWED_COMMANDS = [
  'llvm-readobj', 'llvm-objdump', 'llvm-strings', 'llvm-nm',
  'grep', 'head', 'tail', 'wc', 'awk', 'sed', 'cut', 'tr', 'sort', 'uniq', 'od',
]

/** rea tools that run targets or touch devices, denied as in the lab's own .claude/settings.json. */
export function deniedReaTools(repoRoot: string): string[] {
  const settings = JSON.parse(readFileSync(join(repoRoot, '.claude', 'settings.json'), 'utf8'))
  return settings.permissions.deny.filter((rule: string) => rule.startsWith('mcp__rea__'))
}

/** The settings.json written into the run's own CLAUDE_CONFIG_DIR (loaded with --setting-sources user). */
export function runSettings(condition: Condition, repoRoot: string) {
  return {
    permissions: {
      allow: [...ALLOWED_COMMANDS.map((command) => `Bash(${command}:*)`), ...(condition.withRea ? ['mcp__rea'] : [])],
      deny: condition.withRea ? deniedReaTools(repoRoot) : [],
      defaultMode: 'dontAsk',
    },
    autoMemoryEnabled: false,
  }
}

/** The MCP configuration for --mcp-config. rea's temporary folders stay inside the run folder. */
export function mcpConfig(condition: Condition, repoRoot: string, runTemp: string) {
  if (!condition.withRea) return { mcpServers: {} }
  return {
    mcpServers: {
      rea: {
        type: 'stdio',
        command: process.execPath,
        args: [join(repoRoot, 'scripts', 'rea-mcp.mjs')],
        env: { TEMP: runTemp, TMP: runTemp },
        timeout: 600000,
      },
    },
  }
}

const CLAIM_LINES = [
  'accepted_input: string, an input that makes the program print ACCESS GRANTED.',
  `check_mechanism: one of ${MECHANISMS.map((mechanism) => `"${mechanism}"`).join(', ')}, describing how the program checks the input.`,
]

/** The task prompt. The ground truth never appears in it. */
export function taskPrompt(condition: Condition): string {
  const tools = condition.withRea
    ? 'The command-line tools llvm-readobj, llvm-objdump, llvm-strings and llvm-nm are on the PATH, and REA is available as MCP tools. Close any REA analysis session you open before finishing.'
    : 'The command-line tools llvm-readobj, llvm-objdump, llvm-strings and llvm-nm are on the PATH.'
  const shape = condition.withRea
    ? '{"claims": [{"id": string, "value": JSON value, "evidence_id": string, "confidence": string, "authority": string}]}'
    : '{"claims": [{"id": string, "value": JSON value, "confidence": string, "authority": string}]}'
  const support = condition.withRea
    ? [
        'Each evidence_id must identify the successful REA result that supports its claim. Copy confidence and authority from that result\'s Evidence envelope.',
      ]
    : [
        'confidence is "observed", "derived" or "inferred"; authority is "shipped-artifact" when the value comes from the file itself, or "analyst-inference" when you worked it out.',
      ]
  return [
    'target.exe in the current folder is a small Windows console program. It reads one line from standard input and prints ACCESS GRANTED or ACCESS DENIED.',
    'Find an input that makes it print ACCESS GRANTED, and identify how it checks the input.',
    `Use static analysis only: do not run the program and do not install anything. ${tools}`,
    '',
    'For this benchmark, return only one JSON object, without Markdown fences or surrounding prose.',
    `The exact shape is ${shape}.`,
    `Include exactly one claim per ID below (${CLAIM_IDS.join(', ')}), without additional fields or claims.`,
    ...support,
    ...CLAIM_LINES,
  ].join('\n')
}
