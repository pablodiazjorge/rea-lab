#!/usr/bin/env node
// Repository checks for rea-lab. `npm run check` must pass before a change is done.
//   1. Private and local folders stay ignored by git.
//   2. No personal data (local user paths, the user name, emails) and nothing shaped like a secret.
//   3. Bilingual documents keep the same heading structure and link to each other.
//   4. Relative links in Markdown and HTML point to files that will be published.
//   5. Spanish text follows the style rules: no em dash, no middle dot as a separator.
//   6. Code and configuration are written in English.
//   7. CLAUDE.md only imports AGENTS.md.
//
// Files are the ones git would publish (tracked plus untracked, minus ignored). Outside a git
// repository the script falls back to walking the folder with the simple rules in .gitignore.

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { userInfo } from 'node:os'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MUST_BE_IGNORED = ['_docs-internal', 'tools', 'targets', 'repos', 'node_modules', 'build']
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.zip', '.exe', '.dll', '.so', '.o', '.obj', '.pdf'])
const CODE_EXT = new Set(['.mjs', '.cjs', '.js', '.ts', '.tsx', '.ps1', '.psm1', '.json', '.yml', '.yaml', '.toml', '.sh'])

// Non-ASCII characters are built from code points so this file stays pure ASCII and passes its own checks.
const BOM = String.fromCharCode(0xfeff)
const EM_DASH = String.fromCharCode(0x2014)
const MIDDLE_DOT = String.fromCharCode(0xb7)
// Accented vowels, u with diaeresis, n with tilde and inverted punctuation, lower and upper case.
const SPANISH_CODE_POINTS = [0xe1, 0xe9, 0xed, 0xf3, 0xfa, 0xfc, 0xf1, 0xc1, 0xc9, 0xcd, 0xd3, 0xda, 0xdc, 0xd1, 0xbf, 0xa1]

const failures = []
const warnings = []
const fail = (text) => failures.push(text)
const warn = (text) => warnings.push(text)
const toPosix = (path) => path.split(sep).join('/')
const rel = (path) => toPosix(relative(ROOT, path))

const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
const inGitRepo = existsSync(join(ROOT, '.git')) && git(['rev-parse', '--is-inside-work-tree']).status === 0

// ---------------------------------------------------------------------------
// Files that would be published

function gitignorePatterns() {
  const path = join(ROOT, '.gitignore')
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
}

function matchesSimplePattern(relPath, pattern) {
  const segments = relPath.split('/')
  if (pattern.endsWith('/')) return segments.slice(0, -1).includes(pattern.slice(0, -1))
  if (pattern.startsWith('*.')) return relPath.endsWith(pattern.slice(1))
  return segments.includes(pattern)
}

function* walk(folder, patterns) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === '.git') continue
    const path = join(folder, entry.name)
    const relPath = rel(path) + (entry.isDirectory() ? '/x' : '')
    if (patterns.some((pattern) => matchesSimplePattern(relPath, pattern))) continue
    if (entry.isDirectory()) yield* walk(path, patterns)
    else yield rel(path)
  }
}

function publishedFiles() {
  if (inGitRepo) {
    const result = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    if (result.status === 0) return result.stdout.split('\0').filter(Boolean)
    warn(`git ls-files failed, walking the folder instead: ${result.stderr.trim()}`)
  }
  return [...walk(ROOT, gitignorePatterns())]
}

const files = publishedFiles().sort()
const fileSet = new Set(files)
const isPublished = (relPath) =>
  fileSet.has(relPath) || files.some((file) => file.startsWith(relPath.replace(/\/$/, '') + '/'))

function readText(relPath) {
  if (BINARY_EXT.has(extname(relPath).toLowerCase())) return null
  const buffer = readFileSync(join(ROOT, relPath))
  if (buffer.subarray(0, 8000).includes(0)) return null
  const text = buffer.toString('utf8')
  return text.startsWith(BOM) ? text.slice(1) : text
}

const texts = new Map()
for (const file of files) {
  const text = readText(file)
  if (text !== null) texts.set(file, text)
}

const eachLine = (text, visit) => text.split(/\r?\n/).forEach((line, index) => visit(line, index + 1))

// ---------------------------------------------------------------------------
// 1. Private and local folders stay ignored

const patterns = gitignorePatterns()
for (const folder of MUST_BE_IGNORED) {
  const ignored = inGitRepo
    ? git(['check-ignore', '-q', '--no-index', `${folder}/probe`]).status === 0
    : patterns.includes(`${folder}/`) || patterns.includes(folder)
  if (!ignored) fail(`.gitignore: ${folder}/ must be ignored`)
  if (files.some((file) => file.startsWith(`${folder}/`))) fail(`${folder}/: contains files that would be published`)
}

