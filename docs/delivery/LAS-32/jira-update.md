**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-32

Scope: **Propose settings** in the Compare dialog. It builds a complete EQ, compressor and limiter chain from the measured mix-versus-reference differences:
- octave bells fitted and refined by rendering and measuring the section;
- slow compression only when it measurably brings the loudness range closer;
- limiter input gain towards the reference's loudness;
- a final render checked against every guard.

Module cards show the measured reason, values, range, guard notes and uncertainty. Width is reported but never proposed. Strength 0–100 %; Preview without changing settings; Check at a strength; Apply as one undo step; Reject. The UI states that it does not recover how the reference was mastered.
Branch / PR: feat/LAS-32-reference-proposal → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: 20323dbb5ac38d0e373f0dc0b6be9ede20fdc038
Material: docs/delivery/LAS-32/ on the delivery branch

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 reason/values/range/uncertainty per module | unit + browser (Node-identical cards) | PASS | evidence/playwright-proposal.txt |
| AC-02 guards against boosts, overcompression, width | unit tests, 7 cases | PASS | evidence/proposal-examples.md |
| AC-03 preview, strength, edit, reject, undo; original kept | browser workflow | PASS | evidence/playwright-proposal.txt |
| AC-04 matched-loudness listening and numerical checks on actual inputs | numerical PASS; listening NOT_RUN | PARTIAL | evidence/proposal-examples.md, manual-qa.md |

Commands/environment: npm run check exit 0 (ESLint clean, Vitest 248/248, build OK, Playwright 73/73, Chromium 141, Linux, Node 22.22); npm run scan:artifacts exit 0 (131 pieces, 0 findings).
Manual QA: docs/delivery/LAS-32/manual-qa.md — QA-01 reproducible recipe, QA-02 adversarial pairs, QA-03 preview/reject/apply/undo plus the listening record; Gennady execution NOT_RUN.
Limitations/blockers: listening evaluation NOT_RUN; one section drives the proposal; octave EQ only; the compressor addresses loudness range only; no width processor; proposing takes about 5–13 s per section; Lia v6 BLOCKED until the authorized file and checksum; provisional styling; Mac not run.
Disposition: READY_FOR_QA (numerical and workflow); listening part NOT_RUN

No claim of manual sign-off, Jira closure or main merge is implied.
