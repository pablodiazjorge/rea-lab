# Study 5 preregistration

Status: **frozen** on 17 October 2026, in the commit that adds this line, after three development rounds of the improved skill, the task draw and one pilot, and before the first study run. Any later change is listed under Deviations in the study report.

## Question

rea ships a skill, `reverse-engineer-anything`, that tells an agent how to use its tools. In study 1 the skill was installed as `rea setup` installs it and the agent never loaded it in any of the 10 runs that offered it, so its content has never been measured. In study 3, on four open-source programs compiled without symbols, rea answered correctly in 68 of 72 runs with `claude-sonnet-5-5`, at the ceiling, but at more than twice the median cost of command-line tools alone, and the Evidence cited for the answer stated the answered address as a number in 38 of 72 runs, although it named the answered function in 65 (see Outcomes). Study 5 asks whether the skill's content makes rea cheaper, and whether a revised skill does better than the official one; how the citations change is described ([ADR 0025](../docs/adr/0025-skill-comparison.md)). Only the skill in the system prompt changes: the client, the model, the tools, the limits and the programs stay as in study 3's condition B.

| Id | Question | Kind |
|---|---|---|
| RQ1 | Does the improved skill (C2) change the cost per run compared with rea's official skill (C1)? | confirmatory (H1) |
| RQ2 | Does the official skill (C1) change the cost per run compared with no skill (B)? | confirmatory (H2) |
| RQ3 | How often does the cited Evidence state the answered address, or name the answered function, and with which tools? How do turns, rea calls, repeated calls, input validation failures, results saved to a file, tokens of each type and time compare between conditions? How do C2 and B compare? | descriptive |
| RQ4 | How often does each condition answer correctly and at the exact start, how often does the agent read the skill's references, and which tools does each condition use? | descriptive, accuracy as a guardrail |

## Hypotheses

- H1 (RQ1): the cost per run differs between C1 and C2.
- H2 (RQ2): the cost per run differs between B and C1.
- Test: an exact two-sided Wilcoxon signed-rank test on each task's log ratio of mean costs (the mean over its two repetitions in each condition), with the Hodges-Lehmann ratio and its exact 95 % interval. H1 and H2 answer different questions and are each tested at alpha 0.05, without adjustment against each other. No direction is assumed.
- Citations are descriptive (RQ3). A draft of this design made them a second co-primary outcome; the development rounds showed that whether the cited Evidence states the address mostly measures which tool is cited (see Outcomes), so they no longer carry confirmatory weight.
- Accuracy is a guardrail, not a hypothesis: it is at the ceiling on these programs and 60 runs per condition cannot show non-inferiority. If C2 answers correctly in more than 3 fewer runs than C1, a cost advantage is not reported as an improvement.
- RQ3 and RQ4 have no hypothesis test. They are reported with medians, counts and intervals; any pattern there is a lead, not a result.

## Design

- Within-task, paired: every task runs under B, C1 and C2 with the same model, effort, prompt and limits ([ADR 0018](../docs/adr/0018-benchmark-isolation.md)).
- Conditions, all with rea over MCP and the tools and permissions of study 3's condition B:

  | Condition | System prompt |
  |---|---|
  | B | Claude Code's own, no skill |
  | C1 | plus the body of rea 6.4.0's official `SKILL.md` |
  | C2 | plus the body of the improved `SKILL.md` ([`bench/skills/reverse-engineer-anything-improved/`](skills/reverse-engineer-anything-improved/)) |

- Injection: the skill's body goes into the system prompt with Claude Code's `--append-system-prompt-file`, after one fixed sentence, the same for both skills, that says what it is and where its references are. The skill's `references/` files are copied into the run's configuration folder and are readable, so the agent opens them on demand. The study measures the skill's content, not whether a client decides to load an installed skill, and the writeup says so.
- The improved skill keeps the official text and adds a section on locating code in a native binary, a pointer to it and a sentence about saved results; it is 14.0 % longer (15,484 bytes against 13,580). Its changes come from the transcripts of studies 1 and 3, from the public tasks of study 3's pilot 4 and from published guidance, each with its source in `PROVENANCE.md`. A test checks that it names no program, function or address of the studies. It was frozen in commit `e9f6632` with the SHA-256 below, before the tasks were drawn.
- Targets: study 3's four programs and build (SGIEmu, c5xtools, moppe-emu and flint, build version 1, the same manifest and ground truth). Two of the programs print the compiler's `__DATE__`, so a rebuild on another day changed two of their bytes; the build now pins that date to the day study 3's targets were built ([ADR 0024](../docs/adr/0024-real-software-tasks.md), amended for study 5), and the rebuild with the command below gave study 3's manifest hash byte for byte.
- Tasks: 30 new tasks, none of them a target or a described function of study 3 or of its pilot 4:
  - SGIEmu and flint: 6 `behaviour` and 2 `chain` each;
  - c5xtools and moppe-emu: 6 `behaviour` and 1 `chain` each;
  - no `string` control, which does not test the skill, and no `data` task: only 2 numeric tables are left, both in moppe-emu.
