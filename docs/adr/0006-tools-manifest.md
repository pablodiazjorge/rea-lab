# tools.json is the single source of tool versions

Status: accepted (implemented in F1)

Ghidra, the JDK and llvm-mingw are described once in `tools.json` (URL, SHA-256 and where the hash comes from) and read by `scripts/setup.mjs`, `env.ps1`, the MCP launcher and CI. Setup verifies each hash before extracting into `tools/` and never touches PATH or the registry. When a vendor publishes no hash, the first verified download is pinned (trust on first use) and documented.
