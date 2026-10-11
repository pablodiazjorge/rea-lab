# c02-xor: what an optimising compiler does to an XOR-hidden passphrase

<p><a href="README.es.md">Leer en español</a></p>

The first writeup on one of the lab's own challenges, so the answer is known before starting. `c02-xor` stores its passphrase XOR-encoded with a one-byte key and decodes it while checking the input. The agent analysed two variants built from the same source, both stripped of symbols: one without optimisation (`-O0`) and one optimised (`-O2`). The surprise is in the second one.

## Targets

| | `c02-xor-x64-O0-strip.exe` | `c02-xor-x64-O2-strip.exe` |
|---|---|---|
| SHA-256 | `63d3ae96dd7dcb7b62b49534b645c72695a05b71613960abf962e174500dacf4` | `4ec8d5c0ccdacb378dd0de8113b6cf9b0b04f3194e346a3d6b1bb41eccc5f25f` |
| Size | 10,752 bytes | 10,752 bytes |
| Build | llvm-mingw 20261006, x64, no symbols | the same, with `-O2` |

Both are rebuilt from the public seed with `npm run challenges`, and their hashes are in [`challenges/public-manifest.json`](../../challenges/public-manifest.json). See [provenance](provenance.json).

## Method

- rea 6.4.0 over MCP with Ghidra 12.1.4 and Temurin JDK 21, on Windows 11.
- The agent (Claude Code, Opus 5.5) started from the only visible clue in a stripped binary, the strings `ACCESS GRANTED` and `ACCESS DENIED`, followed their references to the function that prints them and decompiled it. One final session per variant produced [evidence-o0.json](evidence-o0.json) and [evidence-o2.json](evidence-o2.json), 7 records each.
- The recovered answer was then checked against `build/challenges/answers.json`, and `challenges/verify-answers.mjs` confirms that every variant accepts it.

## Findings

| # | Finding | Evidence | Confidence |
|---|---|---|---|
| 1 | Without symbols, the only foothold is the two result strings | `ev_0ac6c080aa49665f`, `ev_6d738a84a9b1efce` | observed |
| 2 | At `-O0`, the function that prints the result (`FUN_140001470`) calls a separate check, `FUN_140001510` | `ev_b3191df5fd04c0a6`, `ev_549e3c3463e8e8f2` | observed |
| 3 | The check requires 14 characters and compares each input byte XOR `0x51` with the encoded bytes `"6#>'4\|38#29\|ha"` | `ev_c8c0bb3bb98491a2` | observed |
| 4 | Decoding those bytes gives `grove-birch-90` | finding 3 | derived |
| 5 | At `-O2`, the check is inlined, the XOR is gone and the input is compared directly with the plaintext characters `g r o v e - b i r c h - 9 0`, spread over SIMD lanes, plus a length check of 14 | `ev_bc7dcdc955b10041` | observed |
| 6 | Both variants lead to the same answer, which matches the ground truth (`grove-birch-90`, key `0x51`) | `build/challenges/answers.json` | verified |

The check at `-O0`, as Ghidra rebuilt it:

```c
if (strlen(param_1) == 0xe) {
  for (local_20 = 0; local_20 < 0xe; local_20++) {
    if ((byte)(param_1[local_20] ^ 0x51U) != "6#>'4|38#29|ha"[local_20]) return 0;
  }
  return 1;
}
```

And a fragment of the same check at `-O2`, where the compiler has already done the decoding:

```c
-(SUB81(local_98._0_8_,1) == 'r')  ...  -((char)local_98._0_8_ == 'g')
-(SUB81(local_98._0_8_,2) == 'o')  ...  -(SUB81(local_98._0_8_,3) == 'v')
if (sVar5 != 0xe) pcVar4 = "ACCESS DENIED";
```

## Why the obfuscation disappeared

The encoded bytes and the key are both compile-time constants, so at `-O2` the compiler evaluates `encoded[i] ^ 0x51` while compiling, inlines the check into `main` and vectorises the comparison. The plaintext ends up in the binary as immediate values. A constant XOR protects nothing from an optimising compiler, and the decompiled output is noisier but more direct: the answer can be read without decoding anything.

## Inferred, not observed

- Calling `FUN_140001470` the program's `main` comes from its behaviour (it reads a line, checks it and prints the result), not from a symbol.
- The order of the characters at `-O2` is read from the byte offsets in the SIMD comparisons; the ground truth confirms it.

## Agent mistakes

- None in the final sessions. Locating the check took four short passes per variant because each pass reopens the binary to resolve the next address.

## Open questions

- None about the answer. A held-out variant of this family will tell whether an agent finds the passphrase without the known source and seed.

## Reproduce

```powershell
npm ci
npm run setup
npm run challenges
node scripts/rea-session.mjs writeups/2026-10-own-xor/session-plan-o0.json build/own-xor-o0
node scripts/rea-session.mjs writeups/2026-10-own-xor/session-plan-o2.json build/own-xor-o2
```

The binaries are reproducible, so with rea 6.4.0 and Ghidra 12.1.4 the records match the published Evidence after `scripts/sanitize.mjs`.

## License

The challenge code is MIT; this writeup and its evidence data are released under CC BY 4.0.
