# Seeded, reproducible challenges as ground truth

Status: accepted (F3)

Challenges are C programs generated from a seed and compiled with llvm-mingw reproducibly (prefix maps, no timestamps, double build in CI), so every answer is known exactly. A public set is published; a held-out set stays outside the repository, with its manifest hash published before a study and its seed after. Known limitation: the binaries use the mingw ABI and C runtime, not MSVC.
