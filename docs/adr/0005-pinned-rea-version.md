# rea is pinned to an exact version

Status: accepted

`rea-agents` is pinned (6.4.0) with a lockfile. Upgrades happen in a dedicated change that reviews the changelog and reruns doctor, the smoke test and part of the benchmark, and never during a study. rea is not registered globally and its skill is not installed in the user profile, so benchmark runs start from a clean state.
