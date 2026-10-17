// Cost of a run served by DeepSeek through its Anthropic-compatible API (ADR 0020). Claude Code's own
// total_cost_usd uses Claude prices, so it is kept apart and the cost is computed here from the usage.
// At the end, Claude's list prices, for the skill comparison's sensitivity analysis (ADR 0025).
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

// List prices per million tokens that Claude Code 2.1.296 uses for its equivalent cost (`costBasis: "list"`),
// recovered exactly from the usage and reported cost of 353 recorded runs. Claude Code writes the prompt cache
// with a one-hour lifetime in these runs, so cache writes are priced at that rate.
export const CLAUDE_LIST_PRICES: Readonly<Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }>> = {
  'claude-sonnet-5-5': { input: 2, cacheWrite: 4, cacheRead: 0.1, output: 10 },
}

/**
 * A run's equivalent cost with its first request's cache writes priced as cache reads, as if the shared prompt
 * prefix had already been cached (ADR 0025). Which run of a condition writes the prefix depends on the run
 * order, so this removes that order effect. Null when the run has no first-request usage or no known price.
 */
export function warmPrefixCost(model: string | null, cost: number | null, firstRequest: Usage | null | undefined): number | null {
  const prices = model === null ? undefined : CLAUDE_LIST_PRICES[baseModel(model)]
  if (cost === null || !firstRequest || !prices) return null
  return cost - (firstRequest.cache_creation_input_tokens * (prices.cacheWrite - prices.cacheRead)) / 1_000_000
}
