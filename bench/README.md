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

## Real-software tasks

Study 3 swaps the crackmes for real open-source programs compiled without symbols ([ADR 0024](../docs/adr/0024-real-software-tasks.md)). Each run asks one question about where a function or table lives, and the answer has two claims: `answer_address`, the virtual address where it starts, and `source_name`, a guess at its name in the source. The answer is correct when the address falls inside the target's range in the full build's map; the exact start, an address given without the image base, the source name and, in B, whether the cited Evidence states that address are reported apart. A run may also read the files where Claude Code saves tool results too large to return inline, and the Evidence inside a saved rea result counts as delivered ([ADR 0019](../docs/adr/0019-reuse-rea-evaluation.md)). The tasks come from [`challenges/real-tasks.mjs`](../challenges/real-tasks.mjs) and the [study 3 preregistration](preregistration-study-3.md) describes the design.

## Grading

No LLM judge is involved.

| Measure | How it is decided |
|---|---|
| Solved (primary outcome) | The challenge oracle accepts `accepted_input` ([`oracle.mjs`](../challenges/oracle.mjs), checked against every real binary on Windows) |
| Mechanism | `check_mechanism` matches the challenge family; in `-O2` builds of single-answer families, where the compiler can fold the check into a comparison with constants, `string_compare` counts too |
| Strict manifest | The final message is exactly one manifest with rea's shape |
| Classifier stops and refusals | Responses cut off by the model's safety classifier, and runs that ended without an answer because of one; reported apart |
| Evidence citations (B, C) | Each cited `evidence_id` belongs to an Evidence that rea delivered in the run and that re-authenticates with rea's `parseEvidence`, about the same SHA-256 as the target |
| rea usage (B, C) | rea's `evaluateCodexEvents` through an adapter: rea used, first call `open_binary`, session opened and closed, repeated calls, input validation failures |
| Cost and effort | Wall time, turns, tokens and equivalent cost from Claude Code's result |
| Flags | Permission denials and paths outside the run folder, reviewed before a study is published |

Solve rates carry Wilson 95 % intervals, and each pair of conditions is compared with an exact McNemar test on the same challenge, variant and repetition. With a few dozen pairs only large effects can be detected, and the report says so.

## Isolation

Each run has its own folder outside the repository, its own empty `CLAUDE_CONFIG_DIR`, `--strict-mcp-config`, `--setting-sources user` and `--permission-mode dontAsk`, so nothing from the user's setup reaches it and anything not allowed is denied without prompting. Details in [ADR 0018](../docs/adr/0018-benchmark-isolation.md).

With `--provider deepseek`, the same Claude Code is served by DeepSeek's Anthropic-compatible API. The run gets the DeepSeek endpoint, its key and an explicit `deepseek-*` model in every model slot, never the Anthropic token, and tool search is forced on so rea's schemas stay deferred as with Anthropic models. Each run records the model the API actually served, and its cost is computed from the usage with DeepSeek's prices ([`prices.ts`](prices.ts)); Claude Code's own figure, which uses Claude prices, is kept apart.

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

After a grader fix, `node bench/regrade.ts --study <name>` grades a study again from its saved transcripts, without repeating any run. Raw transcripts stay in the benchmark home. `node bench/report.ts --study <name> --publish` copies the graded runs, without personal paths, into `bench/results/<name>/` together with the report. `node bench/context.ts --study <name>` prints post-hoc context measures from the transcripts, such as the rea results saved to files by tool and the input of each run's first request, without local paths.

## Limitations

- The challenges are small C programs built with llvm-mingw, not MSVC, and far simpler than real software.
- One agent (Claude Code) and one model per study, so results say nothing yet about other agents.
- `total_cost_usd` is an equivalent cost, not money spent on a subscription.
