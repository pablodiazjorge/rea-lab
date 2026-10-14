// The three benchmark conditions (ADR 0018). Only the presence of rea and of its skill changes between
// them; tools, prompt structure, model and limits stay the same.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LARGE_MECHANISMS, MECHANISMS, claimIdsFor } from './answer.ts'

/** Which challenge set a run uses: the small set of study 1, the large set of study 2 or the real-software tasks of study 3. */
export type SetKind = 'small' | 'large' | 'real'

/** A real-software task as the prompt needs it (ADR 0024): the question, never the answer. */
export type TaskQuestion = { question?: unknown }

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

/**
 * Large set only (study 2, pilot 1): scratch files inside the run's work folder. Claude Code treats a shell
 * redirection as a file write, so without this rule `llvm-objdump ... > dis.txt` is denied, and a large binary
 * is hard to read without keeping its disassembly in a file.
 */
export const SCRATCH_WRITES = ['Edit(./**)', 'Write(./**)']

/**
 * Real-software sets only (ADR 0018, amended for study 3): Claude Code saves a tool result too large to
 * return inline under the configuration folder's projects folder and hands the agent that path. In study 2
 * reading it was denied, which cut the agent off from its own results; older sets keep that rule.
 */
export const toolResultsFolder = (configDir: string) => join(configDir, 'projects')

/** The settings.json written into the run's own CLAUDE_CONFIG_DIR (loaded with --setting-sources user). */
export function runSettings(condition: Condition, repoRoot: string, kind: SetKind = 'small', configDir?: string) {
  const readable = kind === 'real' && configDir !== undefined ? [toolResultsFolder(configDir)] : []
  return {
    permissions: {
      allow: [
        ...ALLOWED_COMMANDS.map((command) => `Bash(${command}:*)`),
        ...(kind === 'small' ? [] : SCRATCH_WRITES),
        ...(condition.withRea ? ['mcp__rea'] : []),
      ],
      deny: condition.withRea ? deniedReaTools(repoRoot) : [],
      ...(readable.length > 0 ? { additionalDirectories: readable } : {}),
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

const claimLines = (kind: SetKind) =>
  kind === 'real'
    ? [
        'answer_address: string, the virtual address where the function or table starts, image base included, written in hexadecimal with a 0x prefix.',
        "source_name: string, your best guess of its name in the program's source code, or \"unknown\".",
      ]
    : [
        'accepted_input: string, an input that makes the program print ACCESS GRANTED.',
        `check_mechanism: one of ${(kind === 'large' ? LARGE_MECHANISMS : MECHANISMS).map((mechanism) => `"${mechanism}"`).join(', ')}, describing how the program checks the input.`,
      ]

/**
 * The task prompt. The ground truth never appears in it. For the small set it is exactly study 1's prompt;
 * the large set drops "small", offers the larger list of mechanisms, allows scratch files (pilot 1) and
 * says that nobody answers during the run (pilot 3: three runs ended with a question instead of an answer).
 * A real-software task asks its own question about an open-source program, which may not be a console
 * program, and keeps the scratch-file and unattended lines of the large set.
 */
export function taskPrompt(condition: Condition, kind: SetKind = 'small', task?: TaskQuestion): string {
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
  if (kind === 'real' && (typeof task?.question !== 'string' || task.question.trim() === '')) throw new Error('a real-software task needs its question')
  const opening =
    kind === 'real'
      ? ['target.exe in the current folder is a stripped 64-bit Windows build of an open-source program.', String(task!.question)]
      : [
          `target.exe in the current folder is a ${kind === 'large' ? '' : 'small '}Windows console program. It reads one line from standard input and prints ACCESS GRANTED or ACCESS DENIED.`,
          'Find an input that makes it print ACCESS GRANTED, and identify how it checks the input.',
        ]
  return [
    ...opening,
    `Use static analysis only: do not run the program and do not install anything. ${tools}`,
    ...(kind !== 'small'
      ? [
          'You may keep scratch files, such as a saved disassembly, in the current folder; nothing outside it can be written.',
          'Nobody will answer questions or grant more permissions during this run: when you cannot go further, return your best answer in the shape below.',
        ]
      : []),
    '',
    'For this benchmark, return only one JSON object, without Markdown fences or surrounding prose.',
    `The exact shape is ${shape}.`,
    `Include exactly one claim per ID below (${claimIdsFor(kind).join(', ')}), without additional fields or claims.`,
    ...support,
    ...claimLines(kind),
  ].join('\n')
}
