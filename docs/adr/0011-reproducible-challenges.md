# Seeded, reproducible challenges as ground truth

Status: accepted (F3), amended for study 3 and for study 5

Challenges are C programs generated from a seed and compiled with llvm-mingw reproducibly (prefix maps, no timestamps, double build in CI), so every answer is known exactly. A public set is published; a held-out set stays outside the repository, with its manifest hash published before a study and its seed after. Known limitation: the binaries use the mingw ABI and C runtime, not MSVC.

Amended for study 3: real-software tasks ([ADR 0024](0024-real-software-tasks.md)) follow the same held-out rule with a task file instead of a generated set. Its SHA-256 is published before the study, and the tasks, the ground truth and the seed of the target draw after.

Amended for study 5: anything the study compares that the author writes, such as an improved skill ([ADR 0025](0025-skill-comparison.md)), is frozen in a commit, with its SHA-256, before the held-out tasks are drawn. The preregistration records both hashes and that order.
