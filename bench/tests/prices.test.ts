import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { baseModel, deepseekCost, isPeak } from '../prices.ts'

const usage = { input_tokens: 1_000_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 2_000_000, output_tokens: 1_000_000 }

test('peak hours are 01-04 and 06-10 UTC on weekdays only', () => {
  assert.equal(isPeak(new Date('2026-10-16T01:00:00Z')), true) // Friday
  assert.equal(isPeak(new Date('2026-10-16T04:00:00Z')), false)
  assert.equal(isPeak(new Date('2026-10-16T09:59:59Z')), true)
  assert.equal(isPeak(new Date('2026-10-16T12:00:00Z')), false)
  assert.equal(isPeak(new Date('2026-10-17T07:00:00Z')), false) // Saturday
})

test('DeepSeek cost prices cache reads as hits, other input as misses, and halves off-peak', () => {
  // deepseek-flash at peak: 2M hits at 0.006, 1M misses at 0.3, 1M output at 1.2.
  assert.equal(deepseekCost('deepseek-flash', usage, new Date('2026-10-16T07:00:00Z')).toFixed(3), '1.512')
  assert.equal(deepseekCost('deepseek-flash', usage, new Date('2026-10-16T12:00:00Z')).toFixed(3), '0.756')
  assert.equal(deepseekCost('deepseek-flash[1m]', usage, new Date('2026-10-16T12:00:00Z')).toFixed(3), '0.756')
  assert.equal(baseModel('deepseek-v4-pro[1m]'), 'deepseek-v4-pro')
  assert.throws(() => deepseekCost('deepseek-unknown', usage, new Date()), /No DeepSeek price/)
})
