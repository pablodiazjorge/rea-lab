# Published evidence is sanitised and re-import tested

Status: accepted (F3), amended in F4

Evidence exported from rea is published with `subject.name` and `subject.local_path` replaced, which is safe because neither field is part of the `evidence_id` hash (`dist/domain/evidence.js` in rea). `scripts/sanitize.mjs` checks that rea re-imports the sanitised bundle. Sanitised raw transcripts are attached to releases instead of being committed.

Amended in F4: no transcripts were attached to releases. Raw transcripts are not published at all, because they hold local paths; benchmark studies publish a sanitised report and per-run results under `bench/results/<study>/`, written by `bench/report.ts --publish`.
