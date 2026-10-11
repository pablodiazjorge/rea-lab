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

- Within-challenge, paired: every challenge runs under A and B, the confirmatory comparison, and under C as an exploratory arm, with the same model, effort, prompt structure and limits ([ADR 0018](../docs/adr/0018-benchmark-isolation.md)).
- Challenges: the held-out set, generated with a seed that stays private until the report is published. Its `manifest.json` SHA-256 is recorded below before the first run. Only challenges that can tell the conditions apart: in pilot 1 every condition solved `compare`, and the `-O2` builds of `xor` and `table`, because the compiler leaves their constants in view. The set is 10 challenges: `checksum` and `state` in `x64-O2-strip` and `x86-O0-strip`, `xor` and `table` in `x64-O0-strip` and `x86-O0-strip`, and one new, harder family if pilot 2 shows that this set still sits at the ceiling.
- Repetitions: 3 per challenge for A and B, and 1 for C, so 70 runs in all. In pilot 1 the agent never loaded the skill when it was offered (0 of 5), so C mostly repeats B; one repetition is enough to report how often the skill is picked up.
- Order: shuffled with a recorded order seed, so conditions spread over time of day and over any service changes.
- Fixed per study: Claude Code 2.1.296, model, effort, the rea version (6.4.0, or 6.5.0 if it is published before freezing, upgraded in a separate change as ADR 0005 requires) and Ghidra 12.1.4. The harness refuses to resume a study if any of them changes.
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

On the public set: the five families in `x64-O2-strip`, one repetition per condition, 15 runs. It checks that isolation holds, that rea connects and delivers Evidence in Claude Code's transcripts, and how long and how much a run takes. The model and the limits above are fixed from it. Pilot runs are not part of the study.

## Held-out set

| Field | Value |
|---|---|
| Manifest SHA-256 | recorded before the first study run |
| Seed | published with the report |
| Generator version | 2 |

## Deviations

None yet.
