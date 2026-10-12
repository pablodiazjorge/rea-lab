# Function-comparison pairs

<p><a href="README.es.md">Leer en español</a></p>

Reproducible PE pairs for rea's `compare_functions`, offered in [morluto/rea#1947](https://github.com/morluto/rea/issues/1947): one small C program, [`pair.c`](pair.c), built in three variants.

| Variant | What changes against `base` |
|---|---|
| `base` | Nothing: the reference build |
| `reloc` | Only the layout: an extra function and string come first, so `unchanged`, `changed_constant` and `changed_call` move to new addresses with the same code |
| `change` | The same shift, plus two real changes: `changed_constant` tests `% 4` instead of `% 3`, and `changed_call` calls another helper |

A comparison that normalizes addresses should report all three functions unchanged between `base` and `reloc`, and only `changed_constant` and `changed_call` as changed between `base` and `change`.

```powershell
node fixtures/compare-pairs/build.mjs
```

The binaries land in `build/compare-pairs/<arch>-<opt>/` (x64 and x86, `-O0` and `-O2`, without symbols), with every SHA-256 in `manifest.json`. They use the same reproducible llvm-mingw flags as the [challenges](../../challenges/README.md), so the hashes match on any machine.
