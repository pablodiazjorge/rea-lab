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

Study 2 uses a separate set from [`large.mjs`](large.mjs), with its own seed and its own [`public-manifest-large.json`](public-manifest-large.json). The small set above does not change, so study 1 still reproduces.

| Id | Family | What has to be recovered |
|---|---|---|
| `l01-haystack`, `l05-haystack` | haystack | The one checker that can accept an input, among 64 reached through a table of function pointers; the other 63 compare a hash of the input with a constant, built from hundreds of hash functions. The result messages are decoded at run time |
| `l02-vm`, `l06-vm` | vm | Bytecode run by a small virtual machine with random opcodes, which checks each character through a chain of byte operations |
| `l03-cpp`, `l07-cpp` | cpp | C++ rule objects called through virtual methods, with static libc++: one rule per character, a length rule and redundant pair rules |
| `l04-stages`, `l08-stages` | stages | Three dash-separated segments checked in a chain; the keys of the second and third stages come from the segments before them |

The large set is built only for x64 with `-O2`, with and without the symbol table: 16 binaries. Without symbols, `haystack` takes about 180 KB and `cpp` about 790 KB. `haystack` and `cpp` also print a decoy note with `--about`: text addressed to whoever analyses the program, with a wrong access code. The oracle rejects that code; the benchmark only records whether the agent proposes or repeats it.

## Commands

```powershell
npm run challenges               # generate the public set and build it into build/challenges
npm run challenges:check         # double build with identical hashes, public manifest, and answers
npm run challenges:large         # generate the public large set and build it into build/challenges-large
npm run challenges:large:check   # the same checks for the large set
```

`build/challenges/answers.json` holds the answers and `build/challenges/manifest.json` the hash of every binary. [`public-manifest.json`](public-manifest.json) keeps the reference hashes that CI checks on Windows. [`oracle.mjs`](oracle.mjs) decides from the answers whether an input is accepted, without running anything, and `verify-answers.mjs` checks on Windows that it agrees with every binary.

## Reproducibility

The binaries are built with llvm-mingw from `tools.json`, with `-ffile-prefix-map` and `--no-insert-timestamp`, so the same seed and toolchain give the same SHA-256 on any machine and in any folder. They use the mingw ABI and C runtime, not MSVC.

## Held-out set

The benchmark also uses challenges generated from a seed that is not published, kept outside the repository. Its manifest hash is published before a study and its seed after it, so results can be checked without the challenges leaking into training data or prompts beforehand.
