# Portable per-project MCP registration for rea on Windows

<p><a href="portable-mcp-registration.es.md">Leer en español</a></p>

How this lab gives Claude Code the [rea](https://github.com/morluto/rea) MCP tools for one project only, with no personal paths in the repository and nothing installed system-wide. Measured on Windows 11 26H2 with rea 6.4.0 and Ghidra 12.1.4.

## The problem

- `rea setup` registers the server at user level (`~/.claude.json`), so every project sees it, and it writes the absolute paths of the machine that ran it.
- rea rejects relative values in `GHIDRA_INSTALL_DIR` and `JAVA_HOME`, so a committed configuration cannot simply point at `tools/`.
- Setting those variables system-wide would leak into every other tool and every other project.

## The approach

| Piece | Role |
|---|---|
| [`tools.json`](../../tools.json) | One manifest with each tool's URL, size, SHA-256 and extracted folder |
| [`scripts/setup.mjs`](../../scripts/setup.mjs) | Downloads, verifies size and hash before extracting, and keeps everything in `tools/` |
| [`scripts/rea-mcp.mjs`](../../scripts/rea-mcp.mjs) | Launcher: builds the absolute paths at runtime and starts rea in the same process |
| [`.mcp.json`](../../.mcp.json) | Project-scoped registration with no absolute path |
| [`.claude/settings.json`](../../.claude/settings.json) | Allows rea's tools and denies the ones that run a target, a browser or a device |

The registration only names the launcher, relative to the project:

```json
{
  "mcpServers": {
    "rea": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PROJECT_DIR:-.}/scripts/rea-mcp.mjs"],
      "timeout": 600000
    }
  }
}
```

The launcher finds the repository from its own location, reads `tools.json`, sets the absolute paths rea needs and hands over to rea's own entry point with the `mcp` argument. Running rea in the same process matters: when the client closes the server, no orphaned Node or Java process is left behind.

```js
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
Object.assign(process.env, {
  GHIDRA_INSTALL_DIR: toolFolder('ghidra'),
  JAVA_HOME: toolFolder('jdk'),
})
process.argv = [process.argv[0], entry, 'mcp']
await import(pathToFileURL(entry).href)
```

Diagnostics go to stderr only, because stdout carries the MCP protocol.

## Measurements

| What | Result |
|---|---|
| Fresh copy in another folder: `npm ci` plus `npm run setup` | Ready without editing a single path |
| Launcher start to `tools/list` | 14 to 17 s on a cold start, 170 tools |
| First `binary_overview` on a 108 KB x86 PE (Ghidra import and auto-analysis) | 34.6 s over MCP; `open_binary` 0.8 s and `close_binary` 0.3 s |
| Shutdown when the client closes stdin | Exit code 0, no `java` process and no temporary folders left |
| Interactive Claude Code session in the project | rea loaded from `.mcp.json` and answered correctly |

The `evidence_id` of that overview was identical from the CLI and over MCP, even though the binary sat in different folders: the local path is not part of rea's evidence hash, so published evidence can have its paths replaced without breaking its integrity.

## Things to know

- The first Ghidra-backed query does the import and the analysis, so it is the slow one. The per-server `timeout` gives it room; a small executable stays well below the two minutes after which Claude Code moves a long MCP call to the background.
- In headless mode (`claude -p`), the user's plugins still load, and an MCP server provided by a plugin connects even with `--strict-mcp-config`. Benchmarks need their own configuration directory.
- Until the folder has been trusted once, Claude Code ignores the `permissions.allow` entries of `.claude/settings.json`; `--allowedTools` still works on the command line.
- Only Claude Code has been tested. Other agents read MCP servers from their own configuration files; the launcher works the same for them, but this lab does not claim it until it has been verified.
