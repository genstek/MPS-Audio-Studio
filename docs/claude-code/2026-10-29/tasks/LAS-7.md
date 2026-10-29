# LAS-7 — Build runnable web mixer shell with Fostex-inspired channel strips

Jira: https://genstek69.atlassian.net/browse/LAS-7  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **In Progress** · Type: Story · Parent: LAS-5  
Sprint field: **SCRUM Sprint 0**  
Work mode: **VERIFY_EXISTING** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Audit the current React shell against this story; reuse the merged implementation rather than scaffold a second app.
- Check console/network errors, empty-state accessibility and disabled future processors. Capture the exact tested commit and current smaller-window behavior.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-7-QA-01 | Clean session → open the app at 1280×720 and 1440×900 → named Transport/Tracks/Master/Mixer regions and Import appear, without runtime errors. | NOT_RUN |
| LAS-7-QA-02 | Inspect unavailable processing controls → they remain disabled and clearly labeled until their real engine implementation lands. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-7-AC-01 | Documented command starts app locally with no console errors. | NOT_RUN | Pending implementation/evidence |
| LAS-7-AC-02 | Mixer renders in Chromium at baseline viewport and remains usable at a reasonable smaller width. | NOT_RUN | Pending implementation/evidence |
| LAS-7-AC-03 | Empty state provides a clear way to import audio. | NOT_RUN | Pending implementation/evidence |
| LAS-7-AC-04 | Placeholder controls cannot imply working DSP. | NOT_RUN | Pending implementation/evidence |
| LAS-7-AC-05 | Code changes and screenshots are part of a PR linked to this story. | NOT_RUN | Pending implementation/evidence |
| LAS-7-AC-06 | Initial UI smoke test is feasible via Playwright. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-7/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-7/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-7/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-7/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-7/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User story

As a user, I want to open MPS Audio Studio in a browser and see a readable mixer interface so I can start an audio project.

## Scope

* Bootstrap React + Vite + JavaScript app without destroying the historical prototype/specification.
* Implement responsive original analog-console-inspired layout: transport area, track area, mixer strip, master section, initially empty state.
* Provide real interaction/status for implemented controls; mark future EQ/compressor/export features as disabled or coming soon, not as working audio processing.
* Accessible names for primary controls; stable selectors based on roles/labels.

## Acceptance criteria

1. Documented command starts app locally with no console errors.
2. Mixer renders in Chromium at baseline viewport and remains usable at a reasonable smaller width.
3. Empty state provides a clear way to import audio.
4. Placeholder controls cannot imply working DSP.
5. Code changes and screenshots are part of a PR linked to this story.
6. Initial UI smoke test is feasible via Playwright.



## Imported test/custom fields

```json
{
  "Sprint": {
    "id": "customfield_10020",
    "value": [
      {
        "id": 2,
        "name": "SCRUM Sprint 0",
        "state": "active",
        "boardId": 1,
        "startDate": "2026-10-19T07:23:23.563Z",
        "endDate": "2026-11-02T07:23:23.563Z"
      }
    ]
  }
}
```

## Existing issue comments (dated context)

### 2026-10-19T14:46:17.774+0300 — comment 10001

QA/user review of PR #2 (2026-10-19): MPS Audio Studio opens on the user's Mac, but the current UI is only a minimal mixer shell. The user reports it is 'barely functional'. Confirmed from PR code/docs: TC-001 asserts visible regions and intentionally disabled EQ, Dynamics, Space, Master level and Export WAV; basic local WAV playback is described, but advanced mixing/mastering is not implemented. This is a scope/expectation gap, not yet evidence of a regression bug. Keep PR #2 unmerged until manual checks of WAV import, playback, pause/stop and visible behavior are reviewed. Next functional vertical slice should implement a real audio control (e.g., gain/master level with proper AudioNode wiring) with deterministic DSP test and Playwright UI assertion, linked to a separate Jira issue. Record actual failures with reproduction steps when observed.
