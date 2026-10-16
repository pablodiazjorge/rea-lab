# Study 4 preregistration

Status: **frozen** on 16 October 2026, in the commit that adds this line, after one pilot and before the first study run. Any later change is listed under Deviations in the study report.

## Question

Study 3 found no difference to measure: on four open-source programs the model had never seen, Claude Code with `claude-sonnet-5-5` located the described function or table in 71 of 72 runs with command-line tools alone (A) and in 68 of 72 with rea (B), both at the ceiling. Study 4 is a small, exploratory replication with a second model family: the same client, harness, tasks and limits, with the model served by DeepSeek. It tests a second model, not a second client, so it cannot say that the result is agent-agnostic; a second client is a later study.

| Id | Question | Kind |
|---|---|---|
| RQ1 | With DeepSeek's model, does rea (B) locate the asked function or table more often than command-line tools alone (A)? | tested as in study 3, with low power (see Analysis) |
| RQ2 | How do time, turns, tokens and cost compare between A and B with this model? | descriptive |
| RQ3 | When the agent cites rea Evidence, can every citation be verified, and does the answered address appear in the cited Evidence? | descriptive |
| RQ4 | How do the results compare with study 3 on the same tasks, and does the agent try to obtain the targets' source outside the run? | exploratory |

## Hypotheses

- H1 (RQ1): the rate of correct answers differs between A and B. Two-sided exact McNemar test on paired runs, matched by task, alpha 0.05. No direction is assumed.
- RQ2 to RQ4 have no hypothesis test. They are reported with intervals and counts. The comparison with study 3 is descriptive: the two studies differ in the model, the number of repetitions and when they ran, so a difference between them is a lead, not a result.

## Design

