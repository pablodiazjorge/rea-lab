# The mod captures evidence from tool calls

Status: proposed (F5)

rea keeps evidence in memory only, so the Claude Code mod wraps `tool.call` for `/^mcp__rea__/` and reads the evidence in each result, reconciling after every call instead of polling. Capture sits behind an `EvidenceSource` interface so an upstream journal can replace it later. A `PostToolUse` hook was rejected: it would duplicate the capture and cannot draw the pane.
