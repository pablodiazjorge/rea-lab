# Published evidence is sanitised and re-import tested

Status: accepted (F3), amended in F4 and after rea 6.6.0

Evidence exported from rea is published with `subject.name` and `subject.local_path` replaced, which is safe because neither field is part of the `evidence_id` hash (`dist/domain/evidence.js` in rea). `scripts/sanitize.mjs` checks that rea re-imports the sanitised bundle. Sanitised raw transcripts are attached to releases instead of being committed.

Amended in F4: no transcripts were attached to releases. Raw transcripts are not published at all, because they hold local paths; benchmark studies publish a sanitised report and per-run results under `bench/results/<study>/`, written by `bench/report.ts --publish`.

Amended after rea's 6.6.0 breaking change: the re-import check holds for the pinned rea 6.4.0 only. rea's `main` (from `db8128dc0`, announced for 6.6.0) requires `relationship_coverage` in every record and rejects historical records without it, without migrating saved files. On 16 October 2026 `main` at `781d5751a` rejected all five published bundles, and their unsanitised originals, with `evidence_integrity_mismatch`, while 6.4.0 imported all 64 records ([morluto/rea#4436](https://github.com/morluto/rea/issues/4436)). Re-importing them with a later rea needs the Evidence to be recreated with that version.
