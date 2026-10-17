# Does a better skill make rea cheaper? A fifth preregistered study on Windows

<p><a href="README.es.md">Leer en español</a></p>

[rea](https://github.com/morluto/rea) ships a skill, `reverse-engineer-anything`, that tells an agent how to use its tools. In [study 1](../2026-10-study-1/README.md) the agent never loaded it, so its content had never been measured, and in [study 3](../2026-10-study-3/README.md) rea located functions in real programs as often as command-line tools did, at more than twice the median cost. This study put the skill's text in front of Claude Code and asked whether it makes rea cheaper, and whether a revised version, written from the earlier studies' transcripts and published guidance, does better than the official one.

**Short answer:** no, and the revision made it worse. On 30 new tasks in study 3's four programs, the improved skill made runs 14 % more expensive than the official one (Hodges-Lehmann ratio 1.14, 95 % interval 1.05 to 1.26, exact Wilcoxon p = 0.012), the opposite of what it was written for. The official skill changed nothing measurable against no skill (ratio 0.98, p = 0.84). Accuracy and citations did not differ. The improved skill did change the process as intended (it nearly stopped the agent from listing every function), but the agent took more steps, and in Claude Code the cost follows the context written to the cache at each step.

## Design

Everything in this section was fixed in the [preregistration](../../bench/preregistration-study-5.md), committed before the study started (`ade504a`, 17 October 2026), after three development rounds of the improved skill, the task draw and one pilot.

- **Three conditions,** all with rea 6.4.0 over MCP and Ghidra 12.1.4, the LLVM command-line tools and text filters, and no interpreter, as condition B of study 3:
  - B, no skill;
  - C1, plus the body of rea 6.4.0's official `SKILL.md`;
  - C2, plus the improved skill ([`bench/skills/reverse-engineer-anything-improved/`](../../bench/skills/reverse-engineer-anything-improved/)).
- **How the skill reached the agent.** Its body went into the system prompt with Claude Code's `--append-system-prompt-file`, after one fixed sentence, and its `references/` files were readable in the run's configuration folder ([ADR 0025](../../docs/adr/0025-skill-comparison.md)). The study measures the skill's content, not whether a client decides to load it.
- **The improved skill.** The official text plus a section on locating code in a native binary: start from anchors (strings, imports), read code only for candidates, try the next cheapest anchor before listing every function, do not repeat identical calls, and cite an Evidence about the function reported. It is 14 % longer (15,484 bytes against 13,580). Each change names its source in its [provenance note](../../bench/skills/reverse-engineer-anything-improved/PROVENANCE.md). Three development rounds on eight public tasks, under C1 and C2, adjusted two steps; the skill was then frozen (`e9f6632`) before the study's tasks were drawn.
- **Tasks.** 30 new tasks on study 3's programs and build, none a target or a described function of study 3 or its pilots: 6 `behaviour` and 2 `chain` tasks on SGIEmu and flint, 6 and 1 on c5xtools and moppe-emu. A private seed ordered the validator's candidates, and the author wrote every question from the source.
- **Runs.** 2 repetitions per task and condition, 180 runs, in a shuffled order. Claude Code 2.1.296 in headless mode, `claude-sonnet-5-5` with medium effort, 30 minutes and 5 USD of equivalent cost per run. Unlike studies 1 to 4, Claude Code ran with its defaults: the harness no longer passes the tuning switches the desktop app sets ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).
- **Outcome and tests.** One confirmatory outcome, the cost per run. H1 compares C1 with C2 and H2 compares B with C1, each with an exact two-sided Wilcoxon signed-rank test on each task's log ratio of mean costs, at alpha 0.05, with the Hodges-Lehmann ratio and its exact interval. A draft also tested whether the cited Evidence states the answered address; the development rounds showed that this mostly measures which tool is cited, so citations were made descriptive before the freeze (see below). Accuracy was a guardrail.

## Results

