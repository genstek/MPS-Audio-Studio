# LAS-12 — Unload the imported track and return the mixer to its empty state

Jira: https://genstek69.atlassian.net/browse/LAS-12  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-5  
Sprint field: **Unscheduled foundation work; do not assign a sprint silently.**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Add one accessible Remove track/Unload action for the current single-track session. Implement engine unload distinct from permanent engine disposal.
- Stop/disconnect active nodes, clear decoded buffer/metadata/offset and invalidate pending loads so removed audio cannot reappear. Preserve the source file.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-12-QA-01 | Unload while Playing, Paused and Stopped → silence, empty metadata, zero position and empty-state controls. | NOT_RUN |
| LAS-12-QA-02 | Unload during an in-flight replacement when the action is supported → a late decode cannot restore the removed track. | NOT_RUN |
| LAS-12-QA-03 | Reimport the same WAV and a different WAV → normal playback, with resources released and original bytes unchanged. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-12-AC-01 | With an imported track, a clearly named accessible action removes it from the current session. | NOT_RUN | Pending implementation/evidence |
| LAS-12-AC-02 | Unload works while playing, paused or stopped. Any active audio stops immediately and does not resume after removal. | NOT_RUN | Pending implementation/evidence |
| LAS-12-AC-03 | Track name and duration are cleared, transport position resets, and the mixer returns to the empty state with No audio loaded and the WAV import action. | NOT_RUN | Pending implementation/evidence |
| LAS-12-AC-04 | Play/Pause/Stop cannot start playback when no audio is loaded; their state matches the empty-state requirements. | NOT_RUN | Pending implementation/evidence |
| LAS-12-AC-05 | The user can import another WAV, or reimport the same WAV, and play it normally after unloading. | NOT_RUN | Pending implementation/evidence |
| LAS-12-AC-06 | Removing a track from the session does not delete or modify the original file on the device. Release resources associated with the removed audio. | NOT_RUN | Pending implementation/evidence |
| LAS-12-AC-07 | Add deterministic transport/resource cleanup checks and Playwright coverage for unload from playing/paused/stopped, empty state, and reimport. UI assertions alone do not prove audio has stopped. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-12/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-12/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-12/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-12/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-12/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User need

After importing a WAV, the user can currently replace it but reports no way to remove it from the mixer. Add an explicit Remove track / Unload action so the current single-track mixer can be cleared without selecting another file or reloading the page. Final visible wording can be chosen during implementation.

## Acceptance criteria

1. With an imported track, a clearly named accessible action removes it from the current session.
2. Unload works while playing, paused or stopped. Any active audio stops immediately and does not resume after removal.
3. Track name and duration are cleared, transport position resets, and the mixer returns to the empty state with No audio loaded and the WAV import action.
4. Play/Pause/Stop cannot start playback when no audio is loaded; their state matches the empty-state requirements.
5. The user can import another WAV, or reimport the same WAV, and play it normally after unloading.
6. Removing a track from the session does not delete or modify the original file on the device. Release resources associated with the removed audio.
7. Add deterministic transport/resource cleanup checks and Playwright coverage for unload from playing/paused/stopped, empty state, and reimport. UI assertions alone do not prove audio has stopped.

## Planning

Future backlog item under SCRUM-5, outside the current SCRUM-10 learning task. Implementation has not started. Initial scope is the current single-track mixer; per-track removal in a future multitrack mixer is outside this story.
