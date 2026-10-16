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

export type Wilcoxon = { n: number; zeros: number; wPlus: number; wMinus: number; pValue: number }

/**
 * Exact two-sided Wilcoxon signed-rank test on paired differences (second minus first). Differences of zero
 * are dropped (Wilcoxon's method) and tied absolute differences share their average rank. The null
 * distribution is counted over doubled ranks, which are integers even with ties, so the p-value is exact.
 */
export function wilcoxonSignedRankExact(differences: readonly number[]): Wilcoxon {
  // Costs are sums of floating-point prices: treat differences below a nano-dollar as zero, and round before ranking.
  const nonZero = differences.filter((difference) => Math.abs(difference) >= 1e-9)
  const zeros = differences.length - nonZero.length
  const n = nonZero.length
  if (n === 0) return { n, zeros, wPlus: 0, wMinus: 0, pValue: 1 }
  const order = nonZero.map((difference, index) => ({ size: Number(Math.abs(difference).toFixed(9)), index })).sort((left, right) => left.size - right.size)
  const doubled = new Array<number>(n)
  for (let start = 0; start < n; ) {
    let end = start
    while (end + 1 < n && order[end + 1].size === order[start].size) end++
    // The average of ranks start+1 .. end+1, doubled.
    for (let position = start; position <= end; position++) doubled[order[position].index] = start + end + 2
    start = end + 1
  }
  const total = doubled.reduce((sum, rank) => sum + rank, 0)
  const positive = nonZero.reduce((sum, difference, index) => sum + (difference > 0 ? doubled[index] : 0), 0)
  let counts = new Float64Array(total + 1)
  counts[0] = 1
  for (const rank of doubled) {
    const next = counts.slice()
    for (let sum = 0; sum + rank <= total; sum++) if (counts[sum] !== 0) next[sum + rank] += counts[sum]
    counts = next
  }
  const assignments = 2 ** n
  let lower = 0
  let upper = 0
  for (let sum = 0; sum <= total; sum++) {
    if (sum <= positive) lower += counts[sum]
    if (sum >= positive) upper += counts[sum]
  }
  return { n, zeros, wPlus: positive / 2, wMinus: (total - positive) / 2, pValue: Math.min(1, (2 * Math.min(lower, upper)) / assignments) }
}

/** Hodges-Lehmann estimate of the paired shift: the median of all Walsh averages (d_i + d_j) / 2, i <= j. */
export function hodgesLehmann(differences: readonly number[]): number {
  const averages: number[] = []
  for (let first = 0; first < differences.length; first++) {
    for (let second = first; second < differences.length; second++) averages.push((differences[first] + differences[second]) / 2)
  }
  return median(averages)
}

/** Holm's step-down adjustment of a family of p-values, returned in their original order. */
export function holm(pValues: readonly number[]): number[] {
  const order = pValues.map((pValue, index) => ({ pValue, index })).sort((left, right) => left.pValue - right.pValue)
  const adjusted = new Array<number>(pValues.length)
  let running = 0
  order.forEach(({ pValue, index }, rank) => {
    running = Math.max(running, Math.min(1, (pValues.length - rank) * pValue))
    adjusted[index] = running
  })
  return adjusted
}

/**
 * Exact confidence interval for the Hodges-Lehmann shift of paired differences, from the null distribution
 * of the signed-rank statistic without ties: the k-th smallest and largest Walsh averages, where k is the
 * largest count with P(T <= k - 1) <= alpha / 2. Null when there are too few differences for that level.
 */
export function hodgesLehmannInterval(differences: readonly number[], confidence = 0.95): { low: number; high: number } | null {
  const n = differences.length
  const total = (n * (n + 1)) / 2
  let counts = new Float64Array(total + 1)
  counts[0] = 1
  for (let rank = 1; rank <= n; rank++) {
    const next = counts.slice()
    for (let sum = 0; sum + rank <= total; sum++) if (counts[sum] !== 0) next[sum + rank] += counts[sum]
    counts = next
  }
  const assignments = 2 ** n
  const alpha = 1 - confidence
  let cumulative = 0
  let k = 0
  for (let sum = 0; sum <= total; sum++) {
    cumulative += counts[sum] / assignments
    if (cumulative > alpha / 2) break
    k = sum + 1
  }
  if (k === 0) return null
  const averages: number[] = []
  for (let first = 0; first < n; first++) for (let second = first; second < n; second++) averages.push((differences[first] + differences[second]) / 2)
  averages.sort((left, right) => left - right)
  return { low: averages[k - 1], high: averages[total - k] }
}
