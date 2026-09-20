

## Governed automatic release — 2026-09-20

Publication stays automatic on the registered production branch after the provider build gate is activated. Its exact source, live ancestry, capability paths, artifact and bootstrap evidence are bound in `.release/policies.json`; the provider pins `.release/guard.mjs` and this policy by SHA-256. Runtime identity is read from `/__release.json` after activation. The first build must preserve existing live asset fingerprints; no application data or identity flow changes are part of this control installation. Do not publish from an older or dirty checkout or run a second direct lane. Manual publication must preserve the provenance watermark and source lineage. Historical deployment IDs below remain dated evidence; latest live metadata is not accepted merely by copying it. Operational rollback of the gate restores only the recorded previous build/source settings after source validation, never a blanket old-source deploy. Workspace evidence: `/Users/ylsuen/CF/reports/operations/release-governance-auto-20260920/`.


## Publishing authority verified 2026-09-20

- Pages `sharing`: verified production `476d1fd3-ee5c-4306-a9cd-9e429fcf64cb`, source `01fe8fd6a132fdafa5e4d6cdc6405c51ec9abed9`, 3 artifact entries; policy `.release/sharing.json`. Automatic production remains enabled through the provider-pinned guard.
- Pages `sub`: verified production `fa276460-1310-4688-a784-8bbd36807498`, source `01fe8fd6a132fdafa5e4d6cdc6405c51ec9abed9`, 32 artifact entries; policy `.release/policies.json`. Automatic production remains enabled through the provider-pinned guard.
- Pages `blogs`: verified production `7e69d978-2056-4738-85c9-5358bbdaa364`, source `01fe8fd6a132fdafa5e4d6cdc6405c51ec9abed9`, 5 artifact entries; policy `.release/policies.json`. Automatic production remains enabled through the provider-pinned guard.
- Pages `school-links`: verified production `252905de-6bba-4799-9582-65ca9bbcc5b8`, source `01fe8fd6a132fdafa5e4d6cdc6405c51ec9abed9`, 3 artifact entries; policy `.release/policies.json`. Automatic production remains enabled through the provider-pinned guard.

These are dated release receipts, not permission to replay an old source. Current publication must use the registered exact repository/branch/target, preserve accepted production ancestry and capabilities, verify the built artifact and live baseline, then read back the actual result. A clean checkout, newer timestamp or default branch alone is insufficient. Existing project-specific acceptance gates remain binding. No second production publisher is allowed. Current source/control operations and rollback evidence: `/Users/ylsuen/CF/reports/operations/release-governance-auto-20260920/REPORT.md`; fleet routing: `/Users/ylsuen/CF/platform/release-authority.json`. Retired workflow definitions are recovery evidence only.
