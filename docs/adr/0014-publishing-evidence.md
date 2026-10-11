# Published evidence is sanitised and re-import tested

Status: proposed (F3)

Evidence exported from rea is published with `subject.name` and `subject.local_path` replaced, which is safe because neither field is part of the `evidence_id` hash (`dist/domain/evidence.js` in rea). `scripts/sanitize.mjs` checks that rea re-imports the sanitised bundle. Sanitised raw transcripts are attached to releases instead of being committed.
