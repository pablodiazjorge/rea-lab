# Challenges

<p><a href="README.es.md">Leer en español</a></p>

Small Windows programs built from this repository, so every answer is known exactly (ADR 0011). Each one reads a line from standard input and prints `ACCESS GRANTED` or `ACCESS DENIED`. They are the ground truth for the writeups and, later, for the benchmark.

## Families

| Id | Family | What has to be recovered |
|---|---|---|
| `c01-compare` | compare | An input compared with a plain string literal |
| `c02-xor` | xor | An input stored XOR-encoded with a one-byte key |
| `c03-checksum` | checksum | The acceptance rule: fixed length, lowercase, position-weighted sum modulo a prime |
| `c04-table` | table | An input whose characters come from a switch over their position, shifted by a constant |
| `c05-state` | state | A state machine over the input characters, with a fall-back transition in every state |

Every challenge is built in eight variants: x64 and x86, `-O0` and `-O2`, with and without the symbol table. That is 40 binaries for the public seed.

## Commands

```powershell
npm run challenges          # generate the public set and build it into build/challenges
npm run challenges:check    # double build with identical hashes, public manifest, and answers
```

`build/challenges/answers.json` holds the answers and `build/challenges/manifest.json` the hash of every binary. [`public-manifest.json`](public-manifest.json) keeps the reference hashes that CI checks on Windows. [`oracle.mjs`](oracle.mjs) decides from the answers whether an input is accepted, without running anything, and `verify-answers.mjs` checks on Windows that it agrees with every binary.

## Reproducibility

The binaries are built with llvm-mingw from `tools.json`, with `-ffile-prefix-map` and `--no-insert-timestamp`, so the same seed and toolchain give the same SHA-256 on any machine and in any folder. They use the mingw ABI and C runtime, not MSVC.

## Held-out set

The benchmark also uses challenges generated from a seed that is not published, kept outside the repository. Its manifest hash is published before a study and its seed after it, so results can be checked without the challenges leaking into training data or prompts beforehand.
