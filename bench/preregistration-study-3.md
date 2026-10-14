# Study 3 preregistration

Status: **frozen** on 14 October 2026, in the commit that adds this line, after four pilots and before the first study run. Any later change is listed under Deviations in the study report.

## Question

Studies 1 and 2 asked for one input that a synthetic crackme accepts. In study 1 rea changed nothing (28 of 30 with and without it); in study 2 command-line tools alone solved 11 of 24 and rea 4 of 24 (p = 0.092), and most failures were a check that was found but could not be inverted without computing. Both writeups name the next step: tasks whose answer is an analysis, on software closer to the real thing. Study 3 asks where a described function or table lives in real open-source programs compiled here without symbols ([ADR 0024](../docs/adr/0024-real-software-tasks.md)). Only the kind of software and question changes: the tools, the model, the limits and the ban on interpreters stay as in study 2.

| Id | Question | Kind |
|---|---|---|
| RQ1 | In real open-source programs compiled here without symbols, does rea (B) locate the asked function or table more often than command-line tools alone (A)? | confirmatory |
| RQ2 | How do time, turns, tokens and equivalent cost compare between A and B on these programs? In studies 1 and 2, B cost about twice as much | descriptive |
| RQ3 | When the agent cites rea Evidence, can every citation be verified, and does the answered address appear in the cited Evidence? | descriptive |
| RQ4 | How do the results vary by question family and by program, and does the agent name the target as the source does? | exploratory |

## Hypotheses

- H1 (RQ1): the rate of correct answers differs between A and B. Two-sided exact McNemar test on paired runs, matched by task and repetition, alpha 0.05, leaving out the `string` control family. No direction is assumed.
- RQ2 to RQ4 have no hypothesis test. They are reported with intervals and counts, and any pattern found there is a lead for a later study, not a result.

## Design

- Within-task, paired: every task runs under A and B with the same model, effort, prompt structure and limits ([ADR 0018](../docs/adr/0018-benchmark-isolation.md)).
- Targets: four open-source C programs whose repositories were created after the model's training data (October 2026, or September for flint), so it cannot know their code: SGIEmu (an SGI Indy emulator with a MIPS interpreter, a MIPS to x86-64 translator and a Win32 front end), c5xtools (the assembler of a TMS320C5x DSP toolchain), moppe-emu (an emulator of old Nokia radios, its r58emu command-line program) and flint (a scripting language with a bytecode virtual machine). Pilots 1 to 3 showed that with well-known programs (zlib, Lua, md4c) the model locates functions from memory of the source. The source archives are pinned in [`sources.json`](../sources.json), built by [`challenges/real.mjs`](../challenges/real.mjs) (build version 1) with llvm-mingw for x64 at `-O2`, static, one section per function and per data object, no identical-code folding, then stripped. The targets take 48 to 329 KB. Each build is reproducible, and the target keeps every non-debug byte of the full build, so the full build's map gives the ground truth.
- Tasks: 24, six per program, one question per run, answered with the virtual address where a function or table starts:
  - `string` (one per program): the only function that references a given string, with a fixed wording. It is a control: it measures whether the setup works and is left out of H1;
  - `behaviour` (three): a function described by its purpose, with no direct string reference and an address that is never taken;
  - `chain` (one): the only direct caller of a function that is described by its purpose, so the answer takes two steps;
  - `data` (one): a table of numbers, without pointers, described by its purpose.
- The validator lists, per program and family, only targets that are unambiguous in the binary (not inlined anywhere, no identical twin, no duplicate name, no thunk, no toolchain code). A private seed orders those candidates and the first ones are taken, with one task at most per function or table in each program. A family with fewer candidates than tasks in a program gives the missing tasks to `behaviour` (c5xtools has no numeric table, so it has four behaviour tasks and no data task), and a family with exactly as many candidates as tasks is taken whole (SGIEmu and flint have one numeric table each). The author wrote every question but the control from the source, stating a purpose and never an implementation detail (constants, instruction names, library calls) or an identifier. The task file's SHA-256 is recorded below; the tasks, the ground truth and the seed are published with the report.
- Repetitions: 3 per task and condition, so 144 runs in all (72 pairs, 60 for H1). The draft planned 2; after pilot 4 left command-line tools above the calibration target, a third repetition adds discordant pairs where the two conditions differ.
- Order: shuffled with an order seed recorded below, so conditions spread over time of day and over any service changes.
- Fixed per study: Claude Code 2.1.296, `claude-sonnet-5-5` with medium effort, rea 6.4.0, Ghidra 12.1.4, Temurin 21.0.12.1 and llvm-mingw 20261006. The harness refuses to resume a study if any of them changes, or if the task answers change.
- Limits per run: 30 minutes of wall time and an equivalent cost cap of 5 USD. A run that hits either limit counts as not correct.
- Scratch files and unattended runs as in study 2. In addition, a run may read the files where Claude Code saves tool results too large to return inline ([ADR 0018](../docs/adr/0018-benchmark-isolation.md), amended for study 3); in study 2 those reads were denied.

## Outcomes

