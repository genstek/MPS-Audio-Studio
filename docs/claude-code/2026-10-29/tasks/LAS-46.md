# LAS-46 — Implement the approved mastering, reference, stem and export workflows

Jira: https://genstek69.atlassian.net/browse/LAS-46  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-41  
Sprint field: **LAS Sprint 07**  
Work mode: **GATED_IMPLEMENTATION** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-45, LAS-28, LAS-33, LAS-35.  
Preserve the explicit Gennady design/review gate from Jira. Prepare the artifact, record Pending, and continue unrelated ready work; do not invent user approval.

## Claude Code implementation order

- Integrate working analysis/EQ/dynamics/reference/proposals/stems/export into the approved navigation and shared components.
- Keep original/processed/reference identity, level matching, undo, progress/errors and supported local/external boundaries visible to users.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-46-QA-01 | Import→analyze→proposal→edit/undo→reference A/B→stem mix→export → correct actual engine state and clear completion/error feedback. | NOT_RUN |
| LAS-46-QA-02 | Cancel/retry/return to project → recoverable workflow, no lost source/settings/playback state. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-46-AC-01 | Analysis, EQ/dynamics controls, reference choice, recipe explanation and strength adjustments follow the approved navigation and component system. | NOT_RUN | Pending implementation/evidence |
| LAS-46-AC-02 | Original/processed/reference identity, A/B loudness matching, bypass and undo are clear; processing never appears complete before output is ready. | NOT_RUN | Pending implementation/evidence |
| LAS-46-AC-03 | Stem selection/routing and export format/location have understandable feedback; unsupported and external-processing states are explicit. | NOT_RUN | Pending implementation/evidence |
| LAS-46-AC-04 | Task-based checks cover new and returning users, recoverable errors and preserved project/playback state; screenshots and Playwright evidence match real behavior. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-46/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-46/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-46/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-46/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-46/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Context and user outcome

Integrate the advanced audio features into the approved workspace with a clear progression from analysis and proposal to preview and export. Reveal detailed controls when useful without hiding the user's ability to inspect changes.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 07** (ID 8), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* [LAS-45](https://genstek69.atlassian.net/browse/LAS-45)
* [LAS-28](https://genstek69.atlassian.net/browse/LAS-28)
* [LAS-33](https://genstek69.atlassian.net/browse/LAS-33)
* [LAS-35](https://genstek69.atlassian.net/browse/LAS-35)

## Acceptance criteria

- [ ] Analysis, EQ/dynamics controls, reference choice, recipe explanation and strength adjustments follow the approved navigation and component system.
- [ ] Original/processed/reference identity, A/B loudness matching, bypass and undo are clear; processing never appears complete before output is ready.
- [ ] Stem selection/routing and export format/location have understandable feedback; unsupported and external-processing states are explicit.
- [ ] Task-based checks cover new and returning users, recoverable errors and preserved project/playback state; screenshots and Playwright evidence match real behavior.

## Definition of done

Design work: reviewable artifact and recorded user decisions. Implementation: reviewed GitHub PR, criteria verified and relevant UI/audio regressions checked. A planning ticket is not evidence that designs or tests exist.

## Source

Gennady's UI/UX backlog addition, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio    
Preserve LAS-10 learning, LAS-11 Pause/Resume and LAS-12 Unload. Current branch name stays codex/SCRUM-7-SCRUM-10-mixer.

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
