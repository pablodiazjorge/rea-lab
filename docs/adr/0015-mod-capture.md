# The mod captures evidence from tool calls

Status: accepted (F5), amended for rea-casebook 1.0.4

rea keeps evidence in memory only, so the Claude Code mod wraps `tool.call` for `/^mcp__rea__/` and reads the evidence in each result, reconciling after every call instead of polling. Capture sits behind an `EvidenceSource` interface so an upstream journal can replace it later. A `PostToolUse` hook was rejected: it would duplicate the capture and cannot draw the pane.

The pane may also ask rea directly with `$.mcp.call("rea", tool, args)`. A probe on Claude Code 2.1.296 showed that this call goes through the agent's own connection: `binary_session` called by the mod reported no provider binding before the agent's `open_binary`, a binding right after it and none again after the agent's `close_binary`. So the mod sees the same rea session as the agent, and read-only queries such as `binary_session` or `list_unknowns` are safe to issue from the pane. Two limits apply. Results pass through Claude Code's MCP output limit, exactly as the agent's do: a large result (`binary_session` is about 290,000 characters) loses its structured content and arrives as a note naming the file where it was saved, so the pane prefers small queries and reads that file with `$.fs.read` (up to 4 MiB) when the note appears. And `$.mcp.call` asks no permission, so the mod only ever calls read-only rea tools.

Amended for rea-casebook 1.0.4: there is no separate `EvidenceSource` interface. Capture lives in the mod's `tool.call` hook, which is the single place to change if rea ships a journal.
