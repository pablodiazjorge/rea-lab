// The agent's final answer: rea's closed claims manifest (ADR 0019). A strict parse follows rea's rule
// (exactly one JSON object and nothing else); a lenient parse takes the last JSON object with a claims
// list from the text, so a run is not scored as unsolved only because of prose around a correct answer.

export const CLAIM_IDS = ['accepted_input', 'check_mechanism'] as const

export const MECHANISMS = [
  'string_compare',
  'xor_encoded',
  'weighted_checksum',
  'switch_table',
  'state_machine',
  'arithmetic_constraints',
  'substitution_table',
  'function_table',
  'other',
] as const

/**
 * Mechanisms offered for the large set (challenges/large.mjs, study 2). The small set keeps MECHANISMS, so
 * study 1's prompt does not change.
 */
export const LARGE_MECHANISMS = [
  ...MECHANISMS.filter((mechanism) => mechanism !== 'other'),
  'bytecode_vm',
  'class_rules',
  'chained_stages',
  'other',
] as const

export type Mechanism = (typeof LARGE_MECHANISMS)[number]

/** The mechanism that each challenge family implements (see challenges/generate.mjs and challenges/large.mjs). */
export const FAMILY_MECHANISM: Readonly<Record<string, Mechanism>> = {
  compare: 'string_compare',
  xor: 'xor_encoded',
  checksum: 'weighted_checksum',
  table: 'switch_table',
  state: 'state_machine',
  pairs: 'arithmetic_constraints',
  sbox: 'substitution_table',
  indirect: 'function_table',
  vm: 'bytecode_vm',
  cpp: 'class_rules',
  stages: 'chained_stages',
}

// A haystack's accepting check is its inner family, reached through a table of function pointers: both
// descriptions are right.
const HAYSTACK_INNER: Readonly<Record<string, Mechanism>> = { sbox: 'substitution_table', pairs: 'arithmetic_constraints' }

// Families whose only accepted input is one fixed string. An optimising compiler may fold their check
// into a direct comparison with constants (the c02-xor writeup shows the XOR vanishing at -O2), so the
// binary itself then reads as a string comparison.
const SINGLE_ANSWER_FAMILIES = new Set(['compare', 'xor', 'table'])

/** Mechanisms counted as right for a family in a given build variant, such as "x64-O2-strip". */
export function acceptedMechanisms(family: string, variant: string, answer?: Record<string, unknown>): string[] {
  if (family === 'haystack') {
    const inner = HAYSTACK_INNER[String(answer?.inner)]
    return inner === undefined ? ['function_table'] : [inner, 'function_table']
  }
  const own = FAMILY_MECHANISM[family]
  const optimised = !/-O0-/.test(variant)
  return optimised && SINGLE_ANSWER_FAMILIES.has(family) && own !== 'string_compare' ? [own, 'string_compare'] : [own]
}

const CONFIDENCE = new Set(['observed', 'derived', 'inferred'])
const AUTHORITY = new Set(['shipped-artifact', 'controlled-replay', 'historical-reference', 'external-service', 'analyst-inference'])
const EVIDENCE_ID = /^ev_[a-f0-9]{64}$/u

export type Claim = { id: string; value: unknown; evidence_id?: string; confidence?: string; authority?: string }

export type ParsedAnswer = {
  /** The whole final message is one manifest with exactly rea's shape. */
  strict: boolean
  /** Claims from the strict or lenient parse; null when no manifest was found. */
  claims: Claim[] | null
  /** Why the strict parse failed, for the report. */
  problems: string[]
}

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)

function shapeProblems(manifest: unknown, withEvidence: boolean): string[] {
  if (!isObject(manifest)) return ['not_an_object']
  const problems: string[] = []
  if (Object.keys(manifest).some((key) => key !== 'claims')) problems.push('extra_top_level_fields')
  if (!Array.isArray(manifest.claims)) return [...problems, 'claims_not_a_list']
  const expectedKeys = withEvidence ? ['authority', 'confidence', 'evidence_id', 'id', 'value'] : ['authority', 'confidence', 'id', 'value']
  const seen = new Set<string>()
  for (const claim of manifest.claims) {
    if (!isObject(claim)) {
      problems.push('claim_not_an_object')
      continue
    }
    if (Object.keys(claim).sort().join(',') !== expectedKeys.join(',')) problems.push(`claim_fields:${String(claim.id)}`)
    if (typeof claim.id !== 'string' || !(CLAIM_IDS as readonly string[]).includes(claim.id)) problems.push(`unknown_claim:${String(claim.id)}`)
    else if (seen.has(claim.id)) problems.push(`duplicate_claim:${claim.id}`)
    else seen.add(claim.id)
    if (typeof claim.confidence !== 'string' || !CONFIDENCE.has(claim.confidence)) problems.push(`confidence:${String(claim.id)}`)
    if (typeof claim.authority !== 'string' || !AUTHORITY.has(claim.authority)) problems.push(`authority:${String(claim.id)}`)
    if (withEvidence && (typeof claim.evidence_id !== 'string' || !EVIDENCE_ID.test(claim.evidence_id))) problems.push(`evidence_id:${String(claim.id)}`)
  }
  for (const id of CLAIM_IDS) if (!seen.has(id)) problems.push(`claim_missing:${id}`)
  return problems
}

/** Every top-level JSON object in the text, in order, found by matching braces outside strings. */
function jsonObjects(text: string): unknown[] {
  const found: unknown[] = []
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0
    let inString = false
    for (let index = start; index < text.length; index++) {
      const character = text[index]
      if (inString) {
        if (character === '\\') index++
        else if (character === '"') inString = false
      } else if (character === '"') inString = true
      else if (character === '{') depth++
      else if (character === '}' && --depth === 0) {
        try {
          found.push(JSON.parse(text.slice(start, index + 1)))
          start = index
        } catch {
          // not JSON from this brace; try the next one
        }
        break
      }
    }
  }
  return found
}

const toClaims = (manifest: Json): Claim[] =>
  (manifest.claims as unknown[]).filter(isObject).map((claim) => ({
    id: String(claim.id),
    value: claim.value,
    ...(typeof claim.evidence_id === 'string' ? { evidence_id: claim.evidence_id } : {}),
    ...(typeof claim.confidence === 'string' ? { confidence: claim.confidence } : {}),
    ...(typeof claim.authority === 'string' ? { authority: claim.authority } : {}),
  }))

export function parseAnswer(text: string | null, withEvidence: boolean): ParsedAnswer {
  if (text === null || text.trim() === '') return { strict: false, claims: null, problems: ['no_final_message'] }
  let whole: unknown
  let problems: string[]
  try {
    whole = JSON.parse(text.trim())
    problems = shapeProblems(whole, withEvidence)
  } catch {
    problems = ['not_closed_json']
  }
  if (problems.length === 0) return { strict: true, claims: toClaims(whole as Json), problems }
  const candidates = jsonObjects(text).filter((value): value is Json => isObject(value) && Array.isArray(value.claims))
  const last = candidates.at(-1)
  return { strict: false, claims: last ? toClaims(last) : null, problems }
}

export const claimValue = (claims: Claim[] | null, id: string): unknown => claims?.find((claim) => claim.id === id)?.value
