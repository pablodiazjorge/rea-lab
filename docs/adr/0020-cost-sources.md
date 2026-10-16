# One cost source per context

Status: accepted (F4), amended for a second model

Benchmark cost comes from the JSON that `claude -p` returns. Interactive session cost comes from the author's usage-tracking mod. Mixing them would double count or let user plugins contaminate the benchmark.

Amended for a second model: when DeepSeek serves the run, Claude Code's `total_cost_usd` still uses Claude prices. The benchmark then computes the cost from the run's usage with DeepSeek's published prices (`bench/prices.ts`, with the source and the date read): cache reads at the cache-hit price, other input at the miss price, output at the output price, and half of each outside DeepSeek's peak hours, judged from the run's start. Claude Code's figure is kept as `client_reported_cost_usd`.
