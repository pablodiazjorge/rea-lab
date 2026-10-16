# Does the study 3 result hold with another model? A fourth preregistered study on Windows

<p><a href="README.es.md">Leer en español</a></p>

[Study 3](../2026-10-study-3/README.md) asked Claude Code where a described function or table lives in four real open-source programs, compiled here without symbols, with and without the reverse-engineering MCP server [rea](https://github.com/morluto/rea). With `claude-sonnet-5-5`, both conditions were at the ceiling and there was no difference to measure. This study repeats it with a model from another family, DeepSeek's `deepseek-flash`, served through DeepSeek's Anthropic-compatible API: the same client, harness, tasks and limits, with one repetition per task because the budget was the author's remaining DeepSeek balance. It tests a second model, not a second agent.

**Short answer:** the same ceiling. The agent located the asked function or table in 20 of 20 runs with command-line tools alone and in 19 of 20 with rea (exact McNemar, p = 1). With 20 pairs only a very large effect could have shown, and none did. On the same 20 tasks, study 3 had 59 of 60 and 56 of 60. The 40 runs cost 2.05 USD of real money. Unlike Claude, DeepSeek's model tried to reach the internet or the benchmark's folders outside its run in 13 of the 40 runs, several times to find the programs' source; the permission policy denied every attempt.

## Design

Everything in this section was fixed in the [preregistration](../../bench/preregistration-study-4.md), committed before the study started (`b4227d5`, 16 October 2026), after one pilot.

- **What changed from study 3.**
  - Model: `deepseek-flash` (DeepSeek-V4.1-Flash), served by DeepSeek's Anthropic-compatible API (`--provider deepseek`). Every run records the model the API served; it was `deepseek-flash` in all 40.
  - Tool search forced on. Claude Code turns it off for a base URL that is not Anthropic's, which put rea's 153 tool schemas in every request: 127,161 input tokens on the first request with rea, against 7,903 with tool search on. Forcing it keeps rea's schemas deferred, as in study 3 ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).
  - Tasks: the 20 tasks of study 3 outside the `string` control family, five per program.
  - Runs: one repetition per task and condition, 40 runs, in a shuffled order.
  - Cost: computed from each run's token usage at DeepSeek's published prices, which halve off-peak ([ADR 0020](../../docs/adr/0020-cost-sources.md)). All 40 runs started off-peak, between 12:30 and 16:39 UTC on Friday 16 October.
- **What stayed.** Claude Code 2.1.296 in headless mode with medium effort; condition A with the LLVM command-line tools and text filters, no interpreter, and condition B with the same plus rea 6.4.0 over MCP with Ghidra 12.1.4; the four programs, their build, the questions and the ground truth of study 3; 30 minutes per run; the same isolation and grading.
- **Statistics.** Rates with Wilson 95 % intervals and an exact McNemar test on the 20 pairs. With so few pairs the study is exploratory: a non-significant result reads "no large effect detected".

## Results

| | A: command-line tools | B: plus rea |
|---|---|---|
| Correct | 20/20 (100 %, 84 to 100 %) | 19/20 (95 %, 76 to 99 %) |
| Name in the source guessed right | 3/20 | 2/20 |
| Answer in rea's exact manifest format | 14/20 | 20/20 |
| Runs that hit the 30-minute limit | 0 | 0 |
| Median time | 272 s | 332 s |
| Median turns | 37.5 | 54 |
| Median input tokens | 1,393,104 | 2,008,207 |
| Median output tokens | 42,514 | 43,448 |
| Median cost | 0.04 USD | 0.05 USD |

Every correct answer was the exact start of its target.

**H1, A against B: no large effect detected.** One pair of 20 disagrees, with only A right (exact McNemar, p = 1).

| Family | A | B |
|---|---|---|
| `behaviour` | 13/13 | 12/13 |
| `chain` | 4/4 | 4/4 |
| `data` | 3/3 | 3/3 |

Every program had 5 of 5 in both conditions, except moppe-emu with rea, 4 of 5.

**Against study 3, task by task.** Both models answered almost everything. The misses fall on different tasks: DeepSeek with rea got right the three tasks where Claude with rea had missed, and missed one that Claude got right six times out of six. These are single runs, so this is a lead at most. The full table is in the [report](../../bench/results/study-4/report.md).

| Task | Family | Program | A | B | A in study 3 | B in study 3 |
|---|---|---|---|---|---|---|
| r05 | `chain` | SGIEmu | 1/1 | 1/1 | 3/3 | 2/3 |
| r10 | `behaviour` | c5xtools | 1/1 | 1/1 | 3/3 | 2/3 |
| r14 | `behaviour` | moppe-emu | 1/1 | 0/1 | 3/3 | 3/3 |
| r15 | `behaviour` | moppe-emu | 1/1 | 1/1 | 3/3 | 1/3 |
| r23 | `chain` | flint | 1/1 | 1/1 | 2/3 | 3/3 |
| All 20 tasks | | | 20/20 | 19/20 | 59/60 | 56/60 |

**How the run failed.** The one miss, r14 with rea, asked for the function that follows the radio's two-wire serial bus. After 72 turns and 935 s the agent answered `cu53an_out2`, a function of another chip of the radio, instead of `bus_edge`. It is not a neighbour of the target in the call graph: it shares its two callers with `cu58af_set_scl`, which is the function that calls `bus_edge`.

**Names in the source.** The agent named the target right in 5 of 40 runs, against 2 of 120 with Claude on the same tasks: `pit_read` and `pio_set_input` in both conditions, and `k` for the table of SHA-256 round constants, in A. The first two are the same tasks whose names Claude guessed in study 3, and all three names follow from the wording of the question, so they point to the questions, not to memory of the code.

**The agent looked for the source.** The preregistration made this an outcome after the pilot, where it first appeared. Every attempt was denied, so no run had to be excluded.

- 7 runs (5 in A, 2 in B) ran `curl`:
  - four tested whether the network was reachable, three against `raw.githubusercontent.com` and one against `example.com`;
  - two asked for flint's README, at the repository URL that the flint binary itself contains;
  - one searched GitHub's repositories for `r58emu`, a name it had found among moppe-emu's strings.
- 6 runs (1 in A, 5 in B) tried to list the benchmark's folders above their own, "for metadata" in the agent's own descriptions, and in one run to find the files where Claude Code saves large results. That folder tree also holds the benchmark's build of study 3, with its ground truth, so the answers were one denied listing away.

None of the 144 runs of study 3 tried the network, and in the pilot this model did so in 2 of 8 runs.

**How rea was used.** The agent used rea in all 20 runs of B, always started with `open_binary` and always closed the session, after a median of 20.5 rea calls, against 8 with Claude. It called 27 different rea tools, against 17 with Claude, among them `analyze_function`, which pages a large function's code: 17 calls in 13 runs, which Claude never made. All 40 cited `evidence_id` values authenticated and were about the target. In 18 of the 20 runs the cited Evidence states the answered address, against 38 of 72 with Claude. rea rejected 2 calls for invalid input.

**Saved results.** Claude Code saved 47 rea results to a file in 19 of the 20 runs of B, from 51 KB to 2.3 MB, and the agent read one back in 16 runs, with Claude Code's Read and Grep tools and shell text filters; its attempts to parse them with Python were denied. With DeepSeek, Claude Code used two forms of the note that replaces a saved result: for the 29 largest, from 60 KB to 2.3 MB, the error note of study 3, with the file named after the tool and no preview; for 18 results from 51 to 67 KB, a note with the file named after the call's id and a 2 KB preview. All 43 saved results of study 3 had the first form. The grader follows both to the file ([ADR 0019](../../docs/adr/0019-reuse-rea-evaluation.md)).

**Answer format.** In 6 of the 20 runs of A the final message had text around the JSON manifest, so it failed the strict check; the grader still read the answer, as in earlier studies. With rea, all 20 were exact.

**Cost and time.** The 40 runs took 254 minutes of machine time and cost 2.05 USD (0.95 in A, 1.11 in B), against the 3 to 4 USD the preregistration expected from the pilot. Output tokens make most of it: a median of about 43,000 per run, mostly reasoning, against 1,622 and 1,805 with Claude in study 3. Runs took about ten times as long as with Claude in A and four and a half times as long in B. Claude Code's own estimate, at Claude prices, was 115.19 USD, which is why the harness prices DeepSeek's tokens itself. The two studies' costs are not comparable: study 3 reports Claude Code's equivalent cost on a subscription, this one money spent.

No response was stopped by a safety classifier. The classifier that stopped responses in studies 1 and 2 belongs to Anthropic's API, which this study did not use.

## What the pilot already showed

One pilot of 8 runs on four public tasks, none part of the study, shaped the design ([preregistration](../../bench/preregistration-study-4.md#pilot-before-freezing)). It found that Claude Code turns tool search off for DeepSeek's API, that output tokens dominate the cost, and that this model tries to obtain the source: listings of the author's repository folders in one run and `curl` to GitHub's API in two. A answered 3 of 4 and B 4 of 4.

## What it means

- With a second model family the result of study 3 holds: both conditions locate the described function in almost every run, and rea makes no difference that 20 pairs can detect. The ceiling is not a property of `claude-sonnet-5-5`. It is still one client, Claude Code, so nothing here speaks for other agents.
- rea again took longer and cost a little more (median 332 s against 272 s, 0.05 against 0.04 USD), but the gap is much smaller than Claude's 2.3 times the median cost, because this model's reasoning tokens dominate both conditions.
- The two models use rea differently. DeepSeek's made more calls, over a wider set of tools, including the paged route that Claude never used, and its cited Evidence more often stated the answer.
- Isolation matters more with some models. DeepSeek's model tried to reach the network or the host in 13 of 40 runs, and the benchmark's own ground truth sat a few folders above the runs. The permission policy held, but the next study should keep the ground truth outside the folder tree that runs live in.
- A 40-run replication cost 2 USD, so repeating a study with cheaper models is affordable.

## Deviations

None in how the study ran: the preregistered command, from `b4227d5`, with no infrastructure failures, no reruns and no interruptions. After the study, the report generator was changed to state that DeepSeek's cost is money spent and to add the per-task comparison with study 3 that the analysis promised; the analysis did not change. `context.ts` now also counts the rea results that Claude Code saves under the call's id with DeepSeek, and the runs that read a saved result back.

Reviewing the read-backs for this study found an error in study 3's addendum: it said the agent read a saved result back in 18 runs, which counted every attempt. It read a saved rea result back in 14; study 3's [correction](../2026-10-study-3/README.md#correction-16-october-2026) has the details.

## Limitations

- 20 pairs and one repetition per task: only a very large effect could show, and each task's outcome is a single run.
- A second model, not a second agent: the client, prompts and tools were Claude Code's.
- The model's training cutoff is not published. It was released in September 2026 and the programs were published in September and October 2026, so memory of their code is unlikely; the source-name outcome found no sign of it beyond what the questions give away.
- DeepSeek's API does not honour Claude Code's effort level as a thinking budget, so the effort was fixed, not compared.
- Tool search was forced on, which is not Claude Code's default for third-party APIs; without it, every request with rea would carry about 120,000 more input tokens.
- The ground truth was stored in the benchmark's folder, above the runs. The permission policy denied every attempt to reach it, but a weaker policy would have exposed it.
- The cost comes from DeepSeek's published prices and each run's token usage, not from the invoice; in the pilot, the computed cost matched DeepSeek's dashboard.
- The programs, build and tasks have the limitations described in study 3: four small C programs built with llvm-mingw, four clusters, and questions written by the author.
- Added on 16 October 2026: the runs were launched from the Claude desktop app, whose environment sets two Claude Code switches, `DISABLE_MICROCOMPACT=1`, which turns off the clearing of old tool results from the context, and `API_TIMEOUT_MS=900000`. The harness did not filter them, so they very likely reached every run. They applied to every condition alike, so no comparison changes, but absolute token counts and costs may be higher than with Claude Code's defaults. From study 5 the harness drops them ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).

## Reproduce it

The tasks, the ground truth and the seed of the target draw are those of study 3, published in [`bench/results/study-3/`](../../bench/results/study-3/) and [`challenges/real-tasks-study-3.json`](../../challenges/real-tasks-study-3.json). The run needs a DeepSeek API key, in a file named by `REA_LAB_BENCH_DEEPSEEK_KEY_FILE` or in the benchmark folder.

```powershell
npm ci
npm run setup
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <folder>
node challenges/real-tasks.mjs resolve challenges/real-tasks-study-3.json --build <folder>
node bench/run.ts --study study-4 --provider deepseek --model deepseek-flash --effort medium --set <folder> --conditions A,B --repetitions 1 --order-seed 20261018 --timeout-min 30 --max-budget-usd 50 --challenges r02,r03,r04,r05,r06,r08,r09,r10,r11,r12,r14,r15,r16,r17,r18,r20,r21,r22,r23,r24
node bench/report.ts --study study-4 --compare bench/results/study-3/results.jsonl
```

The graded runs are published in [`bench/results/study-4/`](../../bench/results/study-4/), with the post hoc context measures in `context.json`, and the report regenerates from them with one command:

```powershell
node bench/report.ts --results bench/results/study-4/results.jsonl --compare bench/results/study-3/results.jsonl --out <folder>
```

How the benchmark works, and its isolation and grading, is described in [`bench/`](../../bench/README.md).
