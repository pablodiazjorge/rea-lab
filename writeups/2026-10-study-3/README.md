# Does rea help locate code in real software? A third preregistered study on Windows

<p><a href="README.es.md">Leer en español</a></p>

[Study 1](../2026-10-study-1/README.md) and [study 2](../2026-10-study-2/README.md) asked Claude Code for the input that a synthetic crackme accepts, with and without the reverse-engineering MCP server [rea](https://github.com/morluto/rea). rea changed nothing on small crackmes and fell behind on larger ones, and most failures were a check that was found but could not be inverted without computing. Both writeups named the next step: questions whose answer is an analysis, on software closer to the real thing. This study asks where a described function or table lives in real open-source programs, compiled here without symbols, with the answers known in advance and the analysis fixed before the first run.

**Short answer:** no difference to measure. On four programs the model had never seen, the agent located the asked function or table in 71 of 72 runs with command-line tools alone and in 68 of 72 with rea (exact McNemar, p = 0.375). Both conditions are at the ceiling, so only a large effect could have shown, and none did. rea again cost more than twice as much, and all 144 of its Evidence citations authenticated (142 as first published; see the correction).

## Design

Everything in this section was fixed in the [preregistration](../../bench/preregistration-study-3.md), committed before the study started (`0c9c38d`, 14 October 2026), after four pilots.

- **Agent and model.** Claude Code 2.1.296 in headless mode (`claude -p`), `claude-sonnet-5-5` with medium effort.
- **Conditions.**
  - A: the LLVM command-line tools (`llvm-readobj`, `llvm-objdump`, `llvm-strings`, `llvm-nm`) and common text filters, with no interpreter, so the target cannot be run.
  - B: the same plus rea 6.4.0 over MCP, with Ghidra 12.1.4.

  Both could keep scratch files in their own folder and read the files where Claude Code saves a tool result too large to return inline; in study 2 those reads were denied.
- **Programs.** Four open-source C programs whose repositories were created after the model's training data, so it cannot know their code: SGIEmu (an SGI Indy emulator with a MIPS interpreter, a MIPS to x86-64 translator and a Win32 front end), c5xtools (the assembler of a TMS320C5x DSP toolchain), moppe-emu (an emulator of old Nokia radios) and flint (a scripting language with a bytecode virtual machine). Their source archives are pinned by SHA-256 in [`sources.json`](../../sources.json) and built reproducibly with llvm-mingw for x64 at `-O2`, static, one section per function and per data object, without identical-code folding, then stripped ([ADR 0024](../../docs/adr/0024-real-software-tasks.md)). The targets take 48 to 329 KB. The target keeps every non-debug byte of the full build, so the full build's linker map gives the ground truth.
- **Tasks.** 24, six per program, one question per run, answered with the virtual address where a function or table starts:
  - `string` (one per program): the only function that references a given string. It is a control and stays out of the hypothesis test;
  - `behaviour` (three, four in c5xtools): a function described by its purpose, with no direct string reference and an address that is never taken;
  - `chain` (one): the only direct caller of a function that is described by its purpose, so the answer takes two steps;
  - `data` (one, none in c5xtools, which has no numeric table): a table of numbers, without pointers, described by its purpose.

  A validator lists the targets that are unambiguous in the binary, and a private seed drew them, so the author never chose one. The author wrote every question but the control from the source, stating a purpose and never a constant, an instruction name, a library call or an identifier. The SHA-256 of the task file was published before the study; the tasks, the ground truth and the seed are published now.
- **Runs.** Three repetitions per task and condition: 144 runs, in a shuffled order, with 30 minutes and 5 USD of equivalent cost at most each.
- **Isolation.** As in studies 1 and 2: each run had its own empty Claude Code configuration, its own folder holding only the target, and a permission policy that denied anything not allowed instead of asking.
- **Grading.** No LLM judge. An answer is correct when its address falls inside the target's range in the full build's map; the exact start is reported apart. In B, every cited `evidence_id` is re-authenticated with rea's own code, and the grader checks whether the cited Evidence states the answered address.
- **Statistics.** Rates with Wilson 95 % intervals, and an exact McNemar test on the 60 pairs without the control (same task, same repetition), the confirmatory comparison. As a sensitivity check, one pair per task, counting a task as right when at least two of its three runs were right.

## Results

| | A: command-line tools | B: plus rea |
|---|---|---|
| Correct | 71/72 (99 %, 93 to 100 %) | 68/72 (94 %, 87 to 98 %) |
| Name in the source guessed right | 1/72 | 1/72 |
| Answer in rea's exact manifest format | 68/72 | 71/72 |
| Runs with a safety classifier stop | 0 | 0 |
| Runs that hit the 30-minute limit | 0 | 0 |
| Median time | 27 s | 74 s |
| Median turns | 10 | 14 |
| Median input tokens | 112,967 | 300,695 |
| Median equivalent cost | 0.08 USD | 0.19 USD |

Every correct answer was the exact start of its target.

**H1, A against B: no large effect detected.** Of the 60 pairs without the control, 5 disagree: in 4 only A was right, in 1 only B (exact McNemar, p = 0.375). The sensitivity test agrees: one task is right only in A and none only in B (p = 1). With so few disagreements only a large effect could have been detected, so this shows neither that rea helps nor that it hurts here.

| Family | A | B |
|---|---|---|
| `string` (control) | 12/12 | 12/12 |
| `behaviour` | 39/39 | 36/39 |
| `chain` | 11/12 | 11/12 |
| `data` | 9/9 | 9/9 |

| Program | A | B |
|---|---|---|
| SGIEmu | 18/18 | 17/18 |
| c5xtools | 18/18 | 17/18 |
| moppe-emu | 18/18 | 16/18 |
| flint | 17/18 | 18/18 |

No program drives the result: moppe-emu holds two of the four pairs where only A was right, both from the same task.

**The model did not know these programs.** It guessed the target's name in the source in 1 of 72 runs in each condition, against most of them in the pilots on zlib, Lua and md4c. Without that memory, command-line tools still found the function: the agent saved the disassembly to a file and read it.

**How the runs failed.** Five runs gave an address outside the target, every time inside another function of the same program. Three of the four failures in B answered a function one step away in the call graph: twice in moppe-emu, `io_read` instead of `pit_read`, the described function, which only `io_read` calls; and once in a SGIEmu chain task, `emit_insn` instead of `emit_cop1`, the right answer, which only `emit_insn` calls. The fourth gave `p_and` instead of `pp_rel`, another function of the c5xtools assembler. The one failure in A, a flint chain task, gave `http_request_native` instead of `import_file_native`.

**How rea was used.** The agent used rea in every run of B and always started with `open_binary`; it closed the session in 71 of 72 runs, after a median of 8 rea calls. In 18 runs it read a rea result that Claude Code had saved to a file, the access that study 2 denied. It cited 144 pieces of Evidence, and all 144 authenticated and were about the target. Two of them, one real `evidence_id` cited twice, reached the agent inside one of those saved files; the grader first read only inline results and counted them as unknown, until the correction below. rea rejected 5 calls for invalid input in 4 runs.

**What the citations prove.** RQ3 asked whether the answered address appears in the Evidence that `answer_address` cites. It does in 38 of the 72 runs of B, 37 of them correct. In the rest, the cited Evidence supports the reasoning, such as the function's code or a cross-reference, but does not state the address itself. Reading the saved files, after the correction below, left this number unchanged.

The 144 runs took 149 minutes of machine time (47 in A, 102 in B) and 30.02 USD of equivalent cost, on a subscription.

## The safety classifier

No response was stopped in any of the 144 runs. In study 1 the classifier stopped at least one response in 24 of 60 runs, and in study 2 in 28 of 48. Those studies asked for access codes to crackmes, and study 2 put a note in the binary addressed to AI tools; this one asks where code lives in ordinary programs.

## What the pilots already showed

Four pilots, 52 runs on public tasks, none part of the study, shaped the design. In the first, on zlib, both conditions answered every task, often with one search for an implementation detail named in the question, so the questions now state a purpose only. In the second and third, on zlib and then Lua and md4c, the model located functions of those well-known projects from memory of their source, even from a purpose, and guessed most source names. That moved the study to programs published after the model's training data. In the fourth, on those programs, A still answered 7 of 8, above the 30 to 70 % target set before the pilots, and no source name was right. The study ran anyway with a third repetition, and the preregistration says that the target was not reached.

## Related work

The closest published task is Binary Function Search in the [ZGCM-1 technical report](https://arxiv.org/abs/2609.13356) (He and others, September 2026): an agent gets a stripped ELF binary and a description of a function's behaviour, works through a Ghidra-backed interface, and must submit the exact entry address, checked by an oracle built from the unstripped binary. Its 50 evaluation tasks come from ten well-known projects, among them zlib, Lua and XZ Utils, held out from that model's training. This study differs in three ways: it compares the same agent with and without the decompiler, on native Windows PE targets; its programs are newer than the model, after pilots showed that this model locates functions of well-known projects from memory; and its questions avoid constants, which the first pilot showed command-line tools find with one search. The work by Nishizaka and others [at the BAR 2026 workshop](https://www.ndss-symposium.org/ndss-paper/auto-draft-657/), cited in study 2, found agents analysing assembly effectively without a decompiler on CTF tasks; this study points the same way on real programs.

## What it means

- Across three studies, there is no sign that rea raises how many tasks Claude Code solves with this model: none on small crackmes, a non-significant gap against it on larger ones, and none here, where both conditions are at the ceiling. It costs more each time: about twice as much in studies 1 and 2, and 2.3 times the median cost here.
- Finding a described function in a small stripped program is easy for this agent with `llvm-objdump` and `grep`, even in code it has never seen: 71 of 72, every one at the exact start. A benchmark that can tell the conditions apart needs harder questions or larger programs.
- With rea, three of the four misses were one step off in the call graph: the agent reached the right neighbourhood and then answered a caller. Four misses are too few to say why.
- rea's Evidence keeps checking out (all 144 here, two of them from a rea result saved to a file), but a citation often supports the reasoning without stating the answer: in only 38 of 72 runs did the cited Evidence contain the answered address.
- The safety classifier stops of studies 1 and 2 went with crackme tasks, not with reverse engineering itself.
- The next questions are larger programs, MSVC and C++ builds, answers that are analyses beyond one location (a structure layout, a protocol, a changed behaviour between versions), and other agents and models.

## Deviations

The machine running the study restarted once, after 14 runs, and cut run 15 (`r04` with rea, second repetition) before it finished; it had produced no result. The study resumed with the same command from the same commit: the harness skipped the finished runs and repeated the cut one from the start. Its partial folder is kept. There were no other deviations in how the study ran; the grader correction of 16 October 2026 is reported apart, below.

## Correction (16 October 2026)

When a tool result is too large to return inline, Claude Code 2.1.296 replaces it with a note, without an error flag, and writes the full result to a file the agent can read. The grader authenticated only Evidence returned inline, so the 43 rea results saved this way counted as undecodable, and two citations of one of them as unknown. The grader now reads those files in real-software sets, matching each file to its call through that call's own note ([ADR 0019](../../docs/adr/0019-reuse-rea-evaluation.md)); older sets keep inline delivery, so studies 1 and 2 grade the same. The 144 runs were regraded from their saved transcripts:

| Measure, condition B | As first published | After the correction |
|---|---|---|
| Citations authenticated and about the target | 142 of 144 | 144 of 144 |
| Invented ids | 2 | 0 |
| Evidence records delivered | 632 | 675 |
| Answered address in the cited Evidence | 38 of 72 | 38 of 72 |

Nothing else changed: no answer, exact start, McNemar test or tool-usage metric moved. The report and the graded runs in `bench/results/study-3/` were regenerated; the first published version is in the repository history.

## Addendum: oversized results and catalog cost (post hoc)

These measures were not preregistered. They are exploratory and come from the saved transcripts, which are not published ([ADR 0014](../../docs/adr/0014-publishing-evidence.md)). `node bench/context.ts --study study-3` computes them, and its output is in [`bench/results/study-3/context.json`](../../bench/results/study-3/context.json).

- **Oversized results.** Claude Code saved at least one rea result to a file in 32 of the 72 runs of B, 43 results in all. The agent read a saved result back in 18 of those runs.

  | Tool | Calls | Saved to a file | Size of those results |
  |---|---|---|---|
  | `list_procedures` | 21 | 21 | 51 to 224 KB, median 52 KB |
  | `procedure_pseudo_code` | 306 | 18 | 58 to 471 KB, median 194 KB |
  | `search_procedures` | 16 | 2 | 52 and 108 KB |
  | `list_strings` | 1 | 1 | 60 KB |
  | `procedure_references` | 1 | 1 | 95 KB |
  | `search_strings` | 101 | 0 | |

- **Paged routes.** No run called `analyze_function` or `inspect_analysis_view`, which page a large function's code.
- **Catalog cost.** rea 6.4.0 advertised 153 tools. Claude Code listed them by name and loaded schemas through its tool search, which every run of B used, a median of once. The first request of a run carried a median of 12,189 input tokens in B against 8,972 in A, about 3,200 more. That overhead repeats on every request: multiplied by each run's requests, it is a median of 12 % of the run's input tokens (3 % to 19 %). Input tokens count input, cache creation and cache reads per request, which add up to the report's medians (300,695 in B, 112,967 in A).

## Limitations

- The calibration target was not met: A answered 99 %, so most pairs agree and only a large effect could show.
- Four small C programs, 48 to 329 KB, built with llvm-mingw, not MSVC. New projects are small and recent, and much of their code looks written with AI assistance, so it may be more conventional than older software.
- Four programs are four clusters: tasks within a program share one binary.
- The author wrote the questions; the seed chose the targets, but the wording of a purpose can make a task easier or harder.
- One agent and one model; nothing here speaks for other agents yet.
- Neither condition could run an interpreter, by design.
- The cost is Claude Code's equivalent cost, not money spent: the runs used a subscription.
- rea 6.4.0, the version of studies 1 and 2, frozen for comparability.
- Until the correction above, the grader authenticated only Evidence returned inline and did not read the files where Claude Code saves large results, which this study allowed for the first time.
- The review heuristic flagged 28 runs (19 in A, 9 in B) for attempts to run Python or paths outside the run folder. The permission policy denied every interpreter call. The commands that ran were false positives, such as a `grep` for the word `python` among the program's strings, and the outside paths were either denied or `sed` and `awk` patterns read as drive letters. No run was excluded.

## Reproduce it

The seed of the target draw is **1344467450**. Drawing again from it with `node challenges/real-tasks.mjs draw --role study --seed 1344467450` gives the same 24 targets; the questions are the author's, in [`challenges/real-tasks-study-3.json`](../../challenges/real-tasks-study-3.json), whose SHA-256 is `ae8175807a521028d82984b668ab49bf3e4a42f7a28ddd6dae09af8c2bcd21aa`, as published before the study. The build manifest's SHA-256 is `996a69f7b215aca561936617a206000226a4a723d89059b47f62ef895b3789eb`.

```powershell
npm ci
npm run setup
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <folder>
node challenges/real-tasks.mjs resolve challenges/real-tasks-study-3.json --build <folder>
node bench/run.ts --study study-3 --model claude-sonnet-5-5 --effort medium --set <folder> --conditions A,B --repetitions 3 --order-seed 20261017 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-3
```

The graded runs and the ground truth of the 24 tasks (each target's name and range) are published in [`bench/results/study-3/`](../../bench/results/study-3/), and the report regenerates from them with one command:

```powershell
node bench/report.ts --results bench/results/study-3/results.jsonl --out <folder>
```

How the benchmark works, and its isolation and grading, is described in [`bench/`](../../bench/README.md).