- Within-task, paired: every task runs under A and B with the same model, effort, prompt structure and limits ([ADR 0018](../docs/adr/0018-benchmark-isolation.md)).
- Tasks: the 20 tasks of study 3 outside the `string` control family, five per program on SGIEmu, c5xtools, moppe-emu and flint: r02, r03, r04, r05, r06, r08, r09, r10, r11, r12, r14, r15, r16, r17, r18, r20, r21, r22, r23 and r24 ([`challenges/real-tasks-study-3.json`](../challenges/real-tasks-study-3.json)), with study 3's build and ground truth. The control family is left out because it is outside H1 in study 3 and the pilot already checked that the setup works with this model.
- Repetitions: 1 per task and condition, so 40 runs in all (20 pairs). The size is set by the budget: the author's DeepSeek balance was about 4.45 USD before the study, and the pilot gives an expected 3 to 4 USD for 40 runs: about 3 USD at the pilot mean, nearer 4 if every behaviour task costs as much as the pilot ones.
- Order: shuffled with the order seed recorded below.
- Fixed per study: Claude Code 2.1.296; `deepseek-flash` (DeepSeek-V4.1-Flash, per DeepSeek's pricing page on 16 October 2026) served by DeepSeek's Anthropic-compatible API with `--provider deepseek`; medium effort, which DeepSeek's API does not honour as a thinking budget, so it is fixed rather than varied; Claude Code's tool search forced on, so rea's schemas stay deferred as in study 3 ([ADR 0018](../docs/adr/0018-benchmark-isolation.md), amended for a second model); rea 6.4.0, Ghidra 12.1.4, Temurin 21.0.12.1 and llvm-mingw 20261006. Ghidra, Temurin and llvm-mingw are pinned in `tools.json`. The harness refuses to resume the study if the Claude Code version, the rea version, the model, the effort, the provider or the task answers change, and every run records the model the API actually served.
- Public tasks and source: the tasks, the ground truth and the four programs' repositories are public. The runs have no web tools and Bash allows only the llvm tools and a few text filters, so `curl` and reads outside the run folder are denied. Every attempt to reach the targets' source or the answers, on the host or on the network, is counted and reported (RQ4); a run in which such an attempt succeeded would be an isolation fault and would be excluded and repeated.
- The model was released in September 2026; its training cutoff is not published, and the programs were published in September and October 2026, so memory of their source is unlikely but cannot be ruled out. The source-name outcome watches for it, as in study 3.
- Limits per run: 30 minutes of wall time. A run that hits it counts as not correct. Claude Code's own budget cap is set high (50 USD) because it uses Claude prices; the real limit is the DeepSeek balance.
- Runs start outside DeepSeek's peak hours (01:00-04:00 and 06:00-10:00 UTC on weekdays), where prices are half.
- Scratch files, unattended runs and reading Claude Code's saved tool results as in study 3. The grader authenticates Evidence inside saved rea results in both of Claude Code's note formats ([ADR 0019](../docs/adr/0019-reuse-rea-evaluation.md), amended after study 3).

## Outcomes

As in study 3, with cost computed from each run's usage with DeepSeek's published prices ([ADR 0020](../docs/adr/0020-cost-sources.md), amended for a second model):

| Outcome | Definition |
|---|---|
| Correct (primary) | `answer_address` falls inside the target's range in the full build's map. An address given relative to the image base counts and is flagged |
| Exact start | `answer_address` is exactly where the target starts |
| Source name | `source_name` is the target's name in the source |
| Strict manifest | The final message is exactly one manifest with rea's shape |
| Refused | The run ended without an answer after a safety refusal |
| Citations | In B: cited `evidence_id` values that authenticate against Evidence delivered in the run, and those about the target's SHA-256 |
| Address in the cited Evidence | In B: the answered address appears in the result of the authenticated Evidence that `answer_address` cites |
| Source attempts | Denied commands or tool calls that look for the targets' source or answers: listings or searches outside the run folder, network commands |
| rea usage | rea's own metrics, including input validation failures |
| Cost | Wall time, turns, input and output tokens, and cost in USD at DeepSeek's prices |

## Analysis

- Rate of correct answers per condition with a Wilson 95 % interval, overall, per family and per program.
- H1: exact McNemar on the 20 A and B pairs. With 20 pairs only a very large effect can be detected, so the study is reported as exploratory; a non-significant result is reported as "no large effect detected", never as "no effect".
- The four programs are clusters: the per-program table is descriptive.
- Comparison with study 3: per task, this study's A and B answers next to study 3's three repetitions of the same task.
- Flagged runs are reviewed by hand, as in study 3, and the source attempts are listed.

## Exclusions and reruns

As in study 3: infrastructure failures before any tool call are rerun up to twice, isolation faults are fixed and the run repeated, and timeouts, refusals, wrong answers and missing answers count as not correct. A run that fails because the DeepSeek balance ran out is an infrastructure failure; if the balance runs out before all 40 runs finish, the runs not done are reported as missing and the analysis uses the complete pairs only.

## Pilot (before freezing)

Pilot `pilot-s4-1` ran four public tasks of study 3's pilot 4, one per program, two behaviour and two chain tasks ([`real-tasks-pilot-4.json`](../challenges/real-tasks-pilot-4.json): s01, s04, s05 and s08), A and B, 1 repetition. Two runs ran at peak prices before the rest were moved off-peak.

| Measure | A | B |
|---|---|---|
| Correct | 3 of 4, all at the exact start | 4 of 4, all at the exact start |
| Median wall time, turns, cost | 506 s, 55.5 turns, 0.091 USD | 440 s, 58.5 turns, 0.103 USD |

- A missed the SGIEmu behaviour task after 130 turns; B found it after 131 turns and 1,015 s. Study 3's pilot 4 also had A miss an SGIEmu behaviour task.
- Cost: 0.82 USD for the 8 runs; off-peak, a mean of 0.074 USD per run. Most of it is output tokens (24,000 to 155,000 per run, mostly reasoning), against a median of about 1,800 with `claude-sonnet-5-5` in study 3.
- No source name was right (0 of 8). All 8 citations authenticated, and the answered address was in the cited Evidence in 3 of 4 B runs. The served model was `deepseek-flash` in every run.
- Every denied call was reviewed: Python, `cd ... &&` chains and writes through Bash, as in study 3, plus a new behaviour: in three runs the agent tried to obtain the source, with listings and searches of the repository folders on the host (one run) and `curl` requests to GitHub's API for the programs' names (two runs). All were denied.
- Probes before the pilot showed that Claude Code turns tool search off for a non-Anthropic base URL, so the first request with rea grew from 5,745 to 127,161 input tokens; with tool search forced on it was 7,903.

## Command

The study runs exactly as follows, from a clean checkout of the freezing commit, with the key in the benchmark home or in the file named by `REA_LAB_BENCH_DEEPSEEK_KEY_FILE`:

```powershell
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <build folder>
node challenges/real-tasks.mjs resolve challenges/real-tasks-study-3.json --build <build folder>
node bench/run.ts --study study-4 --provider deepseek --model deepseek-flash --effort medium --set <build folder> --conditions A,B --repetitions 1 --order-seed 20261018 --timeout-min 30 --max-budget-usd 50 --challenges r02,r03,r04,r05,r06,r08,r09,r10,r11,r12,r14,r15,r16,r17,r18,r20,r21,r22,r23,r24
node bench/report.ts --study study-4
```

## Tasks

| Field | Value |
|---|---|
| Task file SHA-256 | `ae8175807a521028d82984b668ab49bf3e4a42f7a28ddd6dae09af8c2bcd21aa` (study 3's, public) |
| Ground truth (`answers.json`) SHA-256 | `f559fdc0a879bb9fccd3871c1cc3d5ac9d5670c804f9721d6aaeef751e084f05` (study 3's, published in [`bench/results/study-3/`](results/study-3/answers.json)) |
| Build manifest SHA-256 | `996a69f7b215aca561936617a206000226a4a723d89059b47f62ef895b3789eb` |
| Order seed | 20261018 |

## Deviations

None yet.
