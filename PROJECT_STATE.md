## Accepted frontend release — 2026-10-02 PDT / 2026-10-03 UTC

Canonical source is GitHub `ieduer/suen`, branch `main`. The local `/Users/ylsuen/CF/suen` compatibility path is historical archive, not a publishing checkout. Accepted runtime source is `e373bbbc40fa5a5ffcc7ac790b60f242f5d2facd`; later documentation commits do not change the runtime acceptance.

Sub2QR at https://t.bdfzer.com now encodes arbitrary links and text, with at most 40 batch entries and PNG/SVG/text exports. Existing subscription, node URI, sing-box, Shadowrocket and Clash tools remain. QR content is processed locally with UTF-8 ECI 26 and vendored MIT Nayuki 1.8.0. Subscription fetching occurs only after an explicit user action, with a 1 MB limit, 10-second timeout and no credentials/referrer or automatic storage.

NOW at https://bdfzer.com keeps the present-moment reminder with a Chinese classical book page, existing HuWenMingChao font, real local clock, calm/awake text modes, phrase switching and freeze/resume. Both frontends use paper #fffdf6, ink #1b1720, mango #fadc5e/#e8c53f and iris #a67eb7/#3a2a45; reduced motion and narrow screens are supported. Module tags explicitly use data-cfasync=false, and QR submit stays disabled until initialization; no global Rocket Loader setting changed.

| Pages target | Accepted deployment | Effective UTC |
| --- | --- | --- |
| sub | 26545095-bf99-4755-acd7-879feac2c80b | 2026-10-03T00:33:11.49826Z |
| blogs | c874e8f3-f38a-4aff-8efb-9aa2eccc3e21 | 2026-10-03T00:32:50.725463Z |
| sharing | 4e7385b4-f15c-463d-bed6-a402ab2ae055 | 2026-10-03T00:33:28.825331Z |
| school-links | 100d3693-1218-4e30-8cea-70fa94fb5d0f | 2026-10-03T00:32:30.062598Z |

The unchanged sharing and school-links outputs advanced source provenance through the same registered publisher; no new products were registered. All 52 assets, configurations and source identities were verified. Four functional tests, eight independent QR decodes, actual browser exports, mobile overflow checks and production clock/QR interaction passed. [Single private operations report](/Users/ylsuen/CF/reports/operations/status-three-20261002/REPORT.md) binds the exact evidence and baseline.

Public records: [Sub2QR](https://status.bdfz.net/?update=20261002-sub-universal-qr&revision=2) and [NOW](https://status.bdfz.net/?update=20261002-now-classical&revision=2). Revision 1 remains immutable; revision 2 corrects publication time from the prepared draft time to actual publication, preserving original effective times. sharing and school-links have explicit pending envelopes because no public Status siteKey exists; do not invent keys or add products under this release.

Rollback requires a reviewed forward Git revert of exact changed files, preserving later accepted work, and the existing native guarded publisher. Baseline deployments are recorded in frontend-baseline.json beside the report. Never deploy from an archive or blindly reset main. Docs-only commits use [CF-Pages-Skip] per [Cloudflare's GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/) and must leave the four accepted deployments unchanged. Guard, policies and build configuration remain pinned and unchanged.



## Governed automatic release — 2026-09-20

Publication stays automatic on the registered production branch after the provider build gate is activated. Its exact source, live ancestry, capability paths, artifact and bootstrap evidence are bound in `.release/policies.json`; the provider pins `.release/guard.mjs` and this policy by SHA-256. Runtime identity is read from `/__release.json` after activation. The first build must preserve existing live asset fingerprints; no application data or identity flow changes are part of this control installation. Do not publish from an older or dirty checkout or run a second direct lane. Manual publication must preserve the provenance watermark and source lineage. Historical deployment IDs below remain dated evidence; latest live metadata is not accepted merely by copying it. Operational rollback of the gate restores only the recorded previous build/source settings after source validation, never a blanket old-source deploy. Workspace evidence: `/Users/ylsuen/CF/reports/operations/release-governance-auto-20260920/`.


## Publishing authority verified 2026-09-20

- Pages `sharing`: verified production `476d1fd3-ee5c-4306-a9cd-9e429fcf64cb`, source `01fe8fd6a132fdafa5e4d6cdc6405c51ec9abed9`, 3 artifact entries; policy `.release/sharing.json`. Automatic production remains enabled through the provider-pinned guard.
- Pages `sub`: verified production `fa276460-1310-4688-a784-8bbd36807498`, source `01fe8fd6a132fdafa5e4d6cdc6405c51ec9abed9`, 32 artifact entries; policy `.release/policies.json`. Automatic production remains enabled through the provider-pinned guard.
- Pages `blogs`: verified production `7e69d978-2056-4738-85c9-5358bbdaa364`, source `01fe8fd6a132fdafa5e4d6cdc6405c51ec9abed9`, 5 artifact entries; policy `.release/policies.json`. Automatic production remains enabled through the provider-pinned guard.
- Pages `school-links`: verified production `252905de-6bba-4799-9582-65ca9bbcc5b8`, source `01fe8fd6a132fdafa5e4d6cdc6405c51ec9abed9`, 3 artifact entries; policy `.release/policies.json`. Automatic production remains enabled through the provider-pinned guard.

These are dated release receipts, not permission to replay an old source. Current publication must use the registered exact repository/branch/target, preserve accepted production ancestry and capabilities, verify the built artifact and live baseline, then read back the actual result. A clean checkout, newer timestamp or default branch alone is insufficient. Existing project-specific acceptance gates remain binding. No second production publisher is allowed. Current source/control operations and rollback evidence: `/Users/ylsuen/CF/reports/operations/release-governance-auto-20260920/REPORT.md`; fleet routing: `/Users/ylsuen/CF/platform/release-authority.json`. Retired workflow definitions are recovery evidence only.
