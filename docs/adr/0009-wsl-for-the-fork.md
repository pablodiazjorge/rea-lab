# Full rea suite and native addon in WSL, Windows only for lanes

Status: accepted

The rea fork's full test suite and its native addon (built with mingw-w64, Linux only) run in WSL, and commits to the fork are made there. The Windows checkout under `repos/rea` only fetches and runs the Windows verification lanes. `.wslconfig` caps WSL memory (about 12 GB) because Ghidra, the agent and WSL share 32 GB.
