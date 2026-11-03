# LAS-45 — Implement the approved studio shell, mixer controls and shared account components

Jira: https://genstek69.atlassian.net/browse/LAS-45  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-41  
Sprint field: **LAS Sprint 04**  
Work mode: **GATED_IMPLEMENTATION** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-44, LAS-21.  
Preserve the explicit Gennady design/review gate from Jira. Prepare the artifact, record Pending, and continue unrelated ready work; do not invent user approval.

## Claude Code implementation order

- Implement approved shell/account/shared controls; preserve accessible names and real engine behavior. Reuse LAS-48 responsive layout rather than writing an unrelated second layout.
- Start final reskin after LAS-44 approval. Functional nonvisual controls can proceed under their own tickets; do not silently treat existing prototype or an agent’s mockup as approved.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-45-QA-01 | Approved designs vs actual shell at supported sizes → critical controls fit and component states match. | NOT_RUN |
| LAS-45-QA-02 | Keyboard/pointer faders and transport/import/Pause toggle/unload → existing behavior and state persist through navigation/resize. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-45-AC-01 | Implemented layout and shared components match approved designs at the agreed viewports without clipping critical controls. | NOT_RUN | Pending implementation/evidence |
| LAS-45-AC-02 | Faders/knobs support precise keyboard and pointer control, show units/values and distinguish visual state from actual audio state. | NOT_RUN | Pending implementation/evidence |
| LAS-45-AC-03 | Play/Pause/Stop, WAV import and applicable Pause/Resume/Unload behavior are preserved and checked; selectors prefer accessible roles/names. | NOT_RUN | Pending implementation/evidence |
| LAS-45-AC-04 | Visual comparisons and functional regression evidence are attached; errors, loading, disabled and focus states follow the design system. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-45/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-45/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-45/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-45/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-45/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Context and user outcome

Apply the approved design to navigation, layout, transport, channel strips and reusable account/input/dialog components. Preserve real audio behavior and testable accessible names while improving the working interface.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 04** (ID 5), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* [LAS-44](https://genstek69.atlassian.net/browse/LAS-44)
* [LAS-21](https://genstek69.atlassian.net/browse/LAS-21)

## Acceptance criteria

- [ ] Implemented layout and shared components match approved designs at the agreed viewports without clipping critical controls.
- [ ] Faders/knobs support precise keyboard and pointer control, show units/values and distinguish visual state from actual audio state.
- [ ] Play/Pause/Stop, WAV import and applicable Pause/Resume/Unload behavior are preserved and checked; selectors prefer accessible roles/names.
- [ ] Visual comparisons and functional regression evidence are attached; errors, loading, disabled and focus states follow the design system.

## Definition of done

Design work: reviewable artifact and recorded user decisions. Implementation: reviewed GitHub PR, criteria verified and relevant UI/audio regressions checked. A planning ticket is not evidence that designs or tests exist.

## Source

Gennady's UI/UX backlog addition, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio      
Preserve LAS-10 learning, LAS-11 Pause/Resume and LAS-12 Unload. Current branch name stays codex/SCRUM-7-SCRUM-10-mixer.

## Responsive implementation boundary

[LAS-48](https://genstek69.atlassian.net/browse/LAS-48) owns automatic workspace resizing, overflow/reflow, resize-safe audio state and its viewport regression checks. Coordinate the shell/component implementation here with that story; do not create a second independent responsive implementation or treat a fixed-width approved mockup as sufficient.

## Imported test/custom fields

```json
{
  "Sprint": {
    "id": "customfield_10020",
    "value": [
      {
        "id": 5,
        "name": "LAS Sprint 04",
        "state": "future",
        "boardId": 1,
        "goal": "Mastering controls, level-matched A/B, WAV export and redesigned studio shell. See LAS-40."
      }
    ]
  }
}
```
