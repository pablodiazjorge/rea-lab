import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { mcnemarExact, median, wilson } from '../stats.ts'

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