// ---------------------------------------------------------------------------
// 2. Personal data and secrets

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const userName = userInfo().username
const PERSONAL = [
  ['a local user path', /\b[A-Za-z]:[\\/]+Users[\\/]+(?!<|Public\b|Default\b)[^\\/\s"'`<>]+/i],
  ['a local user path', /(?:^|[\s"'`(])\/(?:[a-z]\/)?Users\/(?!<|Public\b|Shared\b)[^/\s"'`<>]+/],
  ['a home path', /(?:^|[\s"'`(])\/home\/(?!<|runner\b)[^/\s"'`<>]+/],
  // The last domain label starts with a letter, so a package version such as name@6.4.0 is not an address.
  ['an email address', /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z][\w-]*\b/],
]
// CI runners use generic account names (such as "runner") that also appear in ordinary prose.
if (!process.env.CI && userName && userName.length >= 3) {
  PERSONAL.push(['the local user name', new RegExp(`\\b${escapeRegExp(userName)}\\b`, 'i')])
}
const ALLOWED_EMAIL = /noreply|no-reply|example\.(com|org)/i

const SECRETS = [
  ['a GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['an Anthropic key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['an API key', /\bsk-[A-Za-z0-9]{20,}/],
  ['an AWS key', /\bAKIA[0-9A-Z]{16}\b/],
  ['a Slack token', /\bxox[abpr]-[A-Za-z0-9-]{10,}/],
  ['a private key', new RegExp(['-----BEGIN', '[A-Z ]*PRIVATE KEY-----'].join(' '))],
]

for (const [file, text] of texts) {
  eachLine(text, (line, number) => {
    for (const [kind, pattern] of PERSONAL) {
      const match = pattern.exec(line)
      if (!match) continue
      if (kind === 'an email address' && ALLOWED_EMAIL.test(match[0])) continue
      fail(`${file}:${number}: contains ${kind}`)
    }
    for (const [kind, pattern] of SECRETS) {
      if (pattern.test(line)) fail(`${file}:${number}: looks like ${kind}`)
    }
  })
}

// ---------------------------------------------------------------------------
// 3. Bilingual parity

function stripFences(text) {
  let inFence = false
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence
        return ''
      }
      return inFence ? '' : line
    })
    .join('\n')
}

function headingLevels(text) {
  const levels = []
  for (const line of stripFences(text).split('\n')) {
    const markdown = /^(#{1,6})\s/.exec(line)
    if (markdown) levels.push(markdown[1].length)
    const html = /<h([1-6])[\s>]/i.exec(line)
    if (html) levels.push(Number(html[1]))
  }
  return levels
}

const baseName = (file) => file.split('/').pop()

for (const spanish of files.filter((file) => file.endsWith('.es.md'))) {
  const english = spanish.replace(/\.es\.md$/, '.md')
  if (!texts.has(english)) {
    fail(`${spanish}: has no English counterpart (${english})`)
    continue
  }
  const englishLevels = headingLevels(texts.get(english))
  const spanishLevels = headingLevels(texts.get(spanish))
  if (englishLevels.join(',') !== spanishLevels.join(',')) {
    const at = englishLevels.findIndex((level, index) => level !== spanishLevels[index])
    const position = at === -1 ? Math.min(englishLevels.length, spanishLevels.length) + 1 : at + 1
    fail(`${spanish}: heading structure differs from ${english} (from heading ${position}: ${englishLevels.length} vs ${spanishLevels.length} headings)`)
  }
  if (!texts.get(english).includes(baseName(spanish))) fail(`${english}: does not link to ${baseName(spanish)}`)
  if (!texts.get(spanish).includes(baseName(english))) fail(`${spanish}: does not link to ${baseName(english)}`)
}
for (const english of files.filter((file) => /(^|\/)README\.md$/.test(file) && !file.startsWith('docs/adr/'))) {
  if (!fileSet.has(english.replace(/\.md$/, '.es.md'))) warn(`${english}: has no Spanish version`)
}

// ---------------------------------------------------------------------------
// 4. Relative links

const LINKS = [/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, /\b(?:href|src)="([^"]+)"/g]
const isExternal = (target) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)

for (const file of files.filter((name) => name.endsWith('.md'))) {
  const text = stripFences(texts.get(file) ?? '')
  for (const pattern of LINKS) {
    for (const match of text.matchAll(pattern)) {
      const target = match[1]
      if (isExternal(target)) continue
      const path = decodeURI(target.split('#')[0].split('?')[0])
      if (!path) continue
      const resolved = toPosix(relative(ROOT, resolve(ROOT, dirname(file), path)))
      if (!existsSync(join(ROOT, resolved))) fail(`${file}: broken link to ${target}`)
      else if (!isPublished(resolved)) fail(`${file}: links to ${target}, which is not published`)
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Spanish style

for (const file of files.filter((name) => name.endsWith('.es.md'))) {
  eachLine(texts.get(file) ?? '', (line, number) => {
    if (line.includes(EM_DASH)) fail(`${file}:${number}: em dash (use a comma, a colon or parentheses)`)
    if (line.includes(MIDDLE_DOT)) fail(`${file}:${number}: middle dot as a separator (use a spaced hyphen)`)
  })
}

// ---------------------------------------------------------------------------
// 6. Code and configuration in English

const SPANISH_CHARS = new RegExp(`[${SPANISH_CODE_POINTS.map((code) => String.fromCharCode(code)).join('')}]`)
for (const file of files.filter((name) => CODE_EXT.has(extname(name).toLowerCase()) && baseName(name) !== 'package-lock.json')) {
  eachLine(texts.get(file) ?? '', (line, number) => {
    if (SPANISH_CHARS.test(line)) fail(`${file}:${number}: code and configuration must be in English`)
  })
}

// ---------------------------------------------------------------------------
// 7. CLAUDE.md only imports AGENTS.md

for (const required of ['README.md', 'README.es.md', 'AGENTS.md', 'CLAUDE.md', 'LICENSE']) {
  if (!fileSet.has(required)) fail(`${required}: missing`)
}
if (texts.has('CLAUDE.md') && texts.get('CLAUDE.md').trim() !== '@AGENTS.md') {
  fail('CLAUDE.md: must only contain @AGENTS.md (instructions live in AGENTS.md)')
}

// ---------------------------------------------------------------------------

for (const text of warnings) console.log(`⚠ ${text}`)
for (const text of failures) console.log(`✘ ${text}`)
if (failures.length > 0) {
  console.log(`\n${failures.length} problem(s) found in ${files.length} file(s). Fix them before committing.`)
  process.exit(1)
}
console.log(`✔ All checks passed: ${files.length} file(s)${inGitRepo ? '' : ' (no git repository yet, used .gitignore rules)'}.`)
