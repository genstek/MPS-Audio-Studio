# LAS-39 — Assess training a separate audio model from references and user feedback

Jira: https://genstek69.atlassian.net/browse/LAS-39  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-16  
Sprint field: **LAS Sprint 09**  
Work mode: **RESEARCH** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-33, LAS-29.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Separate profile extraction, preference rules, parameter prediction, style transfer and actual model training. Start with data permissions and leakage-safe train/validation/test protocol.
- Compare a small deterministic/reference-matching baseline when feasible; report data/compute blockers honestly. Deliver quality/cost/privacy go/no-go, not production training.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-39-QA-01 | Review data inventory/splits → provenance/permissions and leakage checks recorded before experiments. | NOT_RUN |
| LAS-39-QA-02 | Run feasible baseline/held-out evaluation → measured performance and listening status, or precise Not Run blockers with resource assumptions. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-39-AC-01 | Research plan distinguishes profile extraction, preference rules, parameter prediction and actual model training. | NOT_RUN | Pending implementation/evidence |
| LAS-39-AC-02 | Data provenance/permissions, diversity, train/validation/test separation and leakage risks are documented before any training experiment. | NOT_RUN | Pending implementation/evidence |
| LAS-39-AC-03 | A small baseline comparison is run when feasible; otherwise resource/data blockers are reported explicitly without claiming trained performance. | NOT_RUN | Pending implementation/evidence |
| LAS-39-AC-04 | Decision records quality/listening criteria, compute/storage cost assumptions, privacy and go/no-go; production training requires a separately refined scope. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-39/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-39/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-39/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-39/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-39/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Evaluate whether learned parameter prediction or production-style transfer adds value beyond constrained reference matching. Use appropriately permitted data and a held-out evaluation design. Uploading a few songs to chat does not itself train the assistant.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 09** (ID 10), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-33: https://genstek69.atlassian.net/browse/LAS-33
* LAS-29: https://genstek69.atlassian.net/browse/LAS-29

## Acceptance criteria

- [ ] Research plan distinguishes profile extraction, preference rules, parameter prediction and actual model training.
- [ ] Data provenance/permissions, diversity, train/validation/test separation and leakage risks are documented before any training experiment.
- [ ] A small baseline comparison is run when feasible; otherwise resource/data blockers are reported explicitly without claiming trained performance.
- [ ] Decision records quality/listening criteria, compute/storage cost assumptions, privacy and go/no-go; production training requires a separately refined scope.

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
