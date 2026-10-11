# Repository layout: one public lab repo with nested, ignored repos

Status: accepted

`rea-lab/` is the public lab repository. The Claude Code mod and the Windows checkout of the rea fork live inside it as separate repositories under `repos/`, which git ignores, so the whole project sits in one folder. The only exception is the main clone of the rea fork, which lives on the WSL ext4 disk (`~/src/rea`) because the rea test suite is too slow over `/mnt/c`. Each agent session is opened inside the repository it works on, so instructions, hooks and permissions never mix.
