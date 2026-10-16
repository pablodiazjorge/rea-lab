// Cost of a run served by DeepSeek through its Anthropic-compatible API (ADR 0020). Claude Code's own
// total_cost_usd uses Claude prices, so it is kept apart and the cost is computed here from the usage.
//
// Prices per million tokens, from https://api-docs.deepseek.com/quick_start/pricing, read on 2026-10-16.
// Off-peak prices are half the peak ones. Peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday,
// except Chinese public holidays, which this module does not know: a holiday is priced as peak, so the
// estimate can only be too high.

import type { Usage } from './claude.ts'

type PeakPrices = { cacheHit: number; cacheMiss: number; output: number }

export const DEEPSEEK_PRICES: Readonly<Record<string, PeakPrices>> = {
  'deepseek-flash': { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
  'deepseek-v4-pro': { cacheHit: 0.044, cacheMiss: 1.32, output: 3.96 },
}

/** The model id without Claude Code's context-window suffix, for example `deepseek-flash[1m]`. */
export const baseModel = (model: string) => model.replace(/\[[^\]]*\]$/, '')

/** Whether DeepSeek bills a request made at this instant at the peak rate. */
export function isPeak(at: Date): boolean {
  const day = at.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = at.getUTCHours()
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10)
}

/**
 * The cost in USD of a run's usage, priced at the rate in force when the run started. Cache reads are billed as
 * cache hits; fresh input and cache creation as misses.
 */
export function deepseekCost(model: string, usage: Usage, startedAt: Date): number {
  const prices = DEEPSEEK_PRICES[baseModel(model)]
  if (!prices) throw new Error(`No DeepSeek price for model ${model}`)
  const factor = isPeak(startedAt) ? 1 : 0.5
  const miss = usage.input_tokens + usage.cache_creation_input_tokens
  return (factor * (usage.cache_read_input_tokens * prices.cacheHit + miss * prices.cacheMiss + usage.output_tokens * prices.output)) / 1_000_000
}
