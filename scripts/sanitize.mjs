#!/usr/bin/env node
// Prepares rea Evidence for publication (ADR 0014). It replaces the display-only subject fields
// (`subject.name`, `subject.local_path`), which are not part of the evidence_id hash, then asks rea
// itself to authenticate the result, and fails if any local user path is left anywhere in the JSON.
// Accepts a single Evidence record or a bundle with `records`.
//
// Usage: node scripts/sanitize.mjs <input.json> <output.json>

import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REA_DOMAIN = join(ROOT, 'node_modules', 'rea-agents', 'dist', 'domain')
const { parseEvidence } = await import(pathToFileURL(join(REA_DOMAIN, 'evidence.js')).href)
const { parseEvidenceBundle } = await import(pathToFileURL(join(REA_DOMAIN, 'evidenceBundle.js')).href)

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('Usage: node scripts/sanitize.mjs <input.json> <output.json>')
  process.exit(2)
}

const BOM = String.fromCharCode(0xfeff)
const raw = readFileSync(resolve(input), 'utf8')
const data = JSON.parse(raw.startsWith(BOM) ? raw.slice(1) : raw)

// Windows and POSIX user paths, with either separator.
const USER_PATH = /[A-Za-z]:[\\/]+Users[\\/]+[^\\/"]+|\/(?:home|Users)\/[^/"]+/
const displayName = (value) => basename(String(value).replaceAll('\\', '/'))

function sanitizeRecord(record) {
  if (record.subject && typeof record.subject === 'object') {
    if (typeof record.subject.name === 'string') record.subject.name = displayName(record.subject.name)
    if (typeof record.subject.local_path === 'string') {
      record.subject.local_path = `<target>/${displayName(record.subject.local_path)}`
    }
  }
  return record
}

const isBundle = Array.isArray(data.records)
if (isBundle) data.records.forEach(sanitizeRecord)
else sanitizeRecord(data)

// rea rejects any record whose semantic content no longer matches its evidence_id.
try {
  if (isBundle) parseEvidenceBundle(data)
  else parseEvidence(data)
} catch (error) {
  const detail = (error?.issues?.[0]?.message ?? error?.message ?? String(error)).split('\n')[0]
  console.error(`rea did not authenticate the Evidence, so it was not written: ${detail}`)
  process.exit(1)
}

const text = `${JSON.stringify(data, null, 2)}\n`
const leak = USER_PATH.exec(text)
if (leak) {
  console.error(`A local user path is still present after sanitising: ${leak[0].replace(/[^\\/]+$/, '<user>')}`)
  process.exit(1)
}

writeFileSync(resolve(output), text)
const count = isBundle ? data.records.length : 1
console.log(`Sanitised ${count} Evidence record(s); rea authenticated the result; no local user path left.`)