- The validator's candidates are ordered by a private seed and the first ones taken, as in study 3. The author wrote every question from the source, stating a purpose and never an implementation detail or an identifier. The task file's SHA-256 is recorded below; the tasks, the ground truth and the seed are published with the report.
- Repetitions: 2 per task and condition, so 180 runs in all: 30 task pairs for each cost test and 60 run pairs for each citation comparison. A power simulation on study 3's costs gave, with 20 tasks, 98 % power for a 30 % cost cut, 69 % for 20 % and 18 % for 10 %; 30 tasks raise the power for the smaller cuts, and the pilot section gives the power with the spread measured in the development rounds.
- Order: shuffled with the order seed recorded below.
- Fixed per study: Claude Code 2.1.296, `claude-sonnet-5-5` with medium effort, rea 6.4.0, Ghidra 12.1.4, Temurin 21.0.12.1 and llvm-mingw 20261006. The harness refuses to resume the study if any of them changes, if the task answers change or if either skill changes (it locks each skill's SHA-256, files and body size).
- Claude Code runs with its defaults: the harness no longer passes the tuning switches it inherited from the desktop app in studies 1 to 4 (`DISABLE_MICROCOMPACT` and `API_TIMEOUT_MS`, [ADR 0018](../docs/adr/0018-benchmark-isolation.md), amended for study 5). Absolute costs are therefore not comparable with earlier studies; the comparisons inside the study are.
- The task set lives outside the benchmark home, where the runs live, and the harness refuses a set inside it.
- Limits per run: 30 minutes of wall time and an equivalent cost cap of 5 USD. A run that hits either limit counts as not correct and keeps its cost.
- Expected size: the pilot cost about 0.39 USD of equivalent cost per run, so about 70 USD and 4 to 5 hours for the 180 runs, within the author's subscription.

## Outcomes

| Outcome | Definition |
|---|---|
| Cost (confirmatory) | Claude Code's equivalent cost of the run at list prices |
| Address in the cited Evidence | The answered address appears as a number in the result of the authenticated Evidence that `answer_address` cites, as in studies 3 and 4 |
| Function named in the cited Evidence | The cited Evidence states the address, or its result is decompiled code whose signature carries the decompiler's default name for that address (Ghidra's `FUN_` followed by the address, without 0x). The request's parameters do not count: a procedure tool given an address inside a function answers for the function that contains it |
| Cited tool | The rea operation that produced the cited Evidence |
| Correct (guardrail) | `answer_address` falls inside the target's range in the full build's map. An address given relative to the image base counts and is flagged |
| Exact start | `answer_address` is exactly where the target starts |
| Source name | `source_name` is the target's name in the source |
| Strict manifest | The final message is exactly one manifest with rea's shape |
| Classifier stops and refusals | As in study 3 |
| Citations | Cited `evidence_id` values that authenticate against Evidence delivered in the run, and those about the target's SHA-256 |
| rea usage | rea's own metrics: calls, repeated calls, input validation failures |
| Process | Turns, tool calls by tool, results saved to a file and read back, reads of the skill's references |
| Tokens and time | Input, cache writes, cache reads and output tokens, the first request's tokens, wall time |

## Analysis

- H1 and H2 as above, on the 30 tasks of each pair of conditions. B against C2 is reported with the same test, as description.
- Citations under both definitions, per condition and by cited tool, with exact McNemar tests on runs paired by task and repetition, all descriptive.
- Cost is read together with tokens of each type, turns and rea calls, since a longer skill costs more input by construction: the report gives the medians per condition and the first request's input tokens.
- Sensitivity: runs of one condition share a cached prompt prefix, so which run writes it depends on the order. The cost tests are repeated with every run's first-request cache writes priced as cache reads, at the list prices Claude Code uses; this is descriptive.
- Rate of correct answers per condition with a Wilson 95 % interval, overall, per family and per program, and McNemar on correctness for each pair, as description.
- The four programs are clusters: the per-program tables are descriptive, and the report says how far one program drives a result.
- A non-significant result is reported as "no effect of this size detected", never as "no effect".

## Exclusions and reruns

As in study 3: infrastructure failures before any tool call are rerun up to twice, isolation faults are fixed and the run repeated, runs flagged for paths outside the run folder are reviewed by hand, and timeouts, budget stops, refusals, wrong answers and missing answers count as not correct. A task whose pair is incomplete after reruns leaves the cost test of that pair, and the report says so.

## Development of the improved skill (before freezing)

Up to three rounds, each on the eight public tasks of study 3's pilot 4 ([`real-tasks-pilot-4.json`](../challenges/real-tasks-pilot-4.json)) under C1 and C2, 1 repetition, decided on process measures (tool calls, repeated calls, citations that state the address, turns and cost):

