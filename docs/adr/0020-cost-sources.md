# One cost source per context

Status: proposed (F4)

Benchmark cost comes from the JSON that `claude -p` returns. Interactive session cost comes from the author's usage-tracking mod. Mixing them would double count or let user plugins contaminate the benchmark.
