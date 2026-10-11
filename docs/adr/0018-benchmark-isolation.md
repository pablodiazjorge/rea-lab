# Benchmark isolation

Status: proposed (F4)

Each run gets a temporary folder with only the target binary, its own `CLAUDE_CONFIG_DIR` outside the repository, `--strict-mcp-config`, the tools of its condition, a pinned Claude Code dev dependency and a fixed model, so no user plugins, `CLAUDE.md` or skills leak in. Graders are deterministic, with no LLM judge. `total_cost_usd` is reported as equivalent cost, not as money spent.
