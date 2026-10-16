<h1 align="center">rea-lab</h1>

<p align="center">
  Reverse engineering with AI agents on Windows: verifying, measuring and visualising the tools agents use, with rea and Ghidra
</p>

<p align="center">
  <img src="https://img.shields.io/badge/rea-6.4.0-6f42c1" alt="rea 6.4.0">
  <img src="https://img.shields.io/badge/Ghidra-12.1.4-d32f2f" alt="Ghidra 12.1.4">
  <img src="https://img.shields.io/badge/phase-F6-blue" alt="Current phase: F6">
  <a href="https://github.com/pablodiazjorge/rea-lab/actions/workflows/check.yml"><img src="https://github.com/pablodiazjorge/rea-lab/actions/workflows/check.yml/badge.svg" alt="Repository checks"></a>
  <a href="https://github.com/pablodiazjorge/rea-lab/actions/workflows/windows-smoke.yml"><img src="https://github.com/pablodiazjorge/rea-lab/actions/workflows/windows-smoke.yml/badge.svg" alt="Windows smoke test with real Ghidra"></a>
  <img src="https://img.shields.io/badge/code-MIT-green" alt="Code license: MIT">
  <img src="https://img.shields.io/badge/text-CC_BY_4.0-green" alt="Text license: CC BY 4.0">
</p>

<p align="center"><a href="README.es.md">Leer en español</a></p>

## Why

[rea](https://github.com/morluto/rea) gives coding agents (Claude Code, Codex, Cursor and others) MCP tools to reverse engineer software, from app behaviour down to native binaries. Three gaps stand out on Windows:

1. Its Ghidra provider is experimental there and barely verified on real machines.
2. Nobody has measured what it adds to an agent on native Windows binaries.
3. Its evidence lives only in memory, so you cannot watch what the agent is finding.

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
| F6 | Second upstream wave, improved skill, second agent | planned |
| F7 | Dynamic analysis inside Windows Sandbox | optional |

## Status

- rea 6.4.0 with Ghidra 12.1.4 on Windows 11 26H2 (x64, NTFS, non-elevated user): `rea doctor --provider ghidra` passes every check, including the native authority self-test that fails on other machines ([morluto/rea#1701](https://github.com/morluto/rea/issues/1701)).
- First real session: `WinHelloCPP.exe`, an exercise shipped with Ghidra, analysed in about 25 s (6 segments, 388 functions, 254 strings), with no leftover processes or temporary files.
- Eight upstream contributions merged: [morluto/rea#1863](https://github.com/morluto/rea/pull/1863) fixes the real Windows Ghidra verification lanes; [morluto/rea#1926](https://github.com/morluto/rea/pull/1926) and [morluto/rea#1936](https://github.com/morluto/rea/pull/1936) make the Claude Code and Gemini CLI client lanes run on native Windows; [morluto/rea#2312](https://github.com/morluto/rea/pull/2312) fixes three MCP boundary test suites that failed on native Windows; [morluto/rea#2497](https://github.com/morluto/rea/pull/2497) documents what rea's NativeAOT parser covers on a real Windows host; [morluto/rea#3226](https://github.com/morluto/rea/pull/3226) fixes how rea decodes an empty CBOR text in Solidity metadata; [morluto/rea#3159](https://github.com/morluto/rea/pull/3159) admits HAR captures with valid numbers that Evidence cannot publish exactly; and [morluto/rea#3266](https://github.com/morluto/rea/pull/3266) fixes four tests that turned file URLs into broken paths on Windows. The changes of two more, [morluto/rea#2824](https://github.com/morluto/rea/pull/2824) and [morluto/rea#2911](https://github.com/morluto/rea/pull/2911), landed on rea's main branch inside a maintainer commit.
- [Study 1](writeups/2026-10-study-1/README.md), preregistered: on ten small Windows crackmes, rea did not change how many Claude Code solved (28 of 30 with and without it), made each run about twice as slow and expensive, and every piece of rea Evidence the agent cited re-authenticated.
- [Study 2](writeups/2026-10-study-2/README.md), preregistered: on eight larger binaries, where the real check hides among dozens of decoys, Claude Code solved 11 of 24 runs without rea and 4 of 24 with it (exact McNemar, p = 0.092, not significant), again at about twice the time and cost; 45 of 46 cited Evidence records re-authenticated.
- [Study 3](writeups/2026-10-study-3/README.md), preregistered: on four real open-source programs published after the model's training data, Claude Code located the described function or table in 71 of 72 runs without rea and 68 of 72 with it (exact McNemar, p = 0.375, not significant), so both conditions are at the ceiling; rea again cost more than twice as much, and all 144 cited Evidence records authenticated after a grader correction (142 as first published).
- [rea-casebook](https://github.com/pablodiazjorge/rea-casebook) 1.0.4, a Claude Code mod that keeps a live casebook of the Evidence rea gives the agent: the wait for Ghidra's cold start, open unknowns, findings that must cite real `evidence_id` values, a journal per session and Markdown or artifact exports.

## Layout

| Path | Content |
|---|---|
| `AGENTS.md` | Instructions for coding agents (`CLAUDE.md` imports it) |
| `docs/adr/` | Architecture decision records |
| `docs/guides/` | How-to guides, such as the [portable per-project MCP registration](docs/guides/portable-mcp-registration.md) |
| `writeups/` | Investigations with their sanitised Evidence: [WinHelloCPP](writeups/2026-10-winhellocpp/README.md), [Wallace v1 against v2](writeups/2026-10-wallace-versions/README.md), [c02-xor at -O0 and -O2](writeups/2026-10-own-xor/README.md), [study 1](writeups/2026-10-study-1/README.md), [study 2](writeups/2026-10-study-2/README.md), [study 3](writeups/2026-10-study-3/README.md) |
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

Only binaries built here, the exercises that ship with Ghidra, and crackmes or finished CTF challenges whose rules allow writeups. Third-party binaries are analysed statically and never run on the host; anything dynamic happens inside Windows Sandbox without network access. Commercial software, online games, DRM and anything related to the author's employer are out of scope. Details and legal basis in [ADR 0010](docs/adr/0010-target-policy.md).

## Decisions

Every hard-to-reverse decision has a short record in [docs/adr](docs/adr/README.md): repository layout, language policy, the portable MCP launcher, pinned versions, target policy, benchmark isolation and how the lab contributes to rea.

## License

Code is released under the [MIT License](LICENSE). Text (READMEs, guides, ADRs, writeups) and benchmark results are released under [CC BY 4.0](LICENSE-CC-BY-4.0).

## Acknowledgements

- [rea](https://github.com/morluto/rea) by morluto, MIT License.
- [Ghidra](https://github.com/NationalSecurityAgency/ghidra) by the NSA, Apache License 2.0.
