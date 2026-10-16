import { strict as assert } from 'node:assert'
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { skillBody, skillDigest, skillFolder, skillSystemPrompt } from '../skill.ts'

// The skills study 5 injects (ADR 0025): the text a run receives, the digest the study locks, and checks that
// the improved skill is a generic revision of rea's own and says nothing about the study's programs.

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const official = skillFolder(ROOT, 'official')
const improved = skillFolder(ROOT, 'improved')

test('the skill body drops the YAML front matter and nothing else', () => {
  assert.equal(skillBody('---\nname: x\nmetadata:\n  version: "1"\n---\n\n# Title\n\nText\n'), '# Title\n\nText\n')
  assert.equal(skillBody('# No front matter\n'), '# No front matter\n')
})

test('the system prompt starts with one fixed sentence naming the references folder, then the body', () => {
  const prompt = skillSystemPrompt(official, 'C:\\run\\claude-config\\injected-skill\\references')
  const [first, blank, ...rest] = prompt.split('\n')
  assert.match(first, /^The reverse-engineer-anything skill for the REA tools in this session follows\. Its links to references\/ name files in C:\\run\\claude-config\\injected-skill\\references; read one with the Read tool when a step needs it\.$/)
  assert.equal(blank, '')
  assert.equal(rest.join('\n'), skillBody(readFileSync(join(official, 'SKILL.md'), 'utf8')))
  assert.doesNotMatch(prompt, /^---$/m)
  // The same sentence for both skills, so only the body differs.
  assert.equal(skillSystemPrompt(improved, 'X').split('\n')[0], skillSystemPrompt(official, 'X').split('\n')[0])
})

test('the skill digest is stable and changes with any byte or file name', () => {
  const folder = mkdtempSync(join(tmpdir(), 'rea-lab-skill-'))
  cpSync(official, folder, { recursive: true })
  const first = skillDigest(folder)
  assert.deepEqual(skillDigest(folder), first)
  assert.equal(first.files, readdirSync(join(folder, 'references')).length + 1)
  writeFileSync(join(folder, 'references', 'runtime-observation.md'), `${readFileSync(join(folder, 'references', 'runtime-observation.md'), 'utf8')} `)
  assert.notEqual(skillDigest(folder).sha256, first.sha256)
  assert.equal(skillDigest(folder).body_bytes, first.body_bytes)
})

test('the improved skill keeps rea\'s references, licence and text, and only adds to SKILL.md', () => {
  for (const name of readdirSync(join(official, 'references'))) {
    assert.equal(readFileSync(join(improved, 'references', name), 'utf8'), readFileSync(join(official, 'references', name), 'utf8'), name)
  }
  assert.match(readFileSync(join(improved, 'LICENSE'), 'utf8'), /^MIT License\n\nCopyright \(c\) 2026 morluto/)
  assert.match(readFileSync(join(improved, 'PROVENANCE.md'), 'utf8'), /rea-agents@6\.4\.0/)
  // Every line of rea's SKILL.md body, in order, is still there.
  const added = skillBody(readFileSync(join(improved, 'SKILL.md'), 'utf8')).split('\n')
  let index = 0
  for (const line of skillBody(readFileSync(join(official, 'SKILL.md'), 'utf8')).split('\n')) {
    while (index < added.length && added[index] !== line) index++
    assert.ok(index < added.length, `missing or reordered line: ${line}`)
    index++
  }
})

test('the improved skill names no program, target or address of the studies', () => {
  const text = readdirSync(improved, { recursive: true }).map(String).filter((name) => name.endsWith('.md')).map((name) => readFileSync(join(improved, name), 'utf8')).join('\n')
  const programs = ['sgiemu', 'c5xtools', 'moppe', 'flint', 'zlib', 'lua', 'md4c', 'bzip2', 'civetweb', 'expat', 'vm8']
  for (const program of programs) assert.doesNotMatch(SKILL_TEXT(), new RegExp(`\\b${program}\\b`, 'i'), program)
  // Targets of every published task file and study 3's ground truth.
  const names = new Set<string>()
  for (const file of readdirSync(join(ROOT, 'challenges')).filter((name) => /^real-tasks-.*\.json$/.test(name))) {
    for (const task of JSON.parse(readFileSync(join(ROOT, 'challenges', file), 'utf8')).tasks) for (const value of Object.values(task.target ?? {})) if (typeof value === 'string' && /^[A-Za-z_]\w{3,}$/.test(value)) names.add(value)
  }
  for (const task of JSON.parse(readFileSync(join(ROOT, 'bench', 'results', 'study-3', 'answers.json'), 'utf8')).tasks) names.add(task.answer.name)
  assert.ok(names.size > 20)
  for (const name of names) assert.doesNotMatch(SKILL_TEXT(), new RegExp(`\\b${name}\\b`), name)
  assert.doesNotMatch(SKILL_TEXT(), /0x14[0-9a-f]{7}/i)
  assert.ok(text.length > 0)
})

/** The text the comparison adds: the improved SKILL.md lines that rea's own does not have. */
function SKILL_TEXT(): string {
  const original = new Set(readFileSync(join(official, 'SKILL.md'), 'utf8').split('\n'))
  return readFileSync(join(improved, 'SKILL.md'), 'utf8').split('\n').filter((line) => !original.has(line)).join('\n')
}