| | B: no skill | C1: official skill | C2: improved skill |
|---|---|---|---|
| Correct, all at the exact start | 52/60 (87 %, 76 to 93 %) | 55/60 (92 %, 82 to 96 %) | 52/60 (87 %, 76 to 93 %) |
| Median cost per run | 0.214 USD | 0.229 USD | 0.242 USD |
| Mean cost per run | 0.280 USD | 0.255 USD | 0.304 USD |
| Median turns | 15 | 16 | 16 |
| Median output tokens | 2,344 | 2,248 | 2,728 |
| Median rea calls | 10 | 8 | 8 |
| Runs that opened and closed the session | 59/60 | 59/60 | 53/60 |
| Cited Evidence states the address / names the function | 18 / 58 | 19 / 56 | 20 / 56 |

**H1, C1 against C2: C2 costs more.** On the 30 tasks, the Hodges-Lehmann ratio of C2's cost over C1's is 1.140 (95 % interval 1.047 to 1.262; W+ = 353, p = 0.0120). The preregistered sensitivity analysis, which prices every run's first-request cache writes as cache reads to remove the effect of run order, gives the same: 1.155 (1.043 to 1.308), p = 0.0175.

**H2, B against C1: no effect detected.** The ratio of C1's cost over B's is 0.976 (0.815 to 1.156; p = 0.8394). Its sensitivity analysis gives 0.879, p = 0.17. Against B, C2 had a ratio of 1.122 (p = 0.146), descriptive only.

**Accuracy.** No pair differed (exact McNemar: C1 against C2, 4 pairs right only with C1 and 1 only with C2, p = 0.375; B against C1, 1 and 4, p = 0.375; B against C2, 5 and 5). By family, `behaviour` had 40, 43 and 41 of 48, and `chain` 12, 12 and 11 of 12. c5xtools was the hardest program for every condition, 10 of 14 in each. The guardrail (C2 more than 3 correct runs below C1) did not trigger, and with no cost advantage it had nothing to protect.

**Where the cost went.** Cache writes make about 70 % of every condition's cost: each turn writes the newest messages, tool results included, into the prompt cache. Per task, C2 cost on average 0.049 USD more than C1: 0.027 in cache writes (higher on 19 of 30 tasks), 0.016 in cache reads (21 of 30) and 0.006 in output (21 of 30). C2 took more turns on average (18.9 against 17.1) and wrote more (3,514 output tokens on average, against 2,876).

**The process did change.** The improved skill steered the agent as written, which is why the result is not a matter of ignored guidance:

| From the transcripts (post hoc) | B | C1 | C2 |
|---|---|---|---|
| `list_procedures` calls | 38 | 20 | 7 |
| Runs with a rea result too large to return inline | 46 | 34 | 26 |
| `resolve_containing_procedure` / `batch_decompile` calls | 19 / 0 | 3 / 0 | 20 / 11 |
| `search_procedures` calls | 12 | 7 | 20 |
| First request's input tokens (median) | 12,228 | 16,820 | 17,407 |
| Reads of the skill's references | 0 | 0 | 0 |

Fewer whole-inventory listings and fewer oversized results did not save money, because the targeted route took more steps and each step carried a growing context into the cache. The official skill also halved the listings against no skill, with no cost effect either way. Neither skill's references were opened in any run.

**Citations.** All 360 cited `evidence_id` values authenticated and were about the target. Whether the cited Evidence states the answered address as a number depends on the tool: the decompiled code of `procedure_pseudo_code`, the most cited in every condition (41, 40 and 38 runs), names the function only by the decompiler's default name (`FUN_` and the address), so it never counts, while callers, `procedure_info` and `resolve_containing_procedure` results do. Counting that name, the cited Evidence names the answered function in 58, 56 and 56 runs. Neither definition differed between conditions.

**Flagged runs.** 16 runs were flagged for review and none was excluded: 8 tried Python (to scan the binary for constants or parse a saved result) and were denied; 4 matched the word "python" inside a `grep` pattern over `llvm-strings` output, an allowed command; and 4 tripped the path check, two with a denied "parent folder" access, one with the run's own folder and one with `awk` text read as a path. No run reached the network, the host or the ground truth, which this time lived outside the benchmark's folder tree.

