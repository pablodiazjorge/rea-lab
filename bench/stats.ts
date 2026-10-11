// Statistics for the benchmark report, kept small and dependency-free so anyone can audit them.

export type Interval = { estimate: number; low: number; high: number }

/** Wilson score interval for a binomial proportion (default 95 %). Well behaved with small n and 0 or n successes. */
export function wilson(successes: number, trials: number, z = 1.959963984540054): Interval {
  if (!Number.isInteger(successes) || !Number.isInteger(trials) || successes < 0 || trials < 0 || successes > trials) {
    throw new RangeError(`invalid proportion ${successes}/${trials}`)
  }
  if (trials === 0) return { estimate: Number.NaN, low: 0, high: 1 }
  const p = successes / trials
  const z2 = z * z
  const denominator = 1 + z2 / trials
  const centre = (p + z2 / (2 * trials)) / denominator
  const margin = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denominator
  return { estimate: p, low: Math.max(0, centre - margin), high: Math.min(1, centre + margin) }
}

/** log(n choose k), exact enough for the sample sizes of a benchmark. */
function logChoose(n: number, k: number): number {
  let total = 0
  for (let index = 1; index <= k; index++) total += Math.log(n - k + index) - Math.log(index)
  return total
}

export type McNemar = { onlyFirst: number; onlySecond: number; discordant: number; pValue: number }

/**
 * Exact McNemar test for paired binary outcomes: a two-sided binomial test on the discordant pairs.
 * `pairs` holds [first condition solved, second condition solved] for the same challenge and repetition.
 */
export function mcnemarExact(pairs: ReadonlyArray<readonly [boolean, boolean]>): McNemar {
  const onlyFirst = pairs.filter(([first, second]) => first && !second).length
  const onlySecond = pairs.filter(([first, second]) => !first && second).length
  const discordant = onlyFirst + onlySecond
  if (discordant === 0) return { onlyFirst, onlySecond, discordant, pValue: 1 }
  const smaller = Math.min(onlyFirst, onlySecond)
  let tail = 0
  for (let k = 0; k <= smaller; k++) tail += Math.exp(logChoose(discordant, k) - discordant * Math.LN2)
  return { onlyFirst, onlySecond, discordant, pValue: Math.min(1, 2 * tail) }
}

/** Median of a list of numbers, or NaN when it is empty. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
