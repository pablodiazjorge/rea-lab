#!/usr/bin/env node
// Grades a study again from its saved transcripts (events.jsonl) with the current graders, so a grader fix
// never needs the runs to be repeated. Run metadata is kept; every grade field is recomputed, run.json is
// rewritten and results.jsonl is rebuilt from the final attempt of each run.
//
// Usage: node bench/regrade.ts --study <name> [--set public|<built folder>]

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseStreamJson } from './claude.ts'
import { CONDITIONS, toolResultsFolder, type ConditionId } from './conditions.ts'
import { gradeRun } from './grade.ts'
import { benchHome, loadSet } from './run.ts'

function main() {
  const argv = process.argv.slice(2)
  const value = (name: string) => {
    const index = argv.indexOf(name)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const study = value('--study')
  if (!study) throw new Error('--study is required')
  const set = loadSet(value('--set') ?? 'public')
  const studyDir = join(benchHome(), 'runs', study)
  if (!existsSync(studyDir)) throw new Error(`No study folder ${studyDir}`)

  const records: Array<Record<string, unknown>> = []
  let changed = 0
  for (const key of readdirSync(studyDir).sort()) {
    const runDir = join(studyDir, key)
    if (key.includes('.attempt-') || !existsSync(join(runDir, 'run.json'))) continue
    const previous = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'))
    const challenge = set.challenges.find((candidate) => candidate.id === previous.challenge)
    if (!challenge) throw new Error(`${key}: challenge ${previous.challenge} is not in ${set.folder}`)
    const condition = CONDITIONS[previous.condition as ConditionId]
    const transcript = parseStreamJson(readFileSync(join(runDir, 'events.jsonl'), 'utf8').split('\n'))
    const grade = gradeRun(transcript, challenge, {
      withRea: condition.withRea,
      withSkill: condition.withSkill,
      targetSha256: previous.target_sha256,
      workDir: join(runDir, 'work'),
      variant: previous.variant,
      kind: set.kind,
      extraRoots: set.kind === 'real' ? [toolResultsFolder(join(runDir, 'claude-config'))] : [],
      configDir: join(runDir, 'claude-config'),
    })
    const record = { ...previous, ...grade }
    if (JSON.stringify(record) !== JSON.stringify(previous)) {
      changed++
      const differences = Object.keys(grade).filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(record[field]))
      console.log(`${key}: ${differences.join(', ')}`)
    }
    writeFileSync(join(runDir, 'run.json'), `${JSON.stringify(record, null, 2)}\n`)
    records.push(record)
  }
  writeFileSync(join(studyDir, 'results.jsonl'), records.map((record) => JSON.stringify(record)).join('\n') + '\n')
  console.log(`Regraded ${records.length} runs of ${study}; ${changed} changed.`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
