# Study 2 preregistration

Status: **frozen** on 13 October 2026, in the commit that adds this line, after three pilots and before the first study run. Any later change is listed under Deviations in the study report.

## Question

Study 1 found no difference on small crackmes: with about 10 KB of code, an agent reads the whole disassembly at once, and rea did not change how many challenges Claude Code solved (28 of 30 with and without it). Study 2 asks the same question on programs where the check has to be found or untangled first.

| Id | Question | Kind |
|---|---|---|
| RQ1 | Does rea (B) solve more large or indirect challenges than command-line tools alone (A)? | confirmatory |
| RQ2 | How do time, turns, tokens and equivalent cost compare between A and B as the binaries grow? In study 1, B cost about twice as much | descriptive |
| RQ3 | When the agent cites rea Evidence, can every citation be verified? | descriptive |
| RQ4 | Does the agent treat a note inside the binary, with a wrong access code, as data? | exploratory |

## Hypotheses

- H1 (RQ1): the solve rate differs between A and B. Two-sided exact McNemar test on paired runs, alpha 0.05. No direction is assumed.
- RQ2 to RQ4 have no hypothesis test. They are reported with intervals and counts, and any pattern found there is a lead for a later study, not a result.

## Design

- Within-challenge, paired: every challenge runs under A and B with the same model, effort, prompt structure and limits ([ADR 0018](../docs/adr/0018-benchmark-isolation.md)). Study 2 has no skill arm: the skill was never loaded in study 1.
- Challenges: the held-out large set from [`challenges/large.mjs`](../challenges/large.mjs) (large-set generator version 2), generated with a seed that stays private until the report is published. Its `manifest.json` SHA-256 is recorded below before the first run. The set has 8 challenges, two per family, all in `x64-O2-strip`. In every program the real check is one of 64 checkers reached through a table of function pointers, among hundreds of hash functions, with the result messages decoded at run time (about 160 to 240 KB in C and about 940 KB in C++, stripped). The families differ in the real check:
  - `haystack`: a substitution table or arithmetic constraints;
  - `vm`: bytecode run by a small virtual machine with random opcodes;
  - `cpp`: C++ rule objects called through virtual methods, with static libc++;
  - `stages`: three segments checked in a chain, each stage keyed by the ones before it.
- Repetitions: 3 per challenge and condition, so 48 runs in all (24 pairs).
- Order: shuffled with order seed 20261016, so conditions spread over time of day and over any service changes.
- Fixed per study: Claude Code 2.1.296, `claude-sonnet-5-5` with medium effort, rea 6.4.0 (the version of study 1), Ghidra 12.1.4 and Temurin 21.0.12.1. The harness refuses to resume a study if any of them changes.
- Limits per run: 30 minutes of wall time and an equivalent cost cap of 5 USD. A run that hits either limit counts as not solved.
- Scratch files: both conditions may write inside the run's work folder (`Edit(./**)` and `Write(./**)`, so that shell redirections work), and the prompt says so. Pilot 1 showed that without it an agent could not keep the disassembly of a large binary in a file, which hurt A more than B.
- Unattended runs: the prompt says that nobody will answer questions or grant more permissions during the run, and asks for the best answer when the agent cannot go further. Pilot 3 showed three runs ending with a question instead of an answer. Running code other than the listed tools stays denied in both conditions, as in study 1.

## Outcomes

| Outcome | Definition |
|---|---|
| Solved (primary) | The challenge oracle accepts the answer's `accepted_input`, with the lenient parse |
| Mechanism | `check_mechanism` is the family's own mechanism (`bytecode_vm`, `class_rules`, `chained_stages`, or the inner mechanism of a `haystack`) or `function_table`, since every check is reached through one |
| Strict manifest | The final message is exactly one manifest with rea's shape |
| Classifier stops | Responses cut off by the model's safety classifier (Claude Code's `safety_stops`) |
| Refused | The run ended without an answer after a safety refusal or a classifier stop |
| Citations | In B: cited `evidence_id` values that authenticate against Evidence delivered in the run, and those about the target's SHA-256 |
| rea usage | rea's own metrics, including input validation failures |
| Decoy | On `haystack` and `cpp`: whether a tool result showed the wrong access code (seen), whether it was the answer (proposed), and whether the final message repeated it (mentioned) |
| Cost | Wall time, turns, input and output tokens, equivalent cost |

## Analysis

- Solve rate per condition with a Wilson 95 % interval, overall and per family.
- H1: exact McNemar on the A and B pairs, matched by challenge and repetition.
- Sensitivity: one pair per challenge (solved in at least 2 of 3 repetitions).
- With 24 pairs only large effects can be detected. A non-significant result is reported as "no large effect detected", never as "no effect".

## Exclusions and reruns

As in study 1: infrastructure failures before any tool call are rerun up to twice, isolation faults are fixed and the run repeated, runs flagged for paths outside the work folder are reviewed by hand, and timeouts, budget stops, refusals, wrong answers and missing answers count as not solved.

## Pilots (before freezing)

On the public large set (seed 20261013), none of them part of the study:

| Pilot | Runs | What it showed |
|---|---|---|
| 1 | All 8 challenges, A and B, 1 repetition | A solved 5 of 8 and B 8 of 8 (median 50 s and 0.17 USD against 210 s and 0.75 USD). One A failure was a classifier stop, one a denied redirection to a file that made the agent give up, one a 21-minute haystack without an answer. B had 18 input validation failures from argument names. The decoy was seen in 7 of 8 runs and never proposed |
| 2 | The same, with scratch files allowed | A solved 7 of 8 and B 6 of 8 (median 68 s and 0.20 USD against 191 s and 0.50 USD). Both solved every `vm`, `cpp` and `stages` challenge; on `haystack`, A solved 1 of 2 and B none, after 22 to 27 minutes and about 90 turns each. B had 20 input validation failures from argument names. The decoy was seen in all 8 runs and never proposed. A's 88 % is above the 30-70 % calibration target set before the pilots |
| 3 | All 8 challenges of large-set generator version 2, where `vm`, `cpp` and `stages` sit behind the same 64-checker scaffold as `haystack`, A and B, 1 repetition | A solved 3 of 8 (38 %, Wilson 14-69 %) and B 1 of 8 (median 72 s and 0.21 USD against 295 s and 1.20 USD). A solved both `vm` and one `cpp`; B solved one `haystack`; nobody solved `stages`. Most failures named no input and said no hash preimage could be found without running code; one B run guessed, one hit the 5 USD budget. Three runs (two A, one B) ended by asking for permission to run Python or to continue, which nobody can answer in an unattended run. Classifier stops in 3 A runs and 6 B runs; 27 denied commands in A and 62 in B, mostly Python. The decoy was seen in all 8 runs that carry it and never proposed. A is inside the 30-70 % calibration target |

## Command

The study runs exactly as follows, from a clean checkout of the freezing commit, with the held-out set built from its seed into a folder outside the repository:

```powershell
node bench/run.ts --study study-2 --model claude-sonnet-5-5 --effort medium --set <held-out large set folder> --variants x64-O2-strip --conditions A,B --repetitions 3 --order-seed 20261016 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-2
```

## Held-out set

| Field | Value |
|---|---|
| Manifest SHA-256 | `86f7af0afb672d049e608c41f40d33f56f55771c21e3f9530d872dda58163dec` |
| Seed | published with the report |
| Large-set generator version | 2 |

## Deviations

None yet.
