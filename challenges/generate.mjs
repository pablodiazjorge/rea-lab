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

export const GENERATOR_VERSION = 3
export const PUBLIC_SEED = 20261011

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Small, well-known seeded PRNG (mulberry32): the same seed always yields the same challenges.
export function createRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const WORDS = [
  'amber', 'birch', 'cedar', 'delta', 'ember', 'fjord', 'grove', 'harbor',
  'indigo', 'juniper', 'kestrel', 'lagoon', 'meadow', 'nimbus', 'orchid', 'pebble',
  'quartz', 'raven', 'saffron', 'tundra', 'umber', 'violet', 'willow', 'zephyr',
]

export const pick = (random, list) => list[Math.floor(random() * list.length)]
export const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1))
export const passphrase = (random) => `${pick(random, WORDS)}-${pick(random, WORDS)}-${integer(random, 10, 99)}`
export const hex = (value) => `0x${value.toString(16).padStart(2, '0')}`
export const rows = (values, perRow, format = String) => {
  const lines = []
  for (let index = 0; index < values.length; index += perRow) {
    lines.push(`  ${values.slice(index, index + perRow).map(format).join(', ')},`)
  }
  return lines.join('\n')
}
export const shuffled = (random, values) => {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[copy[index], copy[other]] = [copy[other], copy[index]]
  }
  return copy
}

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

  // Lowercase input bound by arithmetic: the first character times a factor hits an anchor, and every
  // pair of neighbouring characters adds up to a recorded sum. Only one input satisfies all of it.
  pairs(random) {
    const length = integer(random, 9, 12)
    const codes = Array.from({ length }, () => integer(random, 97, 122))
    const secret = String.fromCharCode(...codes)
    const sums = codes.slice(0, -1).map((code, index) => code + codes[index + 1])
    const factor = integer(random, 3, 9)
    const anchor = codes[0] * factor
    const source = `${HEADER}
static const int sums[] = {
${rows(sums, 8)}
};

static int check(const char *input) {
  size_t length = strlen(input);
  if (length != ${length}) return 0;
  if ((unsigned char)input[0] * ${factor} != ${anchor}) return 0;
  for (size_t index = 0; index + 1 < length; index++) {
    if ((unsigned char)input[index] + (unsigned char)input[index + 1] != sums[index]) return 0;
  }
  return 1;
}

${MAIN}`
    return {
      description: 'Lowercase input whose first character times a factor hits an anchor and whose neighbouring characters add up to recorded sums.',
      answer: { input: secret, rule: { length, factor, anchor, adjacent_sums: sums } },
      source,
    }
  },

  // Every character goes through a 256-byte substitution table and must land on a recorded byte, so the
  // expected input only appears after inverting the table. Both tables are writable globals: with const
  // tables, -O2 folds every lookup into a comparison with the plain character and the table disappears.
  sbox(random) {
    const secret = passphrase(random)
    const sbox = shuffled(random, Array.from({ length: 256 }, (_, index) => index))
    const expected = [...secret].map((character) => sbox[character.charCodeAt(0)])
    const source = `${HEADER}
unsigned char sbox[256] = {
${rows(sbox, 16, hex)}
};

unsigned char expected[] = {
${rows(expected, 8, hex)}
};

static int check(const char *input) {
  size_t length = sizeof expected;
  if (strlen(input) != length) return 0;
  for (size_t index = 0; index < length; index++) {
    if (sbox[(unsigned char)input[index]] != expected[index]) return 0;
  }
  return 1;
}

${MAIN}`
    return {
      description: 'Each character passes through a 256-byte substitution table and must match a recorded byte.',
      answer: { input: secret, expected: expected.map(hex) },
      source,
    }
  },

  // The check is split into four functions reached through a writable table of function pointers, each
  // testing one slice of the input with its own operation (add, xor or subtract-from a key). The expected
  // bytes are writable globals, so -O2 cannot fold them into the plain characters. The family is not
  // called "dispatch": Windows treats 32-bit programs whose name contains "patch" as installers.
  indirect(random) {
    const secret = passphrase(random)
    const size = Math.ceil(secret.length / 4)
    const operations = ['add', 'xor', 'sub']
    const parts = [0, 1, 2, 3].map((part) => {
      const offset = part * size
      const slice = secret.slice(offset, offset + size)
      const operation = pick(random, operations)
      const key = integer(random, 1, 250)
      const apply = (code) =>
        operation === 'add' ? (code + key) & 0xff : operation === 'xor' ? code ^ key : (key - code) & 0xff
      return { offset, length: slice.length, operation, key, expected: [...slice].map((character) => apply(character.charCodeAt(0))) }
    })
    const expression = { add: (key) => `((unsigned char)part[index] + ${key}) & 0xff`, xor: (key) => `(unsigned char)part[index] ^ ${key}`, sub: (key) => `(${key} - (unsigned char)part[index]) & 0xff` }
    const functions = parts.map(({ length, operation, key, expected }, index) => `unsigned char expected${index}[] = { ${expected.map(hex).join(', ')} };

static int part${index}(const char *part) {
  for (size_t index = 0; index < ${length}; index++) {
    if ((${expression[operation](key)}) != expected${index}[index]) return 0;
  }
  return 1;
}`)
    const source = `${HEADER}
${functions.join('\n\n')}

int (*parts[4])(const char *) = { part0, part1, part2, part3 };

static int check(const char *input) {
  static const size_t offsets[4] = { ${parts.map(({ offset }) => offset).join(', ')} };
  if (strlen(input) != ${secret.length}) return 0;
  for (size_t index = 0; index < 4; index++) {
    if (!parts[index](input + offsets[index])) return 0;
  }
  return 1;
}

${MAIN}`
    return {
      description: 'The check is split across four functions called through a table of function pointers, each with its own operation on one slice.',
      answer: { input: secret, parts: parts.map(({ offset, length, operation, key }) => ({ offset, length, operation, key })) },
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
