# LAS-9 — Implement real Play/Pause transport for imported WAV

Jira: https://genstek69.atlassian.net/browse/LAS-9  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-5  
Sprint field: **Unscheduled foundation work; do not assign a sprint silently.**  
Work mode: **VERIFY_AND_CLOSE_GAPS** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Keep engine-owned source/context lifecycle and user-gesture playback. Existing unit tests check saved offset and stop reset; visible status alone does not prove output timing.
- Reconcile the existing comment requesting elapsed time/playhead: add a minimal real engine time display if needed to satisfy observability, without treating a full waveform editor as already implemented.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-9-QA-01 | Known recognizable track → Play to a marked segment → Pause, wait, Play → resumes from the stored position. | NOT_RUN |
| LAS-9-QA-02 | Stop then Play → starts at zero; natural end resets to the documented state. | NOT_RUN |
| LAS-9-QA-03 | Rapid actions and a failed replacement decode → no overlapping sources, stale onended callback or UI freeze. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-9-AC-01 | Play disabled until audio is ready; click starts playback after browser user gesture. | NOT_RUN | Pending implementation/evidence |
| LAS-9-AC-02 | Pause stops/suspends and resume continues from expected position. | NOT_RUN | Pending implementation/evidence |
| LAS-9-AC-03 | Transport status and playhead reflect actual engine state. | NOT_RUN | Pending implementation/evidence |
| LAS-9-AC-04 | End-of-track returns to a clear stopped/ready state. | NOT_RUN | Pending implementation/evidence |
| LAS-9-AC-05 | Rapid Play/Pause clicks and failed decode do not crash/freeze the page. | NOT_RUN | Pending implementation/evidence |
| LAS-9-AC-06 | Deterministic unit/integration tests verify transport state transitions; Playwright verifies visible behavior and state. | NOT_RUN | Pending implementation/evidence |
| LAS-9-AC-07 | Behavior tested on at least Chromium; other browsers logged as pending until run. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-9/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-9/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-9/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-9/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-9/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User story

As a user, I want Play and Pause controls to operate on my imported audio so I can listen to it inside the web mixer.

## Acceptance criteria

1. Play disabled until audio is ready; click starts playback after browser user gesture.
2. Pause stops/suspends and resume continues from expected position.
3. Transport status and playhead reflect actual engine state.
4. End-of-track returns to a clear stopped/ready state.
5. Rapid Play/Pause clicks and failed decode do not crash/freeze the page.
6. Deterministic unit/integration tests verify transport state transitions; Playwright verifies visible behavior and state.
7. Behavior tested on at least Chromium; other browsers logged as pending until run.



## Existing issue comments (dated context)

### 2026-10-19T14:51:42.136+0300 — comment 10002

## QA observation — Pause vs Stop (2026-10-19)

Manual feedback: user hears both Pause and Stop silence playback and cannot distinguish their effect while using the mixer. Clarify expected user-facing behavior and verify resume position.

**Expected requirement**

* Pause freezes at the current elapsed position; next Play resumes there.
* Stop silences and resets position to 00:00; next Play starts from the beginning.
* Show an elapsed time/playhead so the difference is observable and testable; display Paused vs Stopped status.

**Current PR #2 code inspection** — https://github.com/genstek/MPS-Audio-Studio/pull/2 :

* src/audio-engine.js pause() saves offset based on AudioContext.currentTime; play() starts at saved offset; stop() resets offset to zero.
* tests/unit/audio-engine.test.js covers resume at mocked second 3 and restart at 0.
* src/main.jsx displays status labels but **no elapsed time/playhead**, and tests/e2e/playback.spec.js checks only 'Paused'/'Stopped' text, not audible/resume position.
* Thus same momentary silence is expected. Do not classify the underlying transport as a confirmed functional bug without a real-audio resume-vs-restart check.

**Manual cases to execute**
TC-TRANSPORT-001: Load recognizable WAV 2+ minutes → Play to 01:00 → Pause → wait → Play: continue at about 01:00 (not restart).  
TC-TRANSPORT-002: Load WAV → Play to 01:00 → Stop → Play: restart from 00:00.  
TC-TRANSPORT-003: Verify elapsed counter stays fixed on Pause, resets on Stop, and returns to 00:00 at natural completion (counter currently unimplemented).

**Automation follow-up**
Preserve engine unit test and add a meaningful Playwright user-facing timing/state test once timecode exists. For audio correctness, validate controlled waveform/sample offsets using deterministic fixture or instrumented audio engine; state labels alone are insufficient.
