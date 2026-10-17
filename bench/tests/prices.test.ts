import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { baseModel, CLAUDE_LIST_PRICES, deepseekCost, isPeak, warmPrefixCost } from '../prices.ts'

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

test('Claude list prices reproduce the cost Claude Code reported for a recorded run', () => {
  // Usage and total_cost_usd of a study 5 development run (dev-s5-1, s07 under C2), with one-hour cache writes.
  const prices = CLAUDE_LIST_PRICES['claude-sonnet-5-5']
  const cost = (16 * prices.input + 36_153 * prices.cacheWrite + 185_202 * prices.cacheRead + 1_326 * prices.output) / 1_000_000
  assert.equal(cost.toFixed(7), '0.1764242')
})

test('the warm-prefix cost prices the first request cache writes as reads', () => {
  const first = { input_tokens: 10, output_tokens: 200, cache_creation_input_tokens: 100_000, cache_read_input_tokens: 0 }
  // 100,000 tokens move from 4 to 0.1 USD per million: 0.39 USD less.
  assert.equal(warmPrefixCost('claude-sonnet-5-5', 0.5, first)!.toFixed(4), '0.1100')
  assert.equal(warmPrefixCost('claude-sonnet-5-5[1m]', 0.5, first)!.toFixed(4), '0.1100')
  assert.equal(warmPrefixCost('claude-sonnet-5-5', null, first), null)
  assert.equal(warmPrefixCost('claude-sonnet-5-5', 0.5, undefined), null)
  assert.equal(warmPrefixCost('deepseek-flash', 0.5, first), null)
  assert.equal(warmPrefixCost(null, 0.5, first), null)
})
