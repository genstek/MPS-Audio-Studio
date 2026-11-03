# LAS-11 — Resume paused audio with either Pause or Play

Jira: https://genstek69.atlassian.net/browse/LAS-11  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-5  
Sprint field: **Unscheduled foundation work; do not assign a sprint silently.**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Make Pause toggle playing↔paused using the real engine; Play must also resume from pause. Keep Stop resetting to zero.
- Use explicit transport state and guards for pending resume/load operations; repeated gestures must never create two active sources.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-11-QA-01 | Playing → Pause → Pause → resumes at the same offset. | NOT_RUN |
| LAS-11-QA-02 | Playing → Pause → Play → resumes at the same offset. | NOT_RUN |
| LAS-11-QA-03 | Repeated toggles and Stop → no overlapping playback; empty/decoding controls stay consistent. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-11-AC-01 | While playing, Pause pauses playback and preserves the position. | NOT_RUN | Pending implementation/evidence |
| LAS-11-AC-02 | While paused, clicking Pause again resumes from that position. | NOT_RUN | Pending implementation/evidence |
| LAS-11-AC-03 | While paused, clicking Play also resumes from that position. | NOT_RUN | Pending implementation/evidence |
| LAS-11-AC-04 | Stop resets the position; the next Play starts from the beginning. | NOT_RUN | Pending implementation/evidence |
| LAS-11-AC-05 | Transport UI reflects the actual playback state. Repeated toggling must not create overlapping playback. | NOT_RUN | Pending implementation/evidence |
| LAS-11-AC-06 | Add regression coverage for both resume paths and Stop/reset. Use deterministic transport tests and Playwright UI assertions. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-11/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-11/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-11/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-11/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-11/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Requested behavior

Allow the Pause button to toggle pause/resume. When audio is paused, the user can resume from the saved position by clicking either Pause again or Play.

## Current behavior reported by the user (2026-10-19)

Play starts playback. Pause pauses playback; Play resumes from the same position. Stop resets the position and the next Play starts from the beginning. The user confirmed this current behavior is correct and withdrew the initial bug assessment. This story is a requested enhancement. These observations are user-reported, not independently executed checks.

## Acceptance criteria

1. While playing, Pause pauses playback and preserves the position.
2. While paused, clicking Pause again resumes from that position.
3. While paused, clicking Play also resumes from that position.
4. Stop resets the position; the next Play starts from the beginning.
5. Transport UI reflects the actual playback state. Repeated toggling must not create overlapping playback.
6. Add regression coverage for both resume paths and Stop/reset. Use deterministic transport tests and Playwright UI assertions.

## Planning

Future backlog item under SCRUM-5, outside the current SCRUM-10 learning task. Implementation has not started. Related existing transport story: SCRUM-9.
