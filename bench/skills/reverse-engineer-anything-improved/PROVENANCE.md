# Provenance

This folder is a modified copy of the `reverse-engineer-anything` skill shipped in `rea-agents@6.4.0` ([morluto/rea](https://github.com/morluto/rea)), under the MIT licence, copyright (c) 2026 morluto; the licence is in [LICENSE](LICENSE). It is not an official rea skill: neither morluto nor the rea project has reviewed or endorsed it.

rea-lab changed `SKILL.md` only, and every line of the original is still there in the same order, except the front matter's version field. The `references/` files are unchanged. Study 5 compares this skill with the original ([ADR 0025](../../../docs/adr/0025-skill-comparison.md)).

## What changed and where each change comes from

The front matter's version is `37+rea-lab.3`. A pointer from the native route leads to a new section, "Locate code in a native binary", and one sentence after the oversized-result paragraph asks the agent to read a result that the client saved to a file instead of repeating the call. The section's steps and their sources:

| Step | Change | Source |
|---|---|---|
| 1 | Start from anchors the behavior implies (strings, imported library calls, option names); `xrefs` from a match returns the addresses that refer to it, in code or in data; `resolve_containing_procedure` turns a code one into its function and reports a data one as in no procedure, which spends that anchor | Study 3 transcripts; the first development round (see below), where `xrefs` on a matched string returned a data address and a procedure tool failed on it; imports as anchors from ReVa's [binary-triage skill](https://github.com/cyberkaida/reverse-engineering-assistant/tree/main/ReVa/skills/binary-triage), which surveys strings, imports and cross-references before decompiling; the tool contract of `resolve_containing_procedure` in rea 6.4.0, which returns a negative result for an address outside a procedure |
| 2 | Read code only for candidates; the argument names `procedure` and `addresses` | Study 3 (306 `procedure_pseudo_code` calls); study 1's input validation failures (`address` for `procedure`, `query` for `pattern`) |
| 3 | When no anchor fits, try the next cheapest one before the whole inventory | Study 3 (all 21 `list_procedures` results were too large to return inline); SkillsBench ([Li and others, 2026](https://arxiv.org/abs/2602.12670), sections 5.1.3 and 6): focused skills do better than exhaustive ones, and skills that impose one pipeline without applicability boundaries or a lightweight fallback can hurt |
| 4 | Reuse a result instead of repeating an identical call | Reveree ([Benkraouda and others, 2026](https://arxiv.org/abs/2609.01185), sections 5.2.3 and 5.3.2): failed runs repeat commands and re-analyse, and the strategies that help re-analyse less; ZGCM-1 ([arXiv 2609.13356](https://arxiv.org/abs/2609.13356), section 11.2) gives no credit to non-convergent repeated tool use |
| 5 | Check whether the question asks for the function or its caller or callee, and cite an Evidence about the reported function, its code or a result that gives its start address, rather than a result about another function | Study 3 (three of four misses with rea answered a function one step away in the call graph); the second development round (see below); ZGCM-1, section 11.2 (callers and callees confirm which function owns the behavior) |

The wording follows Anthropic's [skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices): concise steps, one default with an escape hatch, and a verification step. The section names only tools that rea 6.4.0 and rea's main branch both offer, with the same argument names, so it can be proposed to rea as a small addition.

## Development rounds

Each round ran the eight public tasks of study 3's pilot 4 ([`real-tasks-pilot-4.json`](../../../challenges/real-tasks-pilot-4.json)) under the official and the improved skill, once each, and was read on process measures, never on the study's tasks.

| Round | Skill version | Change after the round |
|---|---|---|
| `dev-s5-1` | `37+rea-lab.1` | Step 1 said that `xrefs` returns the code that uses a match. In one run it returned a data address, and the agent passed it to `procedure_pseudo_code`, which failed. Step 1 now says that `xrefs` returns code or data addresses and what `resolve_containing_procedure` reports for a data one (`37+rea-lab.2`) |
| `dev-s5-2` | `37+rea-lab.2` | Step 5 asked for an Evidence whose result states the reported start address and named the tools whose results do. The rounds showed that the decompiled code of a function names it only with the decompiler's default name, so that wording steered the agent to particular tools rather than to Evidence about the right function; one run had cited the callers of another function. Step 5 now asks for an Evidence about the reported function, its code or a result that gives its start address, rather than one about another function (`37+rea-lab.3`) |
| `dev-s5-3` | `37+rea-lab.3` | None. Every C2 citation named the reported function, by its start address or its decompiled code. This was the last round the study plan allows, and the skill was frozen at this version before the study's tasks were drawn |
