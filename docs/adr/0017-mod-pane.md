# What the mod pane shows

Status: accepted (F5)

The pane shows the target, Ghidra's state with a startup timer, the evidence timeline, open unknowns and findings. Findings are recorded through a tool registered by the mod that rejects any `evidence_id` not present in the session, so the agent cannot cite evidence it never produced. A case can be exported to Markdown (the writeup format) and to a Claude artifact.