| Outcome | Definition |
|---|---|
| Correct (primary) | `answer_address` falls inside the target's range in the full build's map. An address given relative to the image base counts and is flagged |
| Exact start | `answer_address` is exactly where the target starts |
| Source name | `source_name` is the target's name in the source |
| Strict manifest | The final message is exactly one manifest with rea's shape |
| Classifier stops | Responses cut off by the model's safety classifier (Claude Code's `safety_stops`) |
| Refused | The run ended without an answer after a safety refusal or a classifier stop |
| Citations | In B: cited `evidence_id` values that authenticate against Evidence delivered in the run, and those about the target's SHA-256 |
| Address in the cited Evidence | In B: the answered address appears in the result of the authenticated Evidence that `answer_address` cites |
| rea usage | rea's own metrics, including input validation failures |
| Cost | Wall time, turns, input and output tokens, equivalent cost |

## Analysis

- Rate of correct answers per condition with a Wilson 95 % interval, overall, per family and per program.
- H1: exact McNemar on the A and B pairs, matched by task and repetition, without the `string` control.
- Sensitivity: one pair per task, where a condition counts as right when it was right in at least 2 of its 3 repetitions, without the control.
- The four programs are clusters: the per-program table is descriptive, and the report says how far one program drives the result.
- With 60 pairs only large effects can be detected, and the calibration target was not reached: after four pilots, command-line tools alone answered 7 of 8 pilot tasks on programs the model had never seen, so most pairs may agree. The report gives the number of discordant pairs. A non-significant result is reported as "no large effect detected", never as "no effect".

## Exclusions and reruns

As in studies 1 and 2: infrastructure failures before any tool call are rerun up to twice, isolation faults are fixed and the run repeated, runs flagged for paths outside the run folder are reviewed by hand, and timeouts, budget stops, refusals, wrong answers and missing answers count as not correct.

## Pilots (before freezing)

Pilots 1 and 2 ran on zlib 1.3.2 (minigzip), with the six public tasks of [`challenges/real-tasks-pilot.json`](../challenges/real-tasks-pilot.json); pilot 3 ran on two study programs with public tasks that share no target with the study. None of them is part of the study:

| Pilot | Runs | What it showed |
|---|---|---|
| 1 | Task file version 1 (one `string`, two `behaviour`, two string-anchored `caller` and one `data` task), A and B, 1 repetition | Both conditions answered all 6, every one at the exact start: A in a median of about 20 s and 0.05 USD, B in about 60 s and 0.10 to 0.29 USD. A is far above the 30-70 % calibration target. The behaviour questions gave implementation details (a one's complement, a buffer filled with zeros) that A found with one search, and the caller and data tasks were reachable from a string or a well-known table. Reading Claude Code's saved tool results worked (one Read and several Grep calls on saved rea results, no denial). Version 2 states purposes only, replaces the caller family with a two-step chain from a described function and keeps numeric tables only |
| 2 | Task file version 2, A and B, 1 repetition | A answered 5 of 6 (83 %, Wilson 44-97 %) and B 6 of 6: A in a median of about 29 s and 0.07 USD, B in about 55 s and 0.23 USD. A missed only the data task, after a denied Python script, with a relative address outside the table. Purpose-only questions slowed A a little but zlib stays easy: it is small and its source is well known, so a description of purpose still points at a function the model knows. A is still above the calibration target |
| 3 | Six public tasks on two study programs, drawn with seed 20261015 from the version 2 candidates without any study target or described function ([`real-tasks-pilot-3.json`](../challenges/real-tasks-pilot-3.json)): one behaviour, one chain and one data task each on Lua and md4c, A and B, 1 repetition | Both conditions answered all 6, every one at the exact start: A in a median of about 18 s (13 to 108 s) and 0.05 USD, B in about 78 s and 0.16 USD. A finds known open-source code in a stripped static binary from a description of purpose about as fast as with zlib, often by searching for a structure size or constant it remembers from the source. Locating code in well-known programs is at the ceiling for both conditions with this model |
| 4 | Task file version 3: eight public tasks on the four study programs, one behaviour and one chain task each, drawn with seed 20261016 without any study target or described function ([`real-tasks-pilot-4.json`](../challenges/real-tasks-pilot-4.json)), A and B, 1 repetition | A answered 7 of 8 (88 %, Wilson 53-98 %) and B 8 of 8, every correct answer at the exact start: A in a median of about 45 s and 0.17 USD, B in about 86 s and 0.28 USD. No source name was right in either condition (0 of 16, against most of them in the earlier pilots), so the model did not know these programs; A read the disassembly instead. A missed one behaviour task in SGIEmu, the largest program, with the start of a neighbouring function of its code translator. No classifier stop, no flagged run. A is still above the calibration target, now without memory of the source |

## Command

The study runs exactly as follows, from a clean checkout of the freezing commit, with the private task file resolved into a build folder:

```powershell
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <build folder>
node challenges/real-tasks.mjs resolve <private task file> --build <build folder>
node bench/run.ts --study study-3 --model claude-sonnet-5-5 --effort medium --set <build folder> --conditions A,B --repetitions 3 --order-seed 20261017 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-3
```

## Held-out tasks

| Field | Value |
|---|---|
| Task file SHA-256 | `ae8175807a521028d82984b668ab49bf3e4a42f7a28ddd6dae09af8c2bcd21aa` |
| Build manifest SHA-256 | `996a69f7b215aca561936617a206000226a4a723d89059b47f62ef895b3789eb` |
| Seed of the target draw | published with the report |
| Order seed | 20261017 |
| Task file version | 3 |

## Deviations

None yet.
