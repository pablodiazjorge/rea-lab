# What does rea add to a coding agent? A preregistered study on Windows binaries

<p><a href="README.es.md">Leer en español</a></p>

[rea](https://github.com/morluto/rea) gives coding agents MCP tools for reverse engineering, with Ghidra underneath and Evidence records that anyone can re-authenticate. The obvious question about any such tool is a simple one: what does it add over letting the agent use ordinary command-line tools? This study measures exactly that on native Windows binaries, with answers known in advance and an analysis fixed before the first run.

**Short answer:** on ten small crackmes, rea did not change how many the agent solved (28 of 30 with and without it). It made each run about twice as slow and expensive, it made the model's safety classifier stop far more often, and every piece of evidence the agent cited from it was genuine.

## Design

Everything in this section was fixed in the [preregistration](../../bench/preregistration-study-1.md), committed before the study started (`d29c85b`, 12 October 2026). There were no deviations from it.

- **Agent and model.** Claude Code 2.1.296 in headless mode (`claude -p`), `claude-sonnet-5-5` with medium effort.
- **Conditions.**
  - A: the LLVM command-line tools (`llvm-readobj`, `llvm-objdump`, `llvm-strings`, `llvm-nm`) and common text filters, with no interpreter, so the target cannot be run.
  - B: the same plus rea 6.4.0 over MCP, with Ghidra 12.1.4.
  - C: B plus rea's own skill.
- **Challenges.** Ten small C programs from the lab's [seeded generator](../../challenges/README.md), built reproducibly with llvm-mingw, stripped and with `-O2`. Each reads a line and prints `ACCESS GRANTED` or `ACCESS DENIED`. They cover eight families (plain comparison, XOR, weighted checksum, switch table, state machine, arithmetic constraints, substitution table, checks split across function pointers), with `checksum` and `state` also in a 32-bit build. The seed stayed private until now; the SHA-256 of its manifest was published before the study.
- **Runs.** Three repetitions per challenge in A and B, one in C: 70 runs, in a shuffled order.
- **Isolation.** Each run had its own empty Claude Code configuration, its own folder holding only the target, and a permission policy that denied anything not allowed instead of asking. Claude Code's start-up record shows, run by run, that no plugin, skill or MCP server leaked in.
- **Grading.** No LLM judge. An oracle, checked against every real binary, decides whether the proposed input is accepted. In B and C, every cited `evidence_id` is re-authenticated with rea's own code and must be about the target.
- **Statistics.** Solve rates with Wilson 95 % intervals, and an exact McNemar test on paired runs (same challenge, same repetition) for A against B, the confirmatory comparison.

## Results

| | A: command-line tools | B: plus rea | C: plus rea's skill |
|---|---|---|---|
| Solved | 28/30 (93 %, 79 to 98 %) | 28/30 (93 %, 79 to 98 %) | 9/10 (90 %, 60 to 98 %) |
| Mechanism identified | 29/30 | 27/30 | 9/10 |
| Answer in rea's exact manifest format | 25/30 | 28/30 | 9/10 |
| Runs with a safety classifier stop | 7/30 | 17/30 | 6/10 |
| Runs that ended without an answer | 1 | 0 | 0 |
| Median time | 23 s | 54 s | 55 s |
| Median turns | 5 | 11 | 10 |
| Median input tokens | 85,023 | 271,514 | 325,003 |
| Median equivalent cost | 0.10 USD | 0.25 USD | 0.28 USD |

**H1, A against B: no large effect detected.** Of the 30 pairs, only two disagree, one each way (exact McNemar, p = 1). The preregistered sensitivity test, one pair per challenge, finds no disagreement at all. With 30 pairs only large effects can be detected, so this does not show that rea has no effect; it shows that on challenges like these, it does not change the outcome much either way.

| Family | A | B | C |
|---|---|---|---|
| compare, xor, checksum, state, pairs, sbox, indirect | 25/25 | 25/25 | 8/8 |
| table | 1/3 | 1/3 | 0/1 |

Every failure is in one family, `table`, whose characters come from a switch over their position.

**How rea was used.** In B and C, the agent used rea in every run and always started with `open_binary`; it closed the session in 38 of 40 runs. It cited 80 pieces of Evidence, and all 80 re-authenticated and were about the target: not a single invented `evidence_id`. On the other side, rea rejected 22 calls for invalid input (19 in B, 3 in C), mostly arguments with a natural but wrong name: `address` where `procedure_pseudo_code` expects `procedure` (13 calls), and `query` where `search_strings` expects `pattern` (4). The skill offered in C was never loaded.

The 70 runs took 58 minutes of machine time and 15.52 USD of equivalent cost, on a subscription.

## The safety classifier

The model's safety classifier stopped at least one response in 17 of the 30 runs with rea, against 7 of the 30 without it. Claude Code then tells the model its response was stopped and lets it continue once. In almost every case the agent carried on and answered.

The `table` failures with rea follow one pattern. The three failed runs each had two classifier stops, and all three answered the same thing: the right length, made of the first character repeated (`ppppppppppppppp` for `pebble-fjord-86`). The one `table` run with rea that had no stop solved it. Our reading, which three cases cannot prove: the stop removed the response that was decoding the table, and the agent filled in from what it had left. Without rea, one `table` run ended without an answer after a stop, and another swapped the letters of one word (`pebble-ojfrd-86`).

## What the pilots already showed

Four pilots on the public challenges (35 runs, not part of the study) shaped the design. An optimising compiler folds constant lookups into plain comparisons, so `-O2` builds of some families gave the answer away until their tables were made writable. A denied `awk` made an agent stop instead of analysing, so common text filters were allowed. And the skill was never loaded, which is why C got one repetition only. The details are in the preregistration.

## What it means

- For small static crackmes, a strong model with a disassembler already does very well. rea's decompiler and structured views did not raise the solve rate here, and they cost time and tokens.
- What rea did add is evidence that can be checked: every claim the agent backed with rea pointed to a real, re-authenticated record about the right binary.
- The classifier stops much more often when the agent reads decompiled password checks through rea. On these tasks it mostly cost time, but it also explains most of the failures with rea.
- These challenges are far simpler than real software. The interesting question, where rea's structure should matter more, is larger binaries; that is the natural next study.

## Limitations

- Ten small C programs built with llvm-mingw, far simpler than real software, and not MSVC.
- One agent and one model; nothing here speaks for other agents yet.
- 30 pairs detect only large effects.
- The cost is Claude Code's equivalent cost, not money spent: the runs used a subscription.
- rea 6.4.0, frozen before 6.5.0 was published.
- The review heuristic that flags commands trying to run a program caught 23 attempts to use Python or to write outside the run folder. All were denied by the permission policy and none ran; no run was excluded.
- Added on 16 October 2026: the runs were launched from the Claude desktop app, whose environment sets two Claude Code switches, `DISABLE_MICROCOMPACT=1`, which turns off the clearing of old tool results from the context, and `API_TIMEOUT_MS=900000`. The harness did not filter them, so they very likely reached every run. They applied to every condition alike, so no comparison changes, but absolute token counts and costs may be higher than with Claude Code's defaults. From study 5 the harness drops them ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).

## Reproduce it

The held-out seed is **1501550637** (generator version 3); the SHA-256 of its `manifest.json` is `40bd49f3da9790303312ae9fb026f19b67e54bc206cf73982fa764ea47d8fdda`, as published before the study.

```powershell
npm ci
npm run setup
node challenges/build.mjs --seed 1501550637 --out <folder>
node bench/run.ts --study study-1 --model claude-sonnet-5-5 --effort medium --set <folder> --order-seed 20261012 --repetitions A=3,B=3,C=1 --cells c01-compare:x64-O2-strip,c02-xor:x64-O2-strip,c03-checksum:x64-O2-strip,c04-table:x64-O2-strip,c05-state:x64-O2-strip,c06-pairs:x64-O2-strip,c07-sbox:x64-O2-strip,c08-indirect:x64-O2-strip,c03-checksum:x86-O2-strip,c05-state:x86-O2-strip
node bench/report.ts --study study-1
```

The graded runs are published in [`bench/results/study-1/`](../../bench/results/study-1/), and the report regenerates from them with one command:

```powershell
node bench/report.ts --results bench/results/study-1/results.jsonl --out <folder>
```

How the benchmark works, and its isolation and grading, is described in [`bench/`](../../bench/README.md).
