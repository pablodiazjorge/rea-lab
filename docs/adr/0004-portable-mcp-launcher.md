# Per-project MCP registration through a portable launcher

Status: accepted (implemented in F1)

`.mcp.json` starts `node scripts/rea-mcp.mjs`, which finds the repository root from `import.meta.url`, reads `tools.json`, sets the absolute paths rea requires (`GHIDRA_INSTALL_DIR`, `JAVA_HOME`), logs only to stderr and loads rea's `scripts/rea.mjs` in the same process with the `mcp` argument. This keeps personal paths and machine-wide environment variables out of the repository, and running in-process avoids leaving rea and its Java child orphaned. `rea setup` is not used because it only registers servers at user level.
