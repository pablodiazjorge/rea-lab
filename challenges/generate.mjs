#!/usr/bin/env node
// Generates the lab's practice challenges from a seed (ADR 0011). Each challenge is a small C program
// that reads one line from stdin and prints ACCESS GRANTED or ACCESS DENIED. answers.json holds the
// ground truth that writeups and, later, the benchmark graders use.
//
// Usage: node challenges/generate.mjs [--seed <integer>] [--out <folder>]
//   defaults: the public seed and build/challenges/src

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const GENERATOR_VERSION = 2
export const PUBLIC_SEED = 20261011

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Small, well-known seeded PRNG (mulberry32): the same seed always yields the same challenges.
function createRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WORDS = [
  'amber', 'birch', 'cedar', 'delta', 'ember', 'fjord', 'grove', 'harbor',
  'indigo', 'juniper', 'kestrel', 'lagoon', 'meadow', 'nimbus', 'orchid', 'pebble',
  'quartz', 'raven', 'saffron', 'tundra', 'umber', 'violet', 'willow', 'zephyr',
]

const pick = (random, list) => list[Math.floor(random() * list.length)]
const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1))
const passphrase = (random) => `${pick(random, WORDS)}-${pick(random, WORDS)}-${integer(random, 10, 99)}`
const hex = (value) => `0x${value.toString(16).padStart(2, '0')}`

const MAIN = `int main(void) {
  char line[128];
  if (!fgets(line, sizeof line, stdin)) return 1;
  line[strcspn(line, "\\r\\n")] = 0;
  puts(check(line) ? "ACCESS GRANTED" : "ACCESS DENIED");
  return 0;
}
`

const HEADER = `#include <stdio.h>
#include <string.h>
`

