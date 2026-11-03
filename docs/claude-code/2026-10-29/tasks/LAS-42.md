# LAS-42 — Audit the prototype UI and agree the studio's visual direction with Gennady

Jira: https://genstek69.atlassian.net/browse/LAS-42  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-41  
Sprint field: **LAS Sprint 01**  
Work mode: **DESIGN_REVIEW_REQUIRED** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
Preserve the explicit Gennady design/review gate from Jira. Prepare the artifact, record Pending, and continue unrelated ready work; do not invent user approval.

## Claude Code implementation order

- Audit current screens/workflows with reproduction context and prepare a design brief. The accepted LAS-51 responsive patch does not approve the final visual theme.
- Offer at least two distinct directions when references do not already determine one; prepare reviewable local/browser artifacts and record Gennady’s real choice when supplied. Continue independent backend/DSP work while choice is pending.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-42-QA-01 | Review audit at baseline/compact viewports → concrete hierarchy/readability/control issues and annotated screenshots. | NOT_RUN |
| LAS-42-QA-02 | Compare proposed directions and brief → user choice is recorded or explicitly Pending; no invented approval. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-42-AC-01 | Audit identifies concrete layout, hierarchy, control, readability and workflow issues with screenshots and reproduction context. | NOT_RUN | Pending implementation/evidence |
| LAS-42-AC-02 | Design brief records intended audience/tasks, desktop-first or other agreed targets, visual references and available logo/brand assets. | NOT_RUN | Pending implementation/evidence |
| LAS-42-AC-03 | At least two meaningfully different visual directions are presented when the user's references do not already establish one; Gennady's choice is recorded. | NOT_RUN | Pending implementation/evidence |
| LAS-42-AC-04 | No final theme, console style or branding is assumed; scope and design acceptance checkpoints are documented before UI implementation. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-42/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-42/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-42/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-42/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-42/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Context and user outcome

Inspect the running mixer, capture current usability/visual problems and collect the user's intended references, branding and preferred workspace. The current interface is a rejected prototype, not a visual specification.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 01** (ID 1), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* Inspect the existing UI and collect the user's intended direction before redesign.

## Acceptance criteria

- [ ] Audit identifies concrete layout, hierarchy, control, readability and workflow issues with screenshots and reproduction context.
- [ ] Design brief records intended audience/tasks, desktop-first or other agreed targets, visual references and available logo/brand assets.
- [ ] At least two meaningfully different visual directions are presented when the user's references do not already establish one; Gennady's choice is recorded.
- [ ] No final theme, console style or branding is assumed; scope and design acceptance checkpoints are documented before UI implementation.

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
        "id": 1,
        "name": "LAS Sprint 01",
        "state": "future",
        "boardId": 1,
        "goal": "Accounts, privacy rules and agreed UI/UX direction. Scope and acceptance criteria: LAS-40."
      }
    ]
  }
}
```
