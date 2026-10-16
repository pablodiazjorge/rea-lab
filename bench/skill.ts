// Skills injected into the system prompt (ADR 0025): where each one comes from, its digest for the study
// lock, and the text a run receives. The body of SKILL.md goes into the system prompt; its references/
// files are copied into the run's configuration folder, outside Claude Code's skills folder, so the
// client never offers the skill a second time and the agent reads the references on demand.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export type InjectedSkill = 'official' | 'improved'

/** The skill's folder: rea's own, from the pinned package, or the lab's improved copy. */
export const skillFolder = (repoRoot: string, skill: InjectedSkill) =>
  skill === 'official'
    ? join(repoRoot, 'node_modules', 'rea-agents', 'skills', 'reverse-engineer-anything')
    : join(repoRoot, 'bench', 'skills', 'reverse-engineer-anything-improved')

/** Where a run gets the injected skill's files, inside its configuration folder but not under skills/. */
export const injectedSkillFolder = (configDir: string) => join(configDir, 'injected-skill')

function files(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

/** SKILL.md without its YAML front matter. */
export function skillBody(text: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text)
  return (match ? text.slice(match[0].length) : text).replace(/^\s+/, '')
}

/**
 * The digest the study locks: SHA-256 over every file's forward-slash relative path and bytes, in path order,
 * and the size of the text the system prompt receives, so a change to the skill cannot pass unnoticed.
 */
export function skillDigest(folder: string): { sha256: string; files: number; body_bytes: number } {
  const hash = createHash('sha256')
  const list = files(folder).map((path) => ({ path, name: relative(folder, path).replace(/\\/g, '/') })).sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
  for (const file of list) {
    hash.update(`${file.name}\0`)
    hash.update(readFileSync(file.path))
    hash.update('\0')
  }
  const body = skillBody(readFileSync(join(folder, 'SKILL.md'), 'utf8'))
  return { sha256: hash.digest('hex'), files: list.length, body_bytes: Buffer.byteLength(body) }
}

/** The text appended to the system prompt: one fixed sentence, the same for every skill, then the skill's body. */
export function skillSystemPrompt(folder: string, referencesFolder: string): string {
  const body = skillBody(readFileSync(join(folder, 'SKILL.md'), 'utf8'))
  return [
    `The reverse-engineer-anything skill for the REA tools in this session follows. Its links to references/ name files in ${referencesFolder}; read one with the Read tool when a step needs it.`,
    '',
    body,
  ].join('\n')
}
