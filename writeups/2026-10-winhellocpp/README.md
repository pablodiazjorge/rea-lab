# WinHelloCPP: what rea and Ghidra recover from a Win32 app

<p><a href="README.es.md">Leer en español</a></p>

WinHelloCPP is one of the exercises that ship with Ghidra: a classic Win32 window application whose source code is included. That makes it a fair first test: every claim rea makes can be checked against what the programmer actually wrote. This writeup follows an agent finding the program's own code among almost 400 functions and compares the decompiled result with the original source.

## Target

| | |
|---|---|
| File | `WinHelloCPP.exe`, 110,592 bytes |
| SHA-256 | `7a98a934de5f578c3a547af873221b221d037bafa87ceee71dd4f089dd228202` |
| Format | PE, x86, Win32 GUI application |
| Origin | Ghidra 12.1.4 distribution, `docs/GhidraClass/ExerciseFiles/WinhelloCPP` (Apache License 2.0) |
| In this repository | No: `npm run setup` copies it from Ghidra into `targets/` ([provenance](provenance.json)) |

## Method

- rea 6.4.0 over MCP with Ghidra 12.1.4 and Temurin JDK 21, on Windows 11, through the lab's portable launcher.
- The agent (Claude Code, Opus 5.5) chose the queries over four exploratory passes, then ran one final pass with every query it needed. That final pass produced [evidence.json](evidence.json): 18 Evidence records, sanitised with `scripts/sanitize.mjs` and re-authenticated by rea.
- Each pass imports and analyses the binary once (about 23 s); every query after that answers in under 0.1 s. The same query returned the same `evidence_id` in every pass: the analysis is deterministic.

## Findings

| # | Finding | Evidence | Confidence |
|---|---|---|---|
| 1 | 6 segments, 388 procedures and 254 strings | `ev_6439559871cd0307` | derived |
| 2 | 103 procedures are imports and 285 are internal; Ghidra names 215 of them (C runtime and startup code) and leaves 70 as `FUN_…` | `ev_8323a93243b6f54a` | observed |
| 3 | It is an ANSI build: the window APIs are the `A` variants (`LoadStringA`, `RegisterClassExA`, `CreateWindowExA`…) | `ev_8323a93243b6f54a` | observed |
| 4 | `FUN_004014e0` loads two resource strings, registers the window class and runs the `GetMessageA` loop | `ev_5114411afdb29dfc`, `ev_5098d42c7be09ba0`, `ev_a6091642625a853c`, `ev_32a79de023a19b38`, `ev_191d2403a9b94fc8` | observed |
| 5 | `FUN_00401040` creates, shows and updates the main window | `ev_e760d08701c565d9`, `ev_c3254c1d91338855`, `ev_fb2efd603343840f` | observed |
| 6 | `FUN_00401240` is the window procedure: it handles messages 2, 0xF and 0x111 and passes the rest to `DefWindowProcA` | `ev_dd6016368760a7f5`, `ev_b5b5bb534228759a`, `ev_56a22b2ddc6db966`, `ev_cc202770a82fef13` | observed |
| 7 | `DialogBoxParamA` is called once, at `0x4012f7` inside the window procedure, through the import table | `ev_bcebb45f66f848ee`, `ev_ca154568e68592a8` | observed |
| 8 | The dialog procedure at `0x4010a0` is only passed as a pointer and Ghidra did not turn it into a function | `ev_cc202770a82fef13`, `ev_45cd3403317548d6` | observed |

## Decompiled code against the original source

| Ghidra pseudocode | Original source | Note |
|---|---|---|
| `FUN_004014e0` | `_tWinMain` | Its first two calls are `addPeople` and `initializePeople` |
| `LoadStringA(param_1, 0x67, …)`, `LoadStringA(param_1, 0x6d, …)` | `IDS_APP_TITLE` (103), `IDC_WINHELLOCPP` (109) | Resource identifiers survive only as numbers |
| `FUN_00401390` plus `RegisterClassExA` in the caller | `MyRegisterClass` | The compiler moved the registration call into `WinMain` |
| `FUN_00401040` | `InitInstance` | Practically identical |
| `FUN_00401240` | `WndProc` | `WM_DESTROY` (2), `WM_PAINT` (0xF), `WM_COMMAND` (0x111); menu items 0x68 (`IDM_ABOUT`, 104) and 0x69 (`IDM_EXIT`, 105) |
| `FUN_00401130(hdc, left, top, right, bottom)` | `doPaint(hdc, ps.rcPaint)` | The `RECT` passed by value becomes four arguments |
| `__security_check_cookie(…)` | not in the source | Stack protection added by the compiler (`/GS`) |
| `LAB_004010a0` | `About` | A function that is only reachable through a pointer |

The window procedure, as Ghidra rebuilt it:

```c
if (param_2 == 2) { PostQuitMessage(0); return; }                 /* WM_DESTROY */
if (param_2 == 0xf) { /* BeginPaint, FUN_00401130, EndPaint */ }   /* WM_PAINT */
if (param_2 != 0x111) { DefWindowProcA(param_1, param_2, param_3, param_4); return; }
if ((param_3 & 0xffff) == 0x68)                                    /* IDM_ABOUT */
  DialogBoxParamA(DAT_0040f064, (LPCSTR)0x67, param_1, (DLGPROC)&LAB_004010a0, 0);
else if ((param_3 & 0xffff) == 0x69) DestroyWindow(param_1);       /* IDM_EXIT */
```

Condensed from the pseudocode in `ev_cc202770a82fef13`; the comments come from the original source.

## Inferred, not observed

- The names `WinMain`, `InitInstance`, `WndProc` and `About` come from comparing the code with the original source. rea does not name them: the Windows provider is read-only, so functions cannot be renamed during the session.
- Reading 0x68 and 0x69 as `IDM_ABOUT` and `IDM_EXIT` relies on the project's `Resource.h`.

## Agent mistakes

- The first pass looked for the wide APIs (`RegisterClassExW`, `CreateWindowExW`, `DialogBoxParamW`) and got `name_not_found` for all three. The import list showed an ANSI build, and the second pass used the `A` names.

## Open questions

- The dialog procedure at `0x4010a0` is not a function in Ghidra's analysis, so rea cannot decompile it. Creating it would need a write operation that the read-only Windows provider does not offer.

## Cost

- Five rea sessions (four exploratory and one final), each with one Ghidra import of about 23 s.
- Agent tokens were not measured for this first writeup; from the next one on, the cost is recorded per session.

## Reproduce

```powershell
npm ci
npm run setup
node scripts/rea-session.mjs writeups/2026-10-winhellocpp/session-plan.json build/winhellocpp
node scripts/sanitize.mjs build/winhellocpp/bundle.json build/winhellocpp/evidence.json
```

With rea 6.4.0 and Ghidra 12.1.4, the records come out with the same `evidence_id` values as [evidence.json](evidence.json). Other rea versions produce different identifiers, because the analysis profile is part of the hash.

## License

The text of this writeup is released under CC BY 4.0. The evidence files and the decompiled excerpts derive from an exercise that ships with Ghidra (National Security Agency) and remain under the [Apache License 2.0](../../LICENSE-Apache-2.0). Changes: decompiled and analysed with rea 6.4.0 and Ghidra 12.1.4; in the evidence files, local paths were reduced to `<target>/` plus the file name.
