# The mod journal lives outside the user's repository

Status: accepted (F5), amended for rea-casebook 1.0.4

The mod writes one JSONL journal per session under `~/.rea-casebook/`. Only what the user explicitly exports lands in a project, so no paths or evidence leak into repositories by accident.

Amended for rea-casebook 1.0.4: the Markdown export and the artifact page are written there too, beside the session's journal (`~/.rea-casebook/<day>/<session>.*`), so the mod writes nothing into the user's project. Moving an export into a writeup is a manual step.
