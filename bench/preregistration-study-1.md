# Study 1 preregistration

Status: **frozen** on 12 October 2026, in the commit that adds this line, after the pilots and before the first study run. Any later change is listed under Deviations in the study report.

## Question

What does rea add to Claude Code when it reverse engineers small native Windows programs statically?

| Id | Question | Kind |
|---|---|---|
| RQ1 | Does rea (B) solve more challenges than command-line tools alone (A)? | confirmatory |
| RQ2 | Does rea's skill (C) change the solve rate or the way rea is used, compared with B? | exploratory |
| RQ3 | When the agent cites rea Evidence, can every citation be verified? | descriptive |
| RQ4 | What do B and C cost against A in time, turns, tokens and equivalent cost? | descriptive |

## Hypotheses

- H1 (RQ1): the solve rate differs between A and B. Two-sided exact McNemar test on paired runs, alpha 0.05. No direction is assumed: rea could help with decompilation or cost turns through its cold start.
- RQ2 to RQ4 have no hypothesis test. They are reported with intervals and counts, and any pattern found there is a lead for a later study, not a result.

## Design

- Within-challenge, paired: every challenge runs under A and B, the confirmatory comparison, and under C as an exploratory arm, with the same model, effort, prompt structure and limits ([ADR 0018](../docs/adr/0018-benchmark-isolation.md)).
- Challenges: the held-out set, generated with a seed that stays private until the report is published. Its `manifest.json` SHA-256 is recorded below before the first run. The set is 10 challenges: the eight families of generator version 3 (`compare`, `xor`, `checksum`, `table`, `state`, `pairs`, `sbox`, `indirect`) in `x64-O2-strip`, plus `checksum` and `state` again in `x86-O2-strip`, the two families where the pilots showed the conditions apart. Every family stays in the set, so the result describes the whole range of small static crackmes and not only the hardest ones.
- Repetitions: 3 per challenge for A and B, and 1 for C, so 70 runs in all. In pilot 1 the agent never loaded the skill when it was offered (0 of 5), so C mostly repeats B; one repetition is enough to report how often the skill is picked up.
- Order: shuffled with order seed 20261012, so conditions spread over time of day and over any service changes.
- Fixed per study: Claude Code 2.1.296, `claude-sonnet-5-5` with medium effort, rea 6.4.0 (6.5.0 was not published yet when this was frozen), Ghidra 12.1.4 and Temurin 21.0.12.1. The harness refuses to resume a study if any of them changes.
- Limits per run: 20 minutes of wall time and an equivalent cost cap of 5 USD. A run that hits either limit counts as not solved.

## Outcomes

| Outcome | Definition |
|---|---|
| Solved (primary) | The challenge oracle accepts the answer's `accepted_input`, with the lenient parse |
| Mechanism | `check_mechanism` matches the family; for `compare`, `xor` and `table` built with `-O2`, `string_compare` also counts, because the compiler can fold their check into a comparison with constants |
| Strict manifest | The final message is exactly one manifest with rea's shape |
| Classifier stops | Responses cut off by the model's safety classifier (Claude Code's `safety_stops`); in pilot 1 they hit 9 of the 10 runs with rea and 1 of the 5 without it |
| Refused | The run ended without an answer after a safety refusal or a classifier stop |
| Citations | In B and C: cited `evidence_id` values that authenticate against Evidence delivered in the run, and those about the target's SHA-256 |
| rea usage | rea's own metrics: rea used, first call `open_binary`, session opened and closed, repeated calls, input validation failures, skill loaded |
| Cost | Wall time, turns, input and output tokens, equivalent cost |

## Analysis

- Solve rate per condition with a Wilson 95 % interval.
- H1: exact McNemar on the A and B pairs, matched by challenge, variant and repetition (30 pairs).
- B against C and A against C: the same test on the single C repetition, reported as exploratory, without a correction because they are not confirmatory.
- Sensitivity: repetitions of one challenge are not independent, so H1 is also tested with one pair per challenge (solved in at least 2 of 3 repetitions), 10 pairs.
- With 30 pairs only large effects can be detected. A non-significant result is reported as "no large effect detected", never as "no effect".

## Exclusions and reruns

- Infrastructure failures (the session ends with `terminal_reason` other than a normal finish, for example `api_error`, before any tool call) are rerun up to twice; the attempts are kept in the raw data.
- A run whose isolation check fails (plugins loaded, unexpected MCP server, skill present or missing against its condition) is a harness fault: the fault is fixed and the run is repeated.
- A run flagged for paths outside its work folder is reviewed by hand. If it read anything that reveals the answer, it is excluded and reported as excluded; otherwise it stays.
- Timeouts, budget stops, refusals, wrong answers and missing answers are not excluded: they count as not solved. Refusals are also reported apart, per condition, because other benchmarks have seen models refuse reverse engineering tasks.

## Pilot (before freezing)

Four pilots on the public set, 35 runs, none of them part of the study:

| Pilot | Runs | What it showed |
|---|---|---|
| 1 | Five families, `x64-O2-strip`, A, B and C | Isolation holds and rea delivers authenticated Evidence; the safety classifier stops most runs with rea; the skill is never loaded; `-O2` folds `xor` and `table` into plain comparisons |
| 2 | Four families, `x86-O0-strip`, A and B | `-O0` does not make the challenges harder |
| 3 | Three new families (`pairs`, `sbox`, `indirect`), A and B | `-O2` also folds const lookup tables; a denied `awk` made an agent stop instead of analysing |
| 3b | The same three, after the fixes, A and B | Writable tables keep the lookups; with common text filters allowed, no agent stops on a denied filter |

Across all of them, A solved 11 of 15 runs and B 15 of 15; the classifier stopped 2 of the 15 A runs and 14 of the 15 B runs. These numbers set the design above and are not evidence for H1.

Decisions fixed by the pilots: Claude Code 2.1.296, `claude-sonnet-5-5` with medium effort, the limits above, and the allow list of `bench/conditions.ts` (the four LLVM tools plus `grep`, `head`, `tail`, `wc`, `awk`, `sed`, `cut`, `tr`, `sort`, `uniq` and `od`, with no interpreter; any command that tries to run a program is flagged for review).

## Command

The study runs exactly as follows, from a clean checkout of the freezing commit, with the held-out set built from its seed into a folder outside the repository:

```powershell
node bench/run.ts --study study-1 --model claude-sonnet-5-5 --effort medium --set <held-out set folder> --order-seed 20261012 --repetitions A=3,B=3,C=1 --cells c01-compare:x64-O2-strip,c02-xor:x64-O2-strip,c03-checksum:x64-O2-strip,c04-table:x64-O2-strip,c05-state:x64-O2-strip,c06-pairs:x64-O2-strip,c07-sbox:x64-O2-strip,c08-indirect:x64-O2-strip,c03-checksum:x86-O2-strip,c05-state:x86-O2-strip
node bench/report.ts --study study-1
```

## Held-out set

| Field | Value |
|---|---|
| Manifest SHA-256 | `40bd49f3da9790303312ae9fb026f19b67e54bc206cf73982fa764ea47d8fdda` |
| Seed | published with the report |
| Generator version | 3 |

## Deviations

None yet.
