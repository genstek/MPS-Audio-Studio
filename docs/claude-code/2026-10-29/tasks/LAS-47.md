# LAS-47 — Review usability, accessibility and visual consistency across the redesigned studio

Jira: https://genstek69.atlassian.net/browse/LAS-47  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-41  
Sprint field: **LAS Sprint 07**  
Work mode: **QA_REVIEW_REQUIRED** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-46, LAS-48.  
Preserve the explicit Gennady design/review gate from Jira. Prepare the artifact, record Pending, and continue unrelated ready work; do not invent user approval.

## Claude Code implementation order

- Run task-based accessibility, keyboard/focus/contrast/target and visual consistency checks against the approved brief.
- Stabilize/mask only real dynamic time/meters in snapshots; verify continuous resize, 100/125/200% zoom, breakpoints and manual DPI checks. Gennady’s final review is not prefilled by Claude.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-47-QA-01 | Perform representative complete journeys using keyboard and pointer → usable focus/names/errors with no critical overlap/clipping. | NOT_RUN |
| LAS-47-QA-02 | Compare screenshots across states/sizes → static differences reviewed; Gennady’s verdict and open defects recorded after actual review. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-47-AC-01 | Task review covers registration, import, playback, processing, reference comparison, stems, undo and export; observed problems are logged with severity. | NOT_RUN | Pending implementation/evidence |
| LAS-47-AC-02 | Keyboard navigation, visible focus, accessible names, contrast, form errors and pointer/touch targets are checked for the agreed support scope. | NOT_RUN | Pending implementation/evidence |
| LAS-47-AC-03 | Visual snapshots at documented viewport sizes cover representative pages/states; dynamic meters/time are stabilized or masked intentionally. | NOT_RUN | Pending implementation/evidence |
| LAS-47-AC-04 | Gennady reviews the final experience against the approved brief; open defects, accepted limitations and regression evidence are recorded before closure. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-47/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-47/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-47/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-47/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-47/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Context and user outcome

Run a focused review of the implemented design with Gennady and a repeatable set of tasks. Add appropriately scoped visual/accessibility checks; confirm that the visual design supports long audio-editing sessions and accurate control.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 07** (ID 8), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* [LAS-46](https://genstek69.atlassian.net/browse/LAS-46)
* [LAS-48](https://genstek69.atlassian.net/browse/LAS-48)

## Acceptance criteria

- [ ] Task review covers registration, import, playback, processing, reference comparison, stems, undo and export; observed problems are logged with severity.
- [ ] Keyboard navigation, visible focus, accessible names, contrast, form errors and pointer/touch targets are checked for the agreed support scope.
- [ ] Visual snapshots at documented viewport sizes cover representative pages/states; dynamic meters/time are stabilized or masked intentionally.
- [ ] Gennady reviews the final experience against the approved brief; open defects, accepted limitations and regression evidence are recorded before closure.

## Definition of done

Design work: reviewable artifact and recorded user decisions. Implementation: reviewed GitHub PR, criteria verified and relevant UI/audio regressions checked. A planning ticket is not evidence that designs or tests exist.

## Source

Gennady's UI/UX backlog addition, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio      
Preserve LAS-10 learning, LAS-11 Pause/Resume and LAS-12 Unload. Current branch name stays codex/SCRUM-7-SCRUM-10-mixer.

## Responsive review

Include continuous width/height resizing, viewport breakpoints, browser zoom, overflow, keyboard access and preserved playback/settings from LAS-48; combine automated viewport checks with manual different-screen/DPI checks.

## Imported test/custom fields

```json
{
  "Sprint": {
    "id": "customfield_10020",
    "value": [
      {
        "id": 8,
        "name": "LAS Sprint 07",
        "state": "future",
        "boardId": 1,
        "goal": "Synchronized stems, per-channel processing, advanced workflows and UX validation. See LAS-40."
      }
    ]
  }
}
```
