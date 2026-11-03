# LAS-44 — Create a design system and approved high-fidelity studio screen designs

Jira: https://genstek69.atlassian.net/browse/LAS-44  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-41  
Sprint field: **LAS Sprint 03**  
Work mode: **DESIGN_REVIEW_REQUIRED** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-43.  
Preserve the explicit Gennady design/review gate from Jira. Prepare the artifact, record Pending, and continue unrelated ready work; do not invent user approval.

## Claude Code implementation order

- Specify tokens/components/accessibility/keyboard behavior and high-fidelity screens based on the chosen LAS-42/43 direction.
- Document width/height rules, breakpoint boundaries, zoom/DPI, real control hit areas and 24-band EQ pointer mapping. Gennady’s explicit visual approval is a gate for final reskin, not for existing responsive maintenance.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-44-QA-01 | Inspect default/hover/focus/disabled/error/loading states and key screens → complete reusable specifications at agreed viewports. | NOT_RUN |
| LAS-44-QA-02 | Review approval record → accepted design version identified, or Pending with independent work continuing. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-44-AC-01 | Design system specifies color/contrast, typography, spacing, layout, icons and responsive behavior on agreed viewport sizes. | NOT_RUN | Pending implementation/evidence |
| LAS-44-AC-02 | Buttons, fields, faders, knobs, meters, dialogs and tabs include default/hover/focus/disabled/error/loading states and keyboard behavior. | NOT_RUN | Pending implementation/evidence |
| LAS-44-AC-03 | High-fidelity designs cover studio shell, account forms, mixer, analysis/EQ, reference comparison, stems and export; optional/future controls are labeled. | NOT_RUN | Pending implementation/evidence |
| LAS-44-AC-04 | Gennady's explicit design approval or requested changes are recorded; implementation is not considered approved by the mere existence of mockups. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-44/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-44/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-44/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-44/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-44/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Context and user outcome

Turn the agreed direction into reusable design tokens and component specifications. Design authentic functional controls rather than decorative imitations, with consistent spacing, typography, colors, icons, units and state feedback.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 03** (ID 4), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* [LAS-43](https://genstek69.atlassian.net/browse/LAS-43)

## Acceptance criteria

- [ ] Design system specifies color/contrast, typography, spacing, layout, icons and responsive behavior on agreed viewport sizes.
- [ ] Buttons, fields, faders, knobs, meters, dialogs and tabs include default/hover/focus/disabled/error/loading states and keyboard behavior.
- [ ] High-fidelity designs cover studio shell, account forms, mixer, analysis/EQ, reference comparison, stems and export; optional/future controls are labeled.
- [ ] Gennady's explicit design approval or requested changes are recorded; implementation is not considered approved by the mere existence of mockups.

## Definition of done

Design work: reviewable artifact and recorded user decisions. Implementation: reviewed GitHub PR, criteria verified and relevant UI/audio regressions checked. A planning ticket is not evidence that designs or tests exist.

## Source

Gennady's UI/UX backlog addition, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio      
Preserve LAS-10 learning, LAS-11 Pause/Resume and LAS-12 Unload. Current branch name stays codex/SCRUM-7-SCRUM-10-mixer.

## Responsive design handoff

Specify width/height breakpoints, supported viewport sizes, panel collapse/reflow and access to essential controls for [LAS-48](https://genstek69.atlassian.net/browse/LAS-48). Include readable controls at browser zoom and a deliberate narrow-layout/many-channel strategy. Confirm the proposed QA viewport matrix with Gennady before implementation.

## Imported test/custom fields

```json
{
  "Sprint": {
    "id": "customfield_10020",
    "value": [
      {
        "id": 4,
        "name": "LAS Sprint 03",
        "state": "future",
        "boardId": 1,
        "goal": "Audio analysis, validated DSP chain and approved design system. See LAS-40."
      }
    ]
  }
}
```
