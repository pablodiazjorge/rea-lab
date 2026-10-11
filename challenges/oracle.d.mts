// Types for oracle.mjs, so the TypeScript benchmark can import it.

export type ChallengeAnswer = { id: string; family: string; answer: Record<string, unknown> }

/** Returns true when the challenge accepts `input`, decided from its recorded answer without running anything. */
export function accepts(challenge: ChallengeAnswer, input: unknown): boolean

/** One input that the challenge accepts, taken from its recorded answer. */
export function acceptedInput(challenge: ChallengeAnswer): string