const FAMILIES = {
  // The expected input is stored as a plain string literal.
  compare(random) {
    const secret = passphrase(random)
    const source = `${HEADER}
static int check(const char *input) {
  return strcmp(input, "${secret}") == 0;
}

${MAIN}`
    return {
      description: 'The expected input is compared with a plain string literal.',
      answer: { input: secret },
      source,
    }
  },

  // The expected input is stored XOR-encoded with a one-byte key and compared byte by byte.
  xor(random) {
    const secret = passphrase(random)
    const key = integer(random, 0x21, 0x7e)
    const encoded = [...secret].map((character) => character.charCodeAt(0) ^ key)
    const rows = []
    for (let index = 0; index < encoded.length; index += 8) {
      rows.push(`  ${encoded.slice(index, index + 8).map(hex).join(', ')},`)
    }
    const source = `${HEADER}
static const unsigned char encoded[] = {
${rows.join('\n')}
};

static int check(const char *input) {
  size_t length = sizeof encoded;
  if (strlen(input) != length) return 0;
  for (size_t index = 0; index < length; index++) {
    if ((unsigned char)(input[index] ^ ${hex(key)}) != encoded[index]) return 0;
  }
  return 1;
}

${MAIN}`
    return {
      description: 'The expected input is stored XOR-encoded with a one-byte key.',
      answer: { input: secret, key: hex(key) },
      source,
    }
  },

  // Any lowercase input of a fixed length whose position-weighted sum matches a target is accepted.
  checksum(random) {
    const length = integer(random, 8, 12)
    const modulus = pick(random, [97, 101, 103, 107, 109, 113])
    const example = Array.from({ length }, () => String.fromCharCode(integer(random, 97, 122))).join('')
    const target = [...example].reduce((sum, character, index) => sum + (index + 1) * character.charCodeAt(0), 0) % modulus
    const source = `${HEADER}
static int check(const char *input) {
  size_t length = strlen(input);
  unsigned long sum = 0;
  if (length != ${length}) return 0;
  for (size_t index = 0; index < length; index++) {
    if (input[index] < 'a' || input[index] > 'z') return 0;
    sum += (unsigned long)(index + 1) * (unsigned char)input[index];
  }
  return sum % ${modulus} == ${target};
}

${MAIN}`
    return {
      description: 'Accepts lowercase inputs of a fixed length whose position-weighted character sum hits a target modulo a prime.',
      answer: { rule: { length, alphabet: 'a-z', weight: 'position starting at 1', modulus, target }, example },
      source,
    }
  },

  // Each character of the expected input comes from a switch over its position, shifted by a constant.
  // Compilers lower the switch to a jump table or a lookup table of integers, not to a string.
  table(random) {
    const secret = passphrase(random)
    const offset = integer(random, 1, 9)
    const cases = [...secret].map((character, index) => `    case ${index}: return ${character.charCodeAt(0) + offset};`)
    const source = `${HEADER}
static int expected(size_t index) {
  switch (index) {
${cases.join('\n')}
    default: return -1;
  }
}

static int check(const char *input) {
  size_t length = strlen(input);
  if (length != ${secret.length}) return 0;
  for (size_t index = 0; index < length; index++) {
    if ((unsigned char)input[index] + ${offset} != expected(index)) return 0;
  }
  return 1;
}

${MAIN}`
    return {
      description: 'Each character of the expected input is returned by a switch over its position, shifted by a constant.',
      answer: { input: secret, offset },
      source,
    }
  },

  // A state machine walks the input one character at a time. Every state has one character that moves
  // forward and one that falls back to an earlier state; anything else rejects. Several inputs reach
  // the accepting state, so the answer records the whole machine and one accepted example.
  state(random) {
    const example = passphrase(random)
    const ids = []
    while (ids.length <= example.length) {
      const id = integer(random, 100, 999)
      if (!ids.includes(id)) ids.push(id)
    }
    const states = [...example].map((character, index) => {
      let back = character
      while (back === character) back = pick(random, [...'abcdefghijklmnopqrstuvwxyz-0123456789'])
      return {
        id: ids[index],
        forward: { character, next: ids[index + 1] },
        back: { character: back, next: ids[integer(random, 0, index)] },
      }
    })
    const accept = ids[example.length]
    const cases = states.map(({ id, forward, back }) =>
      `      case ${id}: state = c == '${forward.character}' ? ${forward.next} : c == '${back.character}' ? ${back.next} : 0; break;`)
    const source = `${HEADER}
static int check(const char *input) {
  int state = ${ids[0]};
  for (size_t index = 0; input[index] != 0; index++) {
    int c = (unsigned char)input[index];
    switch (state) {
${cases.join('\n')}
      default: return 0;
    }
    if (state == 0) return 0;
  }
  return state == ${accept};
}

${MAIN}`
    return {
      description: 'A state machine over the input characters; each state moves forward on one character and falls back on another.',
      answer: { machine: { start: ids[0], accept, states }, example },
      source,
    }
  },
}

export function generate(seed) {
  const random = createRandom(seed)
  return Object.entries(FAMILIES).map(([family, build], index) => {
    const id = `c${String(index + 1).padStart(2, '0')}-${family}`
    const challenge = build(random)
    return { id, family, ...challenge }
  })
}

function parseArguments(argv) {
  const options = { seed: PUBLIC_SEED, out: join(ROOT, 'build', 'challenges', 'src') }
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--seed') options.seed = Number.parseInt(argv[++index], 10)
    else if (argv[index] === '--out') options.out = resolve(argv[++index])
  }
  if (!Number.isSafeInteger(options.seed)) throw new Error('--seed must be an integer')
  return options
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { seed, out } = parseArguments(process.argv.slice(2))
  mkdirSync(out, { recursive: true })
  const challenges = generate(seed)
  for (const challenge of challenges) writeFileSync(join(out, `${challenge.id}.c`), challenge.source)
  const answers = {
    generator_version: GENERATOR_VERSION,
    seed,
    challenges: challenges.map(({ id, family, description, answer }) => ({ id, family, description, answer })),
  }
  writeFileSync(join(out, 'answers.json'), `${JSON.stringify(answers, null, 2)}\n`)
  console.log(`Generated ${challenges.length} challenges with seed ${seed} in ${out}`)
}
