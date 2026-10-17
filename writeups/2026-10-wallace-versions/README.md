# Wallace v1 against v2: finding what changed between two builds

<p><a href="README.es.md">Leer en español</a></p>

Ghidra's version tracking exercise ships two builds of the same small program, `WallaceSrc.exe` and `WallaceVersion2.exe`, plus the source of three variants: the original and two modifications. The question for the agent: which modification is version 2, and what exactly changed? The source gives the ground truth, but the agent works only from the binaries.

## Targets

| | `WallaceSrc.exe` | `WallaceVersion2.exe` |
|---|---|---|
| SHA-256 | `168a175ccf74e80899d2519bbe6e1ae8b0fa2489af70e8cc0720afab1ad8b0ab` | `94510664e6578bec7391d6023af414e2d2d8c4ff58ed3f618dd549ff648015cf` |
| Size | 33,792 bytes | 33,792 bytes |
| Format | PE, x86, Visual C++ 2010 debug build | the same |

Both come from the Ghidra 12.1.4 distribution (Apache License 2.0) and are not redistributed here; see [provenance](provenance.json).

## The two candidate modifications

| Variant | Changes in the source |
|---|---|
| Mod1 | `likesCheese` stops being random (`rand() * 2 < 1`) and becomes `index % 3 == 0`; the gadget is also used on anyone who likes cheese |
| Mod2 | Everything in Mod1, plus a new person (`"Sheep"`) and a "broken" state in `Gadget` (`isBroken`, `setBroken`) |

## Method

- rea 6.4.0 over MCP with Ghidra 12.1.4 and Temurin JDK 21, on Windows 11.
- The agent (Claude Code, Opus 5.5) explored each binary over six short passes, then ran one final session per binary. The version 2 session also compared the functions with `compare_functions`, passing the `analyze_function` Evidence from the first session, and aggregated the results with `find_changed_behavior`.
- Evidence: [evidence-src.json](evidence-src.json) (11 records) and [evidence-version2.json](evidence-version2.json) (21 records, including the comparisons and four open questions that rea recorded itself). Both are sanitised and re-authenticated by rea.

## Findings

| # | Finding | Evidence | Confidence |
|---|---|---|---|
| 1 | Version 2 is not Mod2: neither binary contains the string `Sheep` | `ev_0eb6b69d4eb42447`, `ev_8f2925f92bc8f39d` | observed |
| 2 | Version 2 no longer imports `rand`, which the original calls once at `0x4117e7`; it has one procedure less (178 against 179) | `ev_96d11902f71008e6`, `ev_1cf6f3402959ac88`, `ev_a4a2390e4a8b8f6e`, `ev_f6fa92932d1efed7` | derived |
| 3 | `FUN_004117c0` (original) and `FUN_004117b0` (version 2) fill the same field at offset `0x24`: from `rand() * 2 < 1` to `1 - (index % 3 != 0)`, that is, `index % 3 == 0` | `ev_612b04f018d155b2`, `ev_4bf9c8e45ae356af` | observed |
| 4 | In the function that uses the gadget, the condition `strcmp(name, "Wallace") == 0` gains `\|\| field_0x24 != 0`, and its control flow goes from 9 to 10 basic blocks | `ev_43c88a46453da827`, `ev_d8896ac93b541bb7`, `ev_9b39d934e2c35b14` | observed |
| 5 | The field at `0x24` written in finding 3 is the one read in finding 4, so the new condition is "uses the gadget on anyone who likes cheese" | `ev_612b04f018d155b2`, `ev_d8896ac93b541bb7` | inferred |
| 6 | Version 2 is Mod1 | findings 1 to 5 | inferred |

The change in the decompiled code:

```c
/* original, FUN_004117c0 */          iVar1 = rand(); *(bool *)(param_1 + 9) = iVar1 * 2 < 1;
/* version 2, FUN_004117b0 */         *(char *)(param_1 + 9) = '\x01' - (local_c % 3 != 0);

/* original, gadget loop */           if (iVar1 == 0) {
/* version 2, gadget loop */          if ((iVar1 == 0) || (*(char *)(local_24 + 0x24) != '\0')) {
```

## What rea's comparison says, and how to read it

`compare_functions` reports every textual dimension as `changed` for all three functions, including `addPeople`, which did not change in the source. Its own Evidence explains why: provider text is compared without relocation normalisation, and address-derived names (`FUN_…`, `LAB_…`) shift between builds.

| Dimension | `addPeople` (unchanged, control) | `initializePeople` (changed) | gadget function (changed) |
|---|---|---|---|
| Pseudocode text | `changed`, 639 → 639 characters | `changed`, 583 → 493 | `changed`, 1,174 → 1,216 |
| Calls | `changed`, 2 → 2 | `changed`, **2 → 0** | `changed`, 5 → 5 |
| Control flow graph (address-normalised) | **unchanged** | changed | changed, **9 → 10 blocks** |

The control flow graph, the only dimension rea normalises by address, separates the real changes from the noise. For an agent, a `changed` status with identical counts on both sides most likely means shifted addresses, not new behaviour.

## Inferred, not observed

- Findings 5 and 6 combine several observations; they are consistent with the source of Mod1, but rea itself leaves the cross-version identity of the functions as an open question.
- Matching `FUN_004117c0` with `initializePeople` and `FUN_004118f0` with the gadget function relies on the call to `rand`, the references to `"Wallace"` and the source.

## Agent mistakes

- `procedure_callers` on the `strcmp` thunk returned nothing: in this debug build the calls go through an incremental linking table that Ghidra does not chain to the real callers. The agent switched to the references to the string `"Wallace"` instead.

## Open questions

rea recorded four open questions in the version 2 bundle: one per function comparison, because address-derived names are not a stable identity across versions, and "Did both versions behave the same under a complete controlled replay?". Everything here is static analysis; no binary was executed.

## Reproduce

```powershell
npm ci
npm run setup
node scripts/rea-session.mjs writeups/2026-10-wallace-versions/session-plan-src.json build/wallace-src
node scripts/rea-session.mjs writeups/2026-10-wallace-versions/session-plan-version2.json build/wallace-version2
```

With rea 6.4.0 and Ghidra 12.1.4 the records match the published Evidence; sanitise each `bundle.json` with `scripts/sanitize.mjs` to compare.

## License

The text of this writeup is released under CC BY 4.0. The evidence files and the decompiled excerpts derive from an exercise that ships with Ghidra (National Security Agency) and remain under the [Apache License 2.0](../../LICENSE-Apache-2.0). Changes: decompiled and analysed with rea 6.4.0 and Ghidra 12.1.4; in the evidence files, local paths were reduced to `<target>/` plus the file name.
