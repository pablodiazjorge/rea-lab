#!/usr/bin/env node
// Starts rea's MCP server over stdio for this repository (ADR 0004). Tool folders come from
// tools.json and are made absolute from this file's location, because rea rejects relative
// GHIDRA_INSTALL_DIR and JAVA_HOME values. rea runs in this same process, so closing the server
// never leaves an orphaned Node or Java process behind. stdout belongs to the MCP protocol:
// diagnostics go to stderr only.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function fail(message) {
  process.stderr.write(`rea-mcp: ${message}\n`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(join(root, 'tools.json'), 'utf8'))
const toolFolder = (id) => {
  const tool = manifest.tools.find((candidate) => candidate.id === id)
  if (!tool) fail(`tools.json has no "${id}" entry`)
  return join(root, 'tools', tool.dir)
}

const environment = {
  GHIDRA_INSTALL_DIR: toolFolder('ghidra'),
  JAVA_HOME: toolFolder('jdk'),
}
for (const [name, folder] of Object.entries(environment)) {
  if (!existsSync(folder)) fail(`${name} folder is missing (${folder}). Run "node scripts/setup.mjs" in ${root}.`)
}

const entry = join(root, 'node_modules', 'rea-agents', 'scripts', 'rea.mjs')
if (!existsSync(entry)) fail(`rea is not installed. Run "npm ci" in ${root}.`)

Object.assign(process.env, environment)
process.env.REA_ANALYSIS_PROVIDER ??= 'ghidra'

// rea's dispatcher reads process.argv when it loads: a single "mcp" argument selects the server.
process.argv = [process.argv[0], entry, 'mcp']
await import(pathToFileURL(entry).href)
