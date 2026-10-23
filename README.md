<h1 align="center">rea-lab</h1>

<p align="center">
  Reverse engineering with AI agents on Windows: verifying, measuring and visualising the tools agents use, with rea and Ghidra
</p>

<p align="center">
  <img src="https://img.shields.io/badge/rea-6.4.0-6f42c1" alt="rea 6.4.0">
  <img src="https://img.shields.io/badge/Ghidra-12.1.4-d32f2f" alt="Ghidra 12.1.4">
  <img src="https://img.shields.io/badge/now-upstream_contributions-blue" alt="Current work: upstream contributions to rea">
  <a href="https://github.com/pablodiazjorge/rea-lab/actions/workflows/check.yml"><img src="https://github.com/pablodiazjorge/rea-lab/actions/workflows/check.yml/badge.svg" alt="Repository checks"></a>
  <a href="https://github.com/pablodiazjorge/rea-lab/actions/workflows/windows-smoke.yml"><img src="https://github.com/pablodiazjorge/rea-lab/actions/workflows/windows-smoke.yml/badge.svg" alt="Windows smoke test with real Ghidra"></a>
  <img src="https://img.shields.io/badge/code-MIT-green" alt="Code license: MIT">
  <img src="https://img.shields.io/badge/text-CC_BY_4.0-green" alt="Text license: CC BY 4.0">
</p>

<p align="center"><a href="README.es.md">Leer en español</a></p>

## Why

