# Architecture decision records

One short file per decision that is hard to reverse, surprising without context and the result of a real trade-off. "Proposed" decisions belong to later phases and are confirmed or superseded when the phase starts.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-repository-layout.md) | One public lab repo with nested, ignored repos | accepted |
| [0002](0002-language-policy.md) | English by default, bilingual only where people read | accepted |
| [0003](0003-agents-md-single-source.md) | AGENTS.md is the single source of agent instructions | accepted |
| [0004](0004-portable-mcp-launcher.md) | Per-project MCP registration through a portable launcher | accepted (F1) |
| [0005](0005-pinned-rea-version.md) | rea is pinned to an exact version | accepted |
| [0006](0006-tools-manifest.md) | tools.json is the single source of tool versions | accepted (F1) |
| [0007](0007-jdk-21.md) | Temurin JDK 21 for Ghidra | accepted (F1) |
| [0008](0008-node-versions.md) | Node 22 for the lab, Node 24 only for the rea fork | accepted |
| [0009](0009-wsl-for-the-fork.md) | Full rea suite and native addon in WSL, Windows only for lanes | accepted |
| [0010](0010-target-policy.md) | Target policy and safety boundary | accepted, amended for study 3 |
| [0011](0011-reproducible-challenges.md) | Seeded, reproducible challenges as ground truth | accepted (F3), amended for study 3 |
| [0012](0012-writeup-format.md) | Writeup format | accepted (F3), amended for the benchmark studies |
| [0013](0013-licensing.md) | MIT for code, CC BY 4.0 for text and results | accepted |
| [0014](0014-publishing-evidence.md) | Published evidence is sanitised and re-import tested | accepted (F3), amended in F4 and after rea 6.6.0 |
| [0015](0015-mod-capture.md) | The mod captures evidence from tool calls | accepted (F5), amended for rea-casebook 1.0.4 |
| [0016](0016-mod-journal-location.md) | The mod journal lives outside the user's repository | accepted (F5), amended for rea-casebook 1.0.4 |
| [0017](0017-mod-pane.md) | What the mod pane shows | accepted (F5) |
| [0018](0018-benchmark-isolation.md) | Benchmark isolation | accepted (F4), amended for study 3 and for a second model |
| [0019](0019-reuse-rea-evaluation.md) | The benchmark reuses rea's evaluation where it fits | accepted (F4), amended for study 3 and after it |
| [0020](0020-cost-sources.md) | One cost source per context | accepted (F4), amended for a second model |
| [0021](0021-upstream-contribution-strategy.md) | How the lab contributes to rea | accepted, amended twice in F4 |
| [0022](0022-ci.md) | CI on Ubuntu for every push, Windows weekly | accepted (F1) |
| [0023](0023-internal-docs.md) | Private process log in _docs-internal | accepted |
| [0024](0024-real-software-tasks.md) | Real-software tasks: pinned sources, map ground truth, address answers | accepted (study 3) |
