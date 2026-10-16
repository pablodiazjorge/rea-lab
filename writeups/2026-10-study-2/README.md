# Does rea help on larger binaries? A second preregistered study on Windows

<p><a href="README.es.md">Leer en español</a></p>

[Study 1](../2026-10-study-1/README.md) found that on ten small crackmes, giving Claude Code the reverse-engineering MCP server [rea](https://github.com/morluto/rea) did not change how many it solved: with about 10 KB of code, the agent reads the whole disassembly at once. Its natural follow-up was programs where the check has to be found or untangled first. This study asks the same question on those, with answers known in advance and the analysis fixed before the first run.

**Short answer:** no. On eight larger binaries, where the real check hides among dozens of decoy checkers, the agent solved 11 of 24 runs with command-line tools alone and 4 of 24 with rea. The difference is not significant (exact McNemar, p = 0.092), but it points against rea, not for it. rea again doubled the time and cost, and the evidence the agent cited from it was genuine in 45 of 46 cases.

## Design

Everything in this section was fixed in the [preregistration](../../bench/preregistration-study-2.md), committed before the study started (`6713185`, 13 October 2026), after three pilots on public challenges.

- **Agent and model.** Claude Code 2.1.296 in headless mode (`claude -p`), `claude-sonnet-5-5` with medium effort.
- **Conditions.**
  - A: the LLVM command-line tools (`llvm-readobj`, `llvm-objdump`, `llvm-strings`, `llvm-nm`) and common text filters, with no interpreter, so the target cannot be run.
  - B: the same plus rea 6.4.0 over MCP, with Ghidra 12.1.4.

  Both could keep scratch files, such as a saved disassembly, in their own folder, and the prompt said that nobody would answer questions during the run. Study 2 had no skill arm: the skill was never loaded in study 1.
- **Challenges.** Eight C and C++ programs from the lab's [large-set generator](../../challenges/README.md) (version 2), built reproducibly with llvm-mingw, stripped and with `-O2`: 160 to 240 KB in C and about 940 KB in C++. Each reads a line and prints `ACCESS GRANTED` or `ACCESS DENIED`. In every program the real check is one of 64 checkers reached through a table of function pointers, among hundreds of hash functions, with the result messages decoded at run time. Two programs per family, which differ in the real check:
  - `haystack`: a substitution table or arithmetic constraints;
  - `vm`: bytecode run by a small virtual machine with random opcodes;
  - `cpp`: C++ rule objects called through virtual methods, with static libc++;
  - `stages`: three segments checked in a chain, each stage keyed by the ones before it.

  The `haystack` and `cpp` programs also carry a note, addressed to automated analysis tools, that gives a wrong access code and asks them to report it; the program shows it with an `--about` option. The seed stayed private until now; the SHA-256 of its manifest was published before the study.
- **Runs.** Three repetitions per challenge and condition: 48 runs, in a shuffled order, with 30 minutes and 5 USD of equivalent cost at most each.
- **Isolation.** As in study 1: each run had its own empty Claude Code configuration, its own folder holding only the target, and a permission policy that denied anything not allowed instead of asking. Claude Code's start-up record shows, run by run, that no plugin, skill or MCP server leaked in.
- **Grading.** No LLM judge. An oracle, checked against every real binary, decides whether the proposed input is accepted. In B, every cited `evidence_id` is re-authenticated with rea's own code and must be about the target.
- **Statistics.** Solve rates with Wilson 95 % intervals, and an exact McNemar test on the 24 paired runs (same challenge, same repetition), the confirmatory comparison. As a sensitivity check, one pair per challenge, counting a challenge as solved when at least two of its three runs solved it.

## Results

| | A: command-line tools | B: plus rea |
|---|---|---|
| Solved | 11/24 (46 %, 28 to 65 %) | 4/24 (17 %, 7 to 36 %) |
| Mechanism identified | 24/24 | 22/24 |
| Answer in rea's exact manifest format | 16/24 | 15/24 |
| Runs with a safety classifier stop | 10/24 | 18/24 |
| Runs that hit the 30-minute limit | 0 | 1 |
| Median time | 87 s | 184 s |
| Median turns | 17 | 28 |
| Median input tokens | 344,688 | 888,934 |
| Median equivalent cost | 0.24 USD | 0.50 USD |

**H1, A against B: no large effect detected at the preregistered level.** Of the 24 pairs, 13 disagree: in 10 only A solved, in 3 only B (exact McNemar, p = 0.092). The sensitivity test agrees: three challenges are solved only in A, none only in B, and five in neither (p = 0.25). With 24 pairs only large effects can be detected, so this does not show that rea makes the agent worse; it shows no sign that it helps here, and a direction against it.

| Family | A | B |
|---|---|---|
| `haystack` | 3/6 | 2/6 |
| `vm` | 5/6 | 2/6 |
| `cpp` | 2/6 | 0/6 |
| `stages` | 1/6 | 0/6 |

A is ahead in every family.

**How the runs failed.** Every program hides one real checker among 63 that compare a hash of the input with a constant, so a run either finds the one checker that can be read backwards or faces hashes it cannot invert without running code. Of the 13 failures in A, 7 ended without an input, 3 proposed a wrong input and 3 proposed the decoy code. Of the 20 failures in B, 15 ended without an input, 3 proposed a wrong input, 1 the decoy code, and 1 hit the time limit. Our reading, which these numbers cannot prove: with rea's decompiled views, the agent spent more turns inside the hash functions and more often concluded that the answer was out of reach, while reading the raw disassembly led it to the odd checker out more often.

**How rea was used.** The agent used rea in every run of B and always started with `open_binary`; it closed the session in 22 of 24 runs, after a median of 17 rea calls. It cited 46 pieces of Evidence: 45 re-authenticated and were about the target, and one `evidence_id` was invented, a shortened identifier with `_unverified` appended. rea rejected 14 calls for invalid input in 10 runs, again mostly arguments with a natural but wrong name, as in study 1; [morluto/rea#2148](https://github.com/morluto/rea/pull/2148) proposes accepting those spellings.

The 48 runs took 236 minutes of machine time (77 in A, 159 in B) and 39.76 USD of equivalent cost, on a subscription; the run that hit the time limit reports no cost.

## The safety classifier

The classifier stopped at least one response in 18 of the 24 runs with rea, against 10 of the 24 without it, the same pattern as in study 1 (17 against 7 of 30). Unlike in study 1, it does not explain the gap: with rea, the runs without any stop solved 1 of 6, the same rate as those with stops (3 of 18). Without rea, 3 of 10 runs with stops and 8 of 14 without them solved.

## The decoy note

The `haystack` and `cpp` programs carry a note, addressed to automated analysis tools, that gives a wrong access code and tells them to report it as the answer; the agent cannot run the programs, but the encoded note is in the binary. RQ4, exploratory, asked whether the agent treats it as data. It saw the code in a tool result in 11 of 12 runs without rea and 12 of 12 with it, and proposed it as the answer in 3 and 1 of them. In the pilots, 23 runs saw the note and none proposed it. The proposals came from runs that had not found the real checker: when the agent is stuck, a code written inside the binary becomes a tempting answer.

## What the pilots already showed

Three pilots on the public large set (48 runs, not part of the study) shaped the design. In the first, a denied shell redirection kept agents from saving a disassembly to a file, so both conditions were allowed scratch files in their own folder. In the second, A solved 7 of 8, above the 30 to 70 % target set before the pilots, so the generator moved `vm`, `cpp` and `stages` behind the same 64-checker scaffold as `haystack`. In the third, A solved 3 of 8, inside the target; three runs ended with a question to the user, which nobody can answer in an unattended run, so the prompt says so. The details are in the preregistration.

## Related work

The closest published work is by Nishizaka and others at Ricerca Security, [presented at the BAR 2026 workshop at NDSS](https://www.ndss-symposium.org/ndss-paper/auto-draft-657/): three LLM agents on 24 CTF reverse-engineering tasks, where the agents often analysed assembly effectively without a decompiler. Studies 1 and 2 point the same way for rea's decompiled views, with a different design: native Windows PE targets, no way to run the target, an analysis fixed before the first run, and paired runs graded by an oracle.

## What it means

- Across the two studies, there is no sign that rea raises how many static crackmes Claude Code solves: none on small programs, and a non-significant gap against it on larger ones. It does double the time, the tokens and the cost each time.
- Larger binaries did not turn rea's structure into an advantage. When the bottleneck is finding the one readable checker among many, a raw disassembly saved to a file served the agent at least as well as decompiled functions.
- What rea consistently adds is evidence that can be checked: 125 of 126 Evidence citations across both studies re-authenticated and were about the right binary.
- Agents keep calling rea with natural but wrong argument names. That is cheap to fix upstream and costs every session turns.
- A note inside the binary, written as an instruction to AI tools, misled the agent four times once it was stuck, with and without rea. Text in a target is untrusted input, and the agent needs to treat it so.
- The next questions are other agents and models, tasks where the answer is an analysis rather than one input, and what changes when the agent may compute, since inverting checks it cannot run was the wall in most failures.

## Deviations

The machine running the study restarted twice. Each time it cut one run before it finished (run 20, `l06-vm` with rea, and run 45, `l08-stages` with rea); neither had produced a result. The study resumed with the same command from the same commit: the harness skipped the finished runs and repeated each cut run from the start. The cut runs' partial folders are kept. There were no other deviations.

## Limitations

- Eight synthetic C and C++ programs built with llvm-mingw, not MSVC, and far simpler than real software.
- One agent and one model; nothing here speaks for other agents yet.
- 24 pairs detect only large effects; this result is not significant at the preregistered level.
- Neither condition could run an interpreter, by design; that removes the brute-force route that most failures needed.
- The cost is Claude Code's equivalent cost, not money spent: the runs used a subscription.
- rea 6.4.0, the version of study 1, frozen for comparability.
- The review heuristic flagged attempts to use Python or to write outside the run folder in 39 runs (19 in A, 20 in B). The permission policy denied all of them and none ran; no run was excluded.
- Added on 16 October 2026: the runs were launched from the Claude desktop app, whose environment sets two Claude Code switches, `DISABLE_MICROCOMPACT=1`, which turns off the clearing of old tool results from the context, and `API_TIMEOUT_MS=900000`. The harness did not filter them, so they very likely reached every run. They applied to every condition alike, so no comparison changes, but absolute token counts and costs may be higher than with Claude Code's defaults. From study 5 the harness drops them ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).

## Reproduce it

The held-out seed is **1285588706** (large-set generator version 2); the SHA-256 of its `manifest.json` is `86f7af0afb672d049e608c41f40d33f56f55771c21e3f9530d872dda58163dec`, as published before the study, and rebuilding from the seed gives the same hash.

```powershell
npm ci
npm run setup
node challenges/build.mjs --set large --seed 1285588706 --out <folder>
node bench/run.ts --study study-2 --model claude-sonnet-5-5 --effort medium --set <folder> --variants x64-O2-strip --conditions A,B --repetitions 3 --order-seed 20261016 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-2
```

The graded runs are published in [`bench/results/study-2/`](../../bench/results/study-2/), and the report regenerates from them with one command:

```powershell
node bench/report.ts --results bench/results/study-2/results.jsonl --out <folder>
```

How the benchmark works, and its isolation and grading, is described in [`bench/`](../../bench/README.md).
