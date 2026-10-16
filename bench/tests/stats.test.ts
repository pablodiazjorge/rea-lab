import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { hodgesLehmann, hodgesLehmannInterval, holm, mcnemarExact, median, wilcoxonSignedRankExact, wilson } from '../stats.ts'

const close = (actual: number, expected: number, digits = 4) =>
  assert.ok(Math.abs(actual - expected) < 10 ** -digits, `${actual} is not close to ${expected}`)

test('wilson matches published values', () => {
  const half = wilson(5, 10)
  close(half.low, 0.2366)
  close(half.high, 0.7634)
  const none = wilson(0, 10)
  assert.equal(none.low, 0)
  close(none.high, 0.2775)
  const all = wilson(10, 10)
  close(all.low, 0.7225)
  close(all.high, 1)
})

test('wilson rejects impossible proportions', () => {
  assert.throws(() => wilson(3, 2), RangeError)
  assert.throws(() => wilson(-1, 2), RangeError)
})

test('mcnemarExact uses only the discordant pairs', () => {
  const pairs: Array<[boolean, boolean]> = [
    ...Array.from({ length: 9 }, (): [boolean, boolean] => [false, true]),
    [true, false],
    ...Array.from({ length: 20 }, (): [boolean, boolean] => [true, true]),
  ]
  const result = mcnemarExact(pairs)
  assert.deepEqual([result.onlyFirst, result.onlySecond, result.discordant], [1, 9, 10])
  close(result.pValue, 22 / 1024, 9)
  close(mcnemarExact(Array.from({ length: 6 }, (): [boolean, boolean] => [false, true])).pValue, 2 / 64, 9)
  assert.equal(mcnemarExact([[true, true], [false, false]]).pValue, 1)
})

test('median handles odd, even and empty lists', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([4, 1, 3, 2]), 2.5)
  assert.ok(Number.isNaN(median([])))
})

test('wilcoxonSignedRankExact matches the paired example in the help page of R wilcox.test', () => {
  // R: wilcox.test(x, y, paired = TRUE) on the depression scores of its help page gives V = 40, p = 0.03906.
  const x = [1.83, 0.5, 1.62, 2.48, 1.68, 1.88, 1.55, 3.06, 1.3]
  const y = [0.878, 0.647, 0.598, 2.05, 1.06, 1.29, 1.06, 3.14, 1.29]
  const result = wilcoxonSignedRankExact(x.map((value, index) => value - y[index]))
  assert.equal(result.n, 9)
  assert.equal(result.wPlus, 40)
  assert.equal(result.wMinus, 5)
  close(result.pValue, 20 / 512, 9)
})

test('wilcoxonSignedRankExact drops zeros, handles ties exactly and is symmetric', () => {
  close(wilcoxonSignedRankExact([1, 2, 3, 4, 5]).pValue, 2 / 32, 9)
  close(wilcoxonSignedRankExact([-1, -2, -3, -4, -5]).pValue, 2 / 32, 9)
  const zeros = wilcoxonSignedRankExact([0, 1, 2])
  assert.equal(zeros.n, 2)
  assert.equal(zeros.zeros, 1)
  close(zeros.pValue, 0.5, 9)
  // Three tied absolute differences share rank 2: W+ = 8 of 10, and 4 of 16 sign patterns reach it.
  const ties = wilcoxonSignedRankExact([1, 1, -1, 2])
  assert.equal(ties.wPlus, 8)
  close(ties.pValue, 0.5, 9)
  assert.equal(wilcoxonSignedRankExact([]).pValue, 1)
})

test('hodgesLehmann is the median of the Walsh averages', () => {
  assert.equal(hodgesLehmann([1, 2, 3]), 2)
  assert.equal(hodgesLehmann([-1, 2, 10]), 3.25)
})

test('holm adjusts in step-down order and keeps the input order', () => {
  assert.deepEqual(holm([0.01, 0.04]), [0.02, 0.04])
  assert.deepEqual(holm([0.04, 0.01]), [0.04, 0.02])
  assert.deepEqual(holm([0.6, 0.7]), [1, 1])
})

test('hodgesLehmannInterval takes the exact order statistics of the Walsh averages', () => {
  // Six differences: P(T <= 0) = 1/64 <= 0.025 < P(T <= 1), so the interval runs from the smallest to the largest average.
  assert.deepEqual(hodgesLehmannInterval([1, 2, 3, 4, 5, 6]), { low: 1, high: 6 })
  // Nine differences: P(T <= 5) = 10/512 <= 0.025 < P(T <= 6) = 14/512, so the 6th smallest and 6th largest averages.
  const differences = [0.952, -0.147, 1.022, 0.43, 0.62, 0.59, 0.49, -0.08, 0.01]
  const averages = differences.flatMap((first, index) => differences.slice(index).map((second) => (first + second) / 2)).sort((a, b) => a - b)
  assert.deepEqual(hodgesLehmannInterval(differences), { low: averages[5], high: averages[averages.length - 6] })
  // Five differences cannot reach 95 %: the smallest tail already has probability 1/32 > 0.025.
  assert.equal(hodgesLehmannInterval([1, 2, 3, 4, 5]), null)
})