**Cost and time.** The 180 runs took 231 minutes of machine time and 50.34 USD of equivalent cost (16.80 in B, 15.29 in C1, 18.25 in C2), against the about 70 USD the pilot predicted. No response was stopped by a safety classifier and no run timed out.

## What the development rounds and the pilot showed

Three rounds of 16 runs on the eight public tasks of study 3's pilot 4 compared C1 and C2 before the freeze ([provenance](../../bench/skills/reverse-engineer-anything-improved/PROVENANCE.md#development-rounds)). They fixed a wrong description of what `xrefs` returns, and rewrote the citation step after finding that decompiled code names its function only by the decompiler's default name; that finding also led to a dated note in study 3's writeup and to making citations descriptive. Across the rounds, cost differences between C1 and C2 were within the noise of one repetition (6.86 against 6.96 USD in total). The pilot, 12 runs under the three conditions, set the number of repetitions with a power simulation based on the rounds' spread: 2 repetitions gave 80 to 94 % power for a 20 % cost change and 29 to 40 % for 10 % ([preregistration](../../bench/preregistration-study-5.md#pilot-before-freezing)).

## What it means

- Better-written guidance for rea did not make Claude Code cheaper. The improved skill made it 14 % more expensive, with the same accuracy. Writing a skill from what transcripts show the agent doing wrong, and from published guidance, was not enough: the change has to be measured.
- The skill changed what the agent did, in the intended direction. The extra cost came from the shape of the work: more, smaller, targeted calls mean more turns, and in Claude Code each turn writes the newest context into the cache, which is most of the bill. Avoiding a single oversized result saves less than one extra turn costs.
- The official skill, put in front of the agent, made no measurable difference to cost or accuracy against no skill.
- The planned pull request to rea's skill is not justified by these data and will not be made.
- Citation quality, as studies 3 and 4 measured it, mostly reflects which tool is cited; a definition that counts the decompiler's name says the agent cited Evidence about the answered function in most runs, with or without a skill.

## Deviations

None in how the study ran: the preregistered command, from `ade504a`, with no infrastructure failures, no reruns and no interruptions. The set was rebuilt with the preregistered `real.mjs` command before the freeze; that rebuild found that two programs print the compiler's date, which changed two bytes on another day, and the build now pins it, so the rebuild matched study 3's manifest byte for byte ([ADR 0024](../../docs/adr/0024-real-software-tasks.md)).

## Limitations

- One client and one model. The skill was injected into the system prompt, which is not how an agent meets an installed skill; the study measures the content.
- 30 tasks in four small C programs, with 2 repetitions: a cost change of 20 % or more was detectable, one of 10 % mostly not. The programs are clusters, and the author wrote the questions.
- The improved skill is one revision. Another revision could do better; this one was frozen after three rounds, as the plan allowed.
- The injected prompt names the run's own references folder, so its text differs between runs and each run writes the skill into the prompt cache instead of reusing a shared prefix. That raises C1's and C2's absolute cost against B (the first request writes about 5,400 to 6,000 more tokens), but it applies to both skills alike, and the sensitivity analysis, which removes the first request's writes, gives the same H1.
- Cost is Claude Code's equivalent cost at list prices, not money spent.

## Reproduce it

The tasks, the ground truth and the seed of the target draw (2120649789) are published in [`challenges/real-tasks-study-5.json`](../../challenges/real-tasks-study-5.json) and [`bench/results/study-5/`](../../bench/results/study-5/).

```powershell
npm ci
npm run setup
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <folder outside the benchmark home>
node challenges/real-tasks.mjs resolve challenges/real-tasks-study-5.json --build <folder>
node bench/run.ts --study study-5 --model claude-sonnet-5-5 --effort medium --set <folder> --conditions B,C1,C2 --repetitions 2 --order-seed 20261019 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-5
```

The graded runs are published in [`bench/results/study-5/`](../../bench/results/study-5/), with the post hoc context measures in `context.json`, and the report regenerates from them with one command:

```powershell
node bench/report.ts --results bench/results/study-5/results.jsonl --out <folder>
```

How the benchmark works, and its isolation and grading, is described in [`bench/`](../../bench/README.md).
