# Benchmark

<p><a href="README.es.md">Leer en español</a></p>

What does rea add to a coding agent that reverse engineers native Windows binaries? This harness measures it with challenges whose answers are known exactly, deterministic graders and paired statistics. It runs Claude Code headless (`claude -p`) and reuses rea's own evaluation code where it fits ([ADR 0019](../docs/adr/0019-reuse-rea-evaluation.md)).

## Conditions

| Condition | The agent gets |
|---|---|
| A | `llvm-readobj`, `llvm-objdump`, `llvm-strings`, `llvm-nm` and a few text filters, through Bash, plus file reading |
| B | A, plus rea over MCP with Ghidra |
| C | B, plus rea's skill (`reverse-engineer-anything`) |

The model, effort, prompt structure and limits are the same in every condition. No interpreter is allowed, so the agent cannot run the target: the task is static analysis.

## Task and answer

Each run gets one challenge from [`challenges/`](../challenges/README.md), renamed to `target.exe`, and has to find an input that makes it print `ACCESS GRANTED` and say how the program checks it. The answer is rea's closed claims manifest, one JSON object and nothing else, with two claims: `accepted_input` and `check_mechanism`. In conditions B and C each claim cites the `evidence_id` of the rea result that supports it.

## Grading

No LLM judge is involved.

| Measure | How it is decided |
|---|---|
| Solved (primary outcome) | The challenge oracle accepts `accepted_input` ([`oracle.mjs`](../challenges/oracle.mjs), checked against every real binary on Windows) |
| Mechanism | `check_mechanism` matches the challenge family |
| Strict manifest | The final message is exactly one manifest with rea's shape |
| Refused | The model stopped with a safety refusal; it counts as not solved and is reported apart |
| Evidence citations (B, C) | Each cited `evidence_id` belongs to an Evidence that rea delivered in the run and that re-authenticates with rea's `parseEvidence`, about the same SHA-256 as the target |
| rea usage (B, C) | rea's `evaluateCodexEvents` through an adapter: rea used, first call `open_binary`, session opened and closed, repeated calls, input validation failures |
| Cost and effort | Wall time, turns, tokens and equivalent cost from Claude Code's result |
| Flags | Permission denials and paths outside the run folder, reviewed before a study is published |

Solve rates carry Wilson 95 % intervals, and each pair of conditions is compared with an exact McNemar test on the same challenge, variant and repetition. With a few dozen pairs only large effects can be detected, and the report says so.

## Isolation

Each run has its own folder outside the repository, its own empty `CLAUDE_CONFIG_DIR`, `--strict-mcp-config`, `--setting-sources user` and `--permission-mode dontAsk`, so nothing from the user's setup reaches it and anything not allowed is denied without prompting. Details in [ADR 0018](../docs/adr/0018-benchmark-isolation.md).

## Running it

```powershell
npm run challenges                        # build the public challenges
npm run bench:test                        # unit tests of the graders, the rea adapter and the statistics
node bench/run.ts --study pilot --model <model> --dry-run
```

A real batch needs a long-lived token from `claude setup-token`, saved in `oauth-token` inside the benchmark home (`%LOCALAPPDATA%\rea-lab-bench`, or `REA_LAB_BENCH_HOME`), or given in `REA_LAB_BENCH_OAUTH_TOKEN`. The token only reaches the child process. Then check the isolation with one trivial session per condition, and run the batch:

```powershell
node bench/run.ts --study probe --model <model> --probe
node bench/run.ts --study pilot --model <model>
node bench/report.ts --study pilot
```

Raw transcripts stay in the benchmark home. `node bench/report.ts --study <name> --publish` copies the graded runs, without personal paths, into `bench/results/<name>/` together with the report.

## Limitations

- The challenges are small C programs built with llvm-mingw, not MSVC, and far simpler than real software.
- One agent (Claude Code) and one model per study, so results say nothing yet about other agents.
- `total_cost_usd` is an equivalent cost, not money spent on a subscription.
