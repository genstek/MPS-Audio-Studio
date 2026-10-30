**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-30

Scope: References dialog — choose a reference WAV and a segment (≥ 5 s), label name/style/source version, measure on this device (LAS-26 analysis), save the file and its versioned profile to the private library, list by style, reanalyse reproducibly, delete. Server schema v4 with owner-private profiles tied to the stored file's SHA-256 and the segment; cascade deletion. States that nothing is trained from a profile.
Branch / PR: feat/LAS-30-reference-profiles → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: ad800eaef0c53355c2c75b00241fa5d4abf85db4
Material: docs/delivery/LAS-30/ on the delivery branch

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 profile records source/version/segment/analysis/definitions | server tests | PASS | evidence/vitest-references-verbose.log |
| AC-02 silence/unsuitable handled; versions and styles separate | server + browser tests | PASS | evidence/playwright-references.txt |
| AC-03 owner-private; deletion policy | two-user tests; cascades to 0 rows | PASS | evidence/vitest-references-verbose.log |
| AC-04 reproducible; no training claim | identical reanalysis; dialog wording | PASS | README |

Commands/environment: npm run check exit 0 (ESLint 0, Vitest 221/221, build OK, Playwright 67/67, Chromium 141, Linux, Node 22.22); npm run scan:artifacts exit 0 (125 pieces, 0 findings).
Manual QA: docs/delivery/LAS-30/manual-qa.md — QA-01 measure and save, QA-02 reanalyse and second account, QA-03 deletion; Gennady execution NOT_RUN.
Limitations/blockers: WAV only; saving needs an account; measurements computed on the owner's device (checksum-bound, not re-measured by the server); profiles not yet used (LAS-31/32); provisional styling; Mac not run.
Disposition: READY_FOR_QA

No claim of manual sign-off, Jira closure or main merge is implied.
