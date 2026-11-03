# LAS-43 — Design studio navigation and interactive wireframes for the core user journeys

Jira: https://genstek69.atlassian.net/browse/LAS-43  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-41  
Sprint field: **LAS Sprint 02**  
Work mode: **DESIGN_REVIEW_REQUIRED** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-42, LAS-19, LAS-20.  
Preserve the explicit Gennady design/review gate from Jira. Prepare the artifact, record Pending, and continue unrelated ready work; do not invent user approval.

## Claude Code implementation order

- Build information architecture and a clickable prototype covering project/audio/reference/stem/export and account/privacy journeys, using LAS-19/20 rules.
- Cover all loading/error/unsaved/empty/play/paused/export states. Present for Gennady’s walkthrough; do not let a missing walkthrough block independent DSP work.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-43-QA-01 | Walk import→play→analysis→reference→export and account recovery → navigation/state/error paths understandable in a clickable artifact. | NOT_RUN |
| LAS-43-QA-02 | Pending feedback stays Pending; decisions are recorded before declaring design accepted. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-43-AC-01 | Information architecture shows navigation between projects, mixer/mastering, references, stems and account settings. | NOT_RUN | Pending implementation/evidence |
| LAS-43-AC-02 | Wireframes cover empty, loading, ready, playing, paused, error, unsaved-change and export states. | NOT_RUN | Pending implementation/evidence |
| LAS-43-AC-03 | Registration/login/recovery and local/external processing consent are included without exposing unnecessary technical details to users. | NOT_RUN | Pending implementation/evidence |
| LAS-43-AC-04 | Gennady walks through a clickable prototype for key tasks; feedback and revised decisions are recorded before high-fidelity design. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-43/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-43/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-43/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-43/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-43/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Context and user outcome

Map a coherent workspace and task flow for import, mixer, analysis, processing, reference selection, A/B, stems and export, plus registration/recovery and privacy choices. Keep the user's work and playback state clear.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 02** (ID 3), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* [LAS-42](https://genstek69.atlassian.net/browse/LAS-42)
* [LAS-19](https://genstek69.atlassian.net/browse/LAS-19)
* [LAS-20](https://genstek69.atlassian.net/browse/LAS-20)

## Acceptance criteria

- [ ] Information architecture shows navigation between projects, mixer/mastering, references, stems and account settings.
- [ ] Wireframes cover empty, loading, ready, playing, paused, error, unsaved-change and export states.
- [ ] Registration/login/recovery and local/external processing consent are included without exposing unnecessary technical details to users.
- [ ] Gennady walks through a clickable prototype for key tasks; feedback and revised decisions are recorded before high-fidelity design.

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
        "id": 3,
        "name": "LAS Sprint 02",
        "state": "future",
        "boardId": 1,
        "goal": "Recovery, private files, data isolation, deletion/consent, security tests and UX wireframes. See LAS-40."
      }
    ]
  }
}
```
