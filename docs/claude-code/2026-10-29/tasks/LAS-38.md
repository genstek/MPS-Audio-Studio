# LAS-38 — Prototype application-controlled plugin processing after host feasibility passes

Jira: https://genstek69.atlassian.net/browse/LAS-38  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-18  
Sprint field: **LAS Sprint 09**  
Work mode: **GATED_PROTOTYPE** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-37.  
A positive LAS-37 decision and a permitted available plugin/host are required.

## Claude Code implementation order

- Run only after a positive LAS-37 feasibility decision and available permitted plugin/host. Otherwise deliver a documented Blocked result and the scoped plan.
- Prototype app-controlled selection/parameters/state/bypass, numerical processing, missing/crash handling and authenticated bridge; no arbitrary plugin installation/purchase.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-38-QA-01 | Supported test plugin→process known fixture→save/reload parameters → measurable change and recall. | NOT_RUN |
| LAS-38-QA-02 | Missing/incompatible/crashing plugin or unauthorized client → safe denial/recovery, preserved project and stated parity limits. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-38-AC-01 | A permitted test plugin is loaded through the chosen host and an audible/numerical fixture confirms actual processing. | NOT_RUN | Pending implementation/evidence |
| LAS-38-AC-02 | The application sets and recalls exposed parameters/state, supports bypass and records plugin/version identity. | NOT_RUN | Pending implementation/evidence |
| LAS-38-AC-03 | Missing, incompatible or crashing plugins are reported and contained without losing the source/project; the bridge rejects unauthorized control. | NOT_RUN | Pending implementation/evidence |
| LAS-38-AC-04 | Report documents limitations, preview/export parity and a go/no-go for product integration; do not purchase licenses or install arbitrary user plugins as part of this planning ticket. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-38/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-38/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-38/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-38/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-38/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Gated prototype only: proceed after a positive architecture decision. Let the studio select a supported installed test plugin, set exposed parameters, process audio and restore state without requiring manual plugin-window operation for that workflow.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 09** (ID 10), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-37: https://genstek69.atlassian.net/browse/LAS-37

## Acceptance criteria

- [ ] A permitted test plugin is loaded through the chosen host and an audible/numerical fixture confirms actual processing.
- [ ] The application sets and recalls exposed parameters/state, supports bypass and records plugin/version identity.
- [ ] Missing, incompatible or crashing plugins are reported and contained without losing the source/project; the bridge rejects unauthorized control.
- [ ] Report documents limitations, preview/export parity and a go/no-go for product integration; do not purchase licenses or install arbitrary user plugins as part of this planning ticket.

## Validation and definition of done

Link implementation/research report and GitHub PR. Record actual numerical, UI and listening evidence as applicable, costs/resources and known limitations. Current plans do not imply research, implementation or tests have already run. Explain new JavaScript/Playwright work in small practical steps.

## Source

Gennady's MPS/LoVerse OS product planning, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio    
Current learning branch remains codex/SCRUM-7-SCRUM-10-mixer. Future changes use their own LAS issue branches.

## Imported test/custom fields

```json
{
  "Sprint": {
    "id": "customfield_10020",
    "value": [
      {
        "id": 10,
        "name": "LAS Sprint 09",
        "state": "future",
        "boardId": 1,
        "goal": "Gated plugin-host prototype and feasibility of training an audio model. See LAS-40."
      }
    ]
  }
}
```