[rea](https://github.com/morluto/rea) gives coding agents (Claude Code, Codex, Cursor and others) MCP tools to reverse engineer software, from app behaviour down to native binaries. Three gaps stand out on Windows:

1. Its Ghidra provider is experimental on Windows, as rea's own documentation says.
2. I found no published measurement of what it adds to an agent on native Windows binaries.
3. Its Evidence ledger lives in memory during a session unless the agent exports it, so you cannot watch what the agent is finding while it works.

This lab works on those three gaps: it contributes Windows verification upstream, builds a reproducible benchmark with known answers, and ships a Claude Code mod that shows the agent's evidence live.

## Roadmap

There are no dates: each phase closes when it meets its exit criteria.

| Phase | Goal | Status |
|---|---|---|
| F0 | Public foundations: rules, decisions and checks | done |
| F1 | Reproducible environment and per-project MCP registration | done |
| F2 | Contributions to rea from a real Windows machine | ongoing |
| F3 | Seeded challenges with known answers and first writeups | done |
| F4 | Benchmark and study 1: what rea adds to an agent | done |
| F5 | Claude Code mod with a live evidence pane | done |
| F6 | Second upstream wave and improved skill | done |
| F7 | Dynamic analysis inside Windows Sandbox | optional |

## Status

All studies used rea 6.4.0, Claude Code 2.1.296 and the models named in each; later versions may behave differently.

- rea 6.4.0 with Ghidra 12.1.4 on Windows 11 26H2 (x64, NTFS, non-elevated user): `rea doctor --provider ghidra` passes every check, including the native authority self-test that fails on other machines ([morluto/rea#1701](https://github.com/morluto/rea/issues/1701)).
- First real session: `WinHelloCPP.exe`, an exercise shipped with Ghidra, analysed in about 25 s (6 segments, 388 functions, 254 strings), with no leftover processes or temporary files.
- Thirteen upstream contributions merged: [morluto/rea#1863](https://github.com/morluto/rea/pull/1863) fixes the real Windows Ghidra verification lanes; [morluto/rea#1926](https://github.com/morluto/rea/pull/1926) and [morluto/rea#1936](https://github.com/morluto/rea/pull/1936) make the Claude Code and Gemini CLI client lanes run on native Windows; [morluto/rea#2312](https://github.com/morluto/rea/pull/2312) fixes three MCP boundary test suites that failed on native Windows; [morluto/rea#2497](https://github.com/morluto/rea/pull/2497) documents what rea's NativeAOT parser covers on a real Windows host; [morluto/rea#3226](https://github.com/morluto/rea/pull/3226) fixes how rea decodes an empty CBOR text in Solidity metadata; [morluto/rea#3159](https://github.com/morluto/rea/pull/3159) admits HAR captures with valid numbers that Evidence cannot publish exactly; [morluto/rea#3266](https://github.com/morluto/rea/pull/3266) fixes four tests that turned file URLs into broken paths on Windows; [morluto/rea#4839](https://github.com/morluto/rea/pull/4839) keeps the sign of negative-zero reals in Apple property lists; [morluto/rea#4903](https://github.com/morluto/rea/pull/4903) lets setup tell the MSIX Claude Desktop's process view from any private roaming file; [morluto/rea#4103](https://github.com/morluto/rea/pull/4103) reports the provider-selection diagnostics when the selected provider refuses its profile; [morluto/rea#6402](https://github.com/morluto/rea/pull/6402) links requested native exports only to a resolved native add-on; and [morluto/rea#6401](https://github.com/morluto/rea/pull/6401) keeps an accepted CLI-only skill choice in interactive setup. The changes of two more, [morluto/rea#2824](https://github.com/morluto/rea/pull/2824) and [morluto/rea#2911](https://github.com/morluto/rea/pull/2911), landed on rea's main branch inside a maintainer commit.
- [Study 1](writeups/2026-10-study-1/README.md), preregistered: on ten small Windows crackmes, rea did not change how many Claude Code solved (28 of 30 with and without it), made each run about twice as slow and expensive, and every piece of rea Evidence the agent cited re-authenticated.
- [Study 2](writeups/2026-10-study-2/README.md), preregistered: on eight larger binaries, where the real check hides among dozens of decoys, Claude Code solved 11 of 24 runs without rea and 4 of 24 with it (exact McNemar, p = 0.092, not significant), again at about twice the time and cost; 45 of 46 cited Evidence records re-authenticated.
- [Study 3](writeups/2026-10-study-3/README.md), preregistered: on four real open-source programs published after the model's training data, Claude Code located the described function or table in 71 of 72 runs without rea and 68 of 72 with it (exact McNemar, p = 0.375, not significant), so both conditions are at the ceiling; rea again cost more than twice as much, and all 144 cited Evidence records authenticated after a grader correction (142 as first published).
- [Study 4](writeups/2026-10-study-4/README.md), preregistered: the same tasks with a second model family, DeepSeek's `deepseek-flash` served to Claude Code through DeepSeek's API; it located the function or table in 20 of 20 runs without rea and 19 of 20 with it (exact McNemar, p = 1), the same ceiling, for 2.05 USD in all; the model tried to use the network or to list the benchmark's folders outside its run in 13 runs, and the permission policy denied every attempt.
- [Study 5](writeups/2026-10-study-5/README.md), preregistered: rea's own skill and an improved version, injected into Claude Code's system prompt, on 30 new tasks in the same programs; the improved skill made runs 14 % more expensive than the official one (Hodges-Lehmann ratio 1.14, exact Wilcoxon p = 0.012), and the official one changed nothing measurable against no skill; accuracy and citations did not differ. The planned pull request to rea's skill was dropped.
- A design discussion upstream, backed by the benchmark: in the 339 runs that called rea (336 of the 482 in the five studies, plus 3 that a machine restart cut and the harness repeated), no agent kept its Evidence, so the grader had to rebuild every record from the client's transcript; [morluto/rea#4809](https://github.com/morluto/rea/issues/4809) proposes an opt-in journal of the Evidence ledger, written by rea as records are added.
- [rea-casebook](https://github.com/pablodiazjorge/rea-casebook) 1.0.4, a Claude Code mod that keeps a live casebook of the Evidence rea gives the agent: the wait for Ghidra's cold start, open unknowns, findings that must cite real `evidence_id` values, a journal per session and Markdown or artifact exports.

## Layout

| Path | Content |
|---|---|
| `AGENTS.md` | Instructions for coding agents (`CLAUDE.md` imports it) |
| `docs/adr/` | Architecture decision records |
| `docs/guides/` | How-to guides, such as the [portable per-project MCP registration](docs/guides/portable-mcp-registration.md) |
| `writeups/` | Investigations with their sanitised Evidence: [WinHelloCPP](writeups/2026-10-winhellocpp/README.md), [Wallace v1 against v2](writeups/2026-10-wallace-versions/README.md), [c02-xor at -O0 and -O2](writeups/2026-10-own-xor/README.md), [study 1](writeups/2026-10-study-1/README.md), [study 2](writeups/2026-10-study-2/README.md), [study 3](writeups/2026-10-study-3/README.md), [study 4](writeups/2026-10-study-4/README.md), [study 5](writeups/2026-10-study-5/README.md) |
| [`challenges/`](challenges/README.md) | Seeded practice challenges with known answers, built reproducibly |
| [`bench/`](bench/README.md) | Benchmark harness: isolated `claude -p` runs, deterministic graders, rea's own evaluation code, paired statistics |
| `tools.json` | Tool versions, download URLs and SHA-256 hashes |
| `sources.json` | Source archives of the open-source programs compiled for study 3, with their SHA-256 |
| `scripts/setup.mjs` | Downloads, verifies and extracts the tools into `tools/` |
| `scripts/rea-mcp.mjs`, `.mcp.json` | rea's MCP server, registered for this project only |
| `.claude/settings.json` | rea tools allowed; tools that run a target or a device denied |
| `scripts/check.mjs` | Repository checks: personal data, bilingual parity, links, style |
| `env.ps1` | rea, Ghidra and clang for the current PowerShell session |
| `.github/workflows/` | CI: checks on every push, real Ghidra on Windows every week |
| `tools/`, `targets/`, `repos/` | Local tools, analysis targets and nested repositories (not in git) |

## Quick start

Requirements: Windows 10 or later (x64) and Node.js 22.19 or later. `npm run setup` downloads Ghidra 12.1.4, Temurin JDK 21 and llvm-mingw (about 920 MB), verifies every SHA-256 before extracting and keeps everything inside `tools/`: nothing is installed system-wide.

```powershell
npm ci
npm run setup
. .\env.ps1
rea doctor --provider ghidra --json
```

Then open Claude Code in this folder and approve the `rea` server from `.mcp.json`: the agent gets rea's tools for this project only, with no personal paths in the configuration. The first Ghidra-backed query imports and analyses the binary, which takes about half a minute for a small executable.

## Targets and legal scope

Only binaries built here, the exercises that ship with Ghidra, and crackmes or finished CTF challenges whose author or rules allow analysis and published writeups. Third-party binaries are analysed statically and never run on the host; anything dynamic happens inside Windows Sandbox without network access. Commercial software, online games, DRM and anything related to my employer are out of scope. The legal basis is each target's own licence or its rights holder's permission, not the decompilation exceptions of copyright law: details in [ADR 0010](docs/adr/0010-target-policy.md).

## Decisions

Every hard-to-reverse decision has a short record in [docs/adr](docs/adr/README.md): repository layout, language policy, the portable MCP launcher, pinned versions, target policy, benchmark isolation and how the lab contributes to rea.

## Disclaimer

- rea-lab is a personal, independent project, built on my own equipment and unrelated to my job: it uses no data, code or resources from the company I work for, and it was not made at that company's request. The opinions in it are mine alone.
- It is not affiliated with, sponsored or endorsed by morluto or the rea project, Anthropic, DeepSeek, the NSA, Microsoft, GitHub or any other company or project named here; their names only identify their products.
- It is research: it measures how AI agents use reverse-engineering tools on targets whose licences allow it. It contains no means to remove or bypass copy protection, licence checks, DRM or obfuscation of third-party software, no exploits and no malware. Do not use its tools or methods on software you are not entitled to analyse.
- Results describe the pinned versions, tasks and settings of each study; they are not a general assessment of any product. Code, text and results are provided as is, without warranty of any kind.

## License

Code, JSON task files, manifests and configuration are released under the [MIT License](LICENSE). Text (READMEs, guides, ADRs, writeups, preregistrations, `AGENTS.md`) and benchmark results are released under [CC BY 4.0](LICENSE-CC-BY-4.0). Third-party material keeps its own licence: the evidence files and decompiled excerpts of the Ghidra exercises remain under the [Apache License 2.0](LICENSE-Apache-2.0), and the copy of rea's skill in `bench/skills/` is under its own MIT License.

## Acknowledgements

- [rea](https://github.com/morluto/rea) by morluto, MIT License.
- [Ghidra](https://github.com/NationalSecurityAgency/ghidra) by the NSA, Apache License 2.0.
