// Decides, without running anything, whether a challenge accepts an input. It re-implements each
// family's check from the recorded answer, so the benchmark graders can score answers on any system.
// verify-answers.mjs confirms on Windows that the oracle agrees with the real binaries.

const WEIGHTED_SUM = (input) =>
  [...input].reduce((sum, character, index) => sum + (index + 1) * character.charCodeAt(0), 0)

const FAMILIES = {
  compare: (answer, input) => input === answer.input,
  xor: (answer, input) => input === answer.input,
  table: (answer, input) => input === answer.input,
  pairs: (answer, input) => input === answer.input,
  sbox: (answer, input) => input === answer.input,
  indirect: (answer, input) => input === answer.input,
  // Large set (large.mjs): every family accepts exactly one input.
  haystack: (answer, input) => input === answer.input,
  vm: (answer, input) => input === answer.input,
  cpp: (answer, input) => input === answer.input,
  stages: (answer, input) => input === answer.input,
  checksum: ({ rule }, input) =>
    input.length === rule.length && /^[a-z]*$/.test(input) && WEIGHTED_SUM(input) % rule.modulus === rule.target,
  state: ({ machine }, input) => {
    const byId = new Map(machine.states.map((state) => [state.id, state]))
    let current = machine.start
    for (const character of input) {
      const state = byId.get(current)
      if (!state) return false
      if (character === state.forward.character) current = state.forward.next
      else if (character === state.back.character) current = state.back.next
      else return false
    }
    return current === machine.accept
  },
}

/** Returns true when the challenge described by `challenge` (an entry of answers.json) accepts `input`. */
export function accepts(challenge, input) {
  const family = FAMILIES[challenge.family]
  if (!family) throw new Error(`No oracle for family ${challenge.family}`)
  return typeof input === 'string' && family(challenge.answer, input)
}

/** One input that the challenge accepts, taken from its recorded answer. */
export const acceptedInput = (challenge) => challenge.answer.input ?? challenge.answer.example
