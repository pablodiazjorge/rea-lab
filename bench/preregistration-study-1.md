# Study 1 preregistration

Status: **draft**. It is frozen, with the commit hash and date recorded here, after the pilot and before the first study run. Any later change is listed under Deviations in the study report.

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

- Within-challenge, paired: every challenge runs under A, B and C, with the same model, effort, prompt structure and limits ([ADR 0018](../docs/adr/0018-benchmark-isolation.md)).
- Challenges: the held-out set, generated with a seed that stays private until the report is published. Its `manifest.json` SHA-256 is recorded below before the first run. Five families (compare, xor, checksum, table, state), each in two variants, `x64-O2-strip` and `x86-O2-strip`: 10 challenges.
- Repetitions: 3 per challenge and condition, so 90 runs in all.
- Order: shuffled with a recorded order seed, so conditions spread over time of day and over any service changes.
- Fixed per study: Claude Code version, model, effort, rea 6.4.0 and Ghidra 12.1.4. The harness refuses to resume a study if any of them changes.
- Limits per run: 20 minutes of wall time and an equivalent cost cap of 5 USD. A run that hits either limit counts as not solved.

## Outcomes

| Outcome | Definition |
|---|---|
| Solved (primary) | The challenge oracle accepts the answer's `accepted_input`, with the lenient parse |
| Mechanism | `check_mechanism` matches the family |
| Strict manifest | The final message is exactly one manifest with rea's shape |
| Refused | The model stopped with a safety refusal (`stop_reason` "refusal") at least once |
| Citations | In B and C: cited `evidence_id` values that authenticate against Evidence delivered in the run, and those about the target's SHA-256 |
| rea usage | rea's own metrics: rea used, first call `open_binary`, session opened and closed, repeated calls, input validation failures, skill loaded |
| Cost | Wall time, turns, input and output tokens, equivalent cost |

## Analysis

- Solve rate per condition with a Wilson 95 % interval.
- H1: exact McNemar on the A and B pairs, matched by challenge, variant and repetition (30 pairs).
- B against C and A against C: the same test, reported as exploratory, without a correction because they are not confirmatory.
- Sensitivity: repetitions of one challenge are not independent, so H1 is also tested with one pair per challenge (solved in at least 2 of 3 repetitions), 10 pairs.
- With 30 pairs only large effects can be detected. A non-significant result is reported as "no large effect detected", never as "no effect".

## Exclusions and reruns

- Infrastructure failures (the session ends with `terminal_reason` other than a normal finish, for example `api_error`, before any tool call) are rerun up to twice; the attempts are kept in the raw data.
- A run whose isolation check fails (plugins loaded, unexpected MCP server, skill present or missing against its condition) is a harness fault: the fault is fixed and the run is repeated.
- A run flagged for paths outside its work folder is reviewed by hand. If it read anything that reveals the answer, it is excluded and reported as excluded; otherwise it stays.
- Timeouts, budget stops, refusals, wrong answers and missing answers are not excluded: they count as not solved. Refusals are also reported apart, per condition, because other benchmarks have seen models refuse reverse engineering tasks.

## Pilot (before freezing)

On the public set: the five families in `x64-O2-strip`, one repetition per condition, 15 runs. It checks that isolation holds, that rea connects and delivers Evidence in Claude Code's transcripts, and how long and how much a run takes. The model and the limits above are fixed from it. Pilot runs are not part of the study.

## Held-out set

| Field | Value |
|---|---|
| Manifest SHA-256 | recorded before the first study run |
| Seed | published with the report |
| Generator version | 2 |

## Deviations

None yet.
