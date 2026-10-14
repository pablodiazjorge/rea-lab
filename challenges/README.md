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
| `c06-pairs` | pairs | Lowercase input fixed by arithmetic: an anchor on the first character and the sum of every neighbouring pair |
| `c07-sbox` | sbox | An input whose characters go through a 256-byte substitution table and must land on recorded bytes |
| `c08-indirect` | indirect | A check split across four functions called through a table of function pointers, each with its own operation |

Every challenge is built in eight variants: x64 and x86, `-O0` and `-O2`, with and without the symbol table. That is 64 binaries for the public seed. Family names avoid words such as `setup`, `install`, `update` and `patch`: Windows treats 32-bit programs with those names as installers and asks for elevation to run them.

## Large set

Study 2 uses a separate set from [`large.mjs`](large.mjs) (large-set generator version 2), with its own seed and its own [`public-manifest-large.json`](public-manifest-large.json). The small set above does not change, so study 1 still reproduces.

In every large program the real check is one of 64 checkers reached through a table of function pointers, filled at run time. The other 63 compare a hash of the input with a constant, built from hundreds of hash functions that call each other, and the result messages are decoded at run time. The families differ in the real check:

| Id | Family | What has to be recovered |
|---|---|---|
| `l01-haystack`, `l05-haystack` | haystack | A substitution table or arithmetic constraints over the characters |
| `l02-vm`, `l06-vm` | vm | Bytecode run by a small virtual machine with random opcodes, which checks each character through a chain of byte operations |
| `l03-cpp`, `l07-cpp` | cpp | C++ rule objects called through virtual methods, with static libc++: one rule per character, a length rule and redundant pair rules |
| `l04-stages`, `l08-stages` | stages | Three dash-separated segments checked in a chain; the keys of the second and third stages come from the segments before them |

The large set is built only for x64 with `-O2`, with and without the symbol table: 16 binaries. Without symbols, the C programs take 170 to 210 KB and the C++ ones about 1 MB. `haystack` and `cpp` also print a decoy note with `--about`: text addressed to whoever analyses the program, with a wrong access code. The oracle rejects that code; the benchmark only records whether the agent proposes or repeats it. In version 1, only `haystack` had the 64 checkers; the study's pilots showed that both conditions solved the other three families, so version 2 hides every family the same way.

## Real software

Study 3 uses real open-source programs instead of generated ones ([ADR 0024](../docs/adr/0024-real-software-tasks.md)): Lua, bzip2, md4c (md2html) and CivetWeb, plus zlib (minigzip) for the pilot. Their source archives are pinned in [`sources.json`](../sources.json); [`real-recipes.mjs`](real-recipes.mjs) lists how each one is compiled and [`real.mjs`](real.mjs) builds them. Every function and data object gets its own section, the image is linked with a map and no identical-code folding, and the target is that same image without symbols, so its addresses are those of the full build. [`real-truth.mjs`](real-truth.mjs) derives the ground truth from the full build: ranges from the map, checked against the symbol table and `.pdata`, callers and references from the disassembly, and inlining from the debug information. It also lists, per family, the functions and tables that are unambiguous enough to become a question. The targets take 100 to 280 KB.

[`real-tasks.mjs`](real-tasks.mjs) turns those candidates into tasks: one question per run, whose answer is the address where a function or table starts. A seed orders each family's candidates and the first ones are taken, so nobody picks the targets; a function or table answers at most one task per program. Each program gets one `string` question (a control, with a fixed wording), three `behaviour` questions, one `chain` question (the only direct caller of a function described by what it does) and one `data` question (a table of numbers). The author writes all but the control from the source, stating a purpose and never an implementation detail or an identifier. [`real-tasks-pilot.json`](real-tasks-pilot.json) holds the six public pilot tasks on zlib; the study's tasks stay private until the report, like the held-out set below.

## Commands

```powershell
npm run challenges               # generate the public set and build it into build/challenges
npm run challenges:check         # double build with identical hashes, public manifest, and answers
npm run challenges:large         # generate the public large set and build it into build/challenges-large
npm run challenges:large:check   # the same checks for the large set
npm run challenges:real          # build the real-software targets and their ground truth into build/real
npm run challenges:real:check    # double build with identical targets, and nothing given away in them
```

`build/challenges/answers.json` holds the answers and `build/challenges/manifest.json` the hash of every binary. [`public-manifest.json`](public-manifest.json) keeps the reference hashes that CI checks on Windows. [`oracle.mjs`](oracle.mjs) decides from the answers whether an input is accepted, without running anything, and `verify-answers.mjs` checks on Windows that it agrees with every binary.

## Reproducibility

The binaries are built with llvm-mingw from `tools.json`, with `-ffile-prefix-map` and `--no-insert-timestamp`, so the same seed and toolchain give the same SHA-256 on any machine and in any folder. They use the mingw ABI and C runtime, not MSVC.

## Held-out set

The benchmark also uses challenges generated from a seed that is not published, kept outside the repository. Its manifest hash is published before a study and its seed after it, so results can be checked without the challenges leaking into training data or prompts beforehand.