| Round | Runs | What it showed | Change |
|---|---|---|---|
| `dev-s5-1` | 16 | All 16 correct. C2 cited an Evidence stating the address in 7 of 8 runs, C1 in 5 of 8; C2 was cheaper in 6 of 8 tasks (one repetition, so within noise). C1 turned to Bash disassembly (61 calls against 25). In one C2 run `xrefs` on a string returned a data address, and a procedure tool failed on it | Step 1 describes `xrefs` results as code or data (`37+rea-lab.2`) |
| `dev-s5-2` | 16 | C1 8 of 8, C2 7 of 8 (a miss on an SGIEmu behaviour task). No input validation failure in C2. The same task and skill varied in cost by a factor of 2 to 3 between rounds. Citations to `procedure_pseudo_code` never state the address as a number: its result names the function only with Ghidra's default name | Step 5 asks for an Evidence about the reported function, its code or a result that gives its start address, rather than naming tools (`37+rea-lab.3`) |
| `dev-s5-3` | 16 | C1 7 of 8 (a miss on an SGIEmu chain task), C2 8 of 8. Every C2 citation named the reported function; 5 of 8 in each condition stated the address as a number. Costs within the earlier range, with one C2 run on the hardest SGIEmu task at 1.05 USD | None: frozen at `37+rea-lab.3` |

## Pilot (before freezing)

Pilot `pilot-s5-1` ran four public tasks of study 3's pilot 4, one per program, two behaviour and two chain tasks ([`real-tasks-pilot-4.json`](../challenges/real-tasks-pilot-4.json): s01, s04, s05 and s08), under B, C1 and C2 with the frozen skills, 1 repetition, after the skill was frozen.

| Measure | B | C1 | C2 |
|---|---|---|---|
| Correct | 3 of 4 | 3 of 4 | 4 of 4 |
| Median cost, turns | 0.347 USD, 24.5 | 0.307 USD, 24 | 0.265 USD, 18 |
| Cited Evidence states the address / names the function | 3 / 4 | 2 / 3 | 3 / 4 |

- The harness was stable: no infrastructure failure, no isolation fault, the frozen skill digests locked in `study.json`, and the report produced the cost tests, the cache sensitivity and both citation definitions from the records.
- Cost has a heavy tail on the hardest task: on SGIEmu's s01, C2 cost 1.34 USD in 42 turns, enumerating procedures by address with search patterns and decompiling them one by one, against 0.39 USD for B and C1, which grepped a disassembly instead; it answered correctly. The development rounds had shown the same task at 0.29 to 1.05 USD under C2. The test works on each task's log ratio of mean costs, so one task cannot dominate it.
- Repetitions: the development rounds repeated each task three times per condition, which measures the spread between repetitions better than the pilot's single runs. With that spread (standard deviation of log cost 0.31) and 30 tasks, a simulation of the exact Wilcoxon test at alpha 0.05 gave, with 2 repetitions, 80 to 94 % power for a 20 % cost cut and 29 to 40 % for a 10 % cut; with 3 repetitions, 90 to 100 % and 34 to 55 % (the range spans a task-by-condition spread from 0 to 0.25). The study keeps 2 repetitions: a third would add 90 runs for about 10 points of power at a 20 % cut, and a 10 % cut stays out of reach either way. The study can detect cost changes of about 20 % or more.

## Command

The study runs exactly as follows, from a clean checkout of the freezing commit, with the private task file resolved into a build folder outside the benchmark home:

```powershell
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <build folder>
node challenges/real-tasks.mjs resolve <private task file> --build <build folder>
node bench/run.ts --study study-5 --model claude-sonnet-5-5 --effort medium --set <build folder> --conditions B,C1,C2 --repetitions 2 --order-seed 20261019 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-5
```

## Skills and tasks

| Field | Value |
|---|---|
| Official skill (rea 6.4.0) | `SKILL.md` `46b495fe6459c283c1432294ebe67799a54391cd2ded197ee7df3f8ac0a8ac8f`; folder digest locked by the harness `2fdcf806d2c247df0a638b1f1e12d3a00e373307bec49e302e2d4f32c92fe17e` |
| Improved skill (`37+rea-lab.3`) | `SKILL.md` `f83e09320eaea8441ac36f579ff123efc8018f8c5b88f95a833a7772ad2f8f36`; folder digest `d6b9e21b1c8e174accac58d1ee93131590b1c6b9ab4be220df8577534b97f40a`; frozen in commit `e9f6632` |
| Task file SHA-256 | `06e6a4e4114b0671e326671f2bc6dc2e0e2fcc5806f32910051328f6bf4fe670` |
| Ground truth (`answers.json`) SHA-256 | `627b8457aa6ad017dcf712154951f2be32d18144688555323d1eacc53c4ee24a` |
| Build manifest SHA-256 | `996a69f7b215aca561936617a206000226a4a723d89059b47f62ef895b3789eb` |
| Seed of the target draw | published with the report |
| Order seed | `20261019` |

## Deviations

None yet.
