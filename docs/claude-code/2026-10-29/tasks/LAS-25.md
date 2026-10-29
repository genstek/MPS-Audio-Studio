# LAS-25 — Verify authentication, cross-user isolation and sensitive-data handling

Jira: https://genstek69.atlassian.net/browse/LAS-25  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-14  
Sprint field: **LAS Sprint 02**  
Work mode: **VALIDATE_IMPLEMENTATION** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-22, LAS-23, LAS-24.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Create a two-account authorization matrix and direct API/storage regression suite alongside UI coverage.
- Inspect sanitized bundles, logs, artifacts, dependency/configuration results; classify findings and exact limits. This technical validation is not Gennady’s later manual sign-off.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-25-QA-01 | Run anonymous/owner/other-user/expired-session matrix for each operation → expected allow/deny results with evidence. | NOT_RUN |
| LAS-25-QA-02 | Repeat logout/reset, invalid upload, deletion and consent tests → no regressions and no secrets in artifacts. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-25-AC-01 | A traceable matrix covers anonymous, owner, other-user and expired-session access for each supported asset operation. | NOT_RUN | Pending implementation/evidence |
| LAS-25-AC-02 | Tests reproduce blocked cross-user access, logout/recovery behavior, upload rejection and deletion/consent behavior. | NOT_RUN | Pending implementation/evidence |
| LAS-25-AC-03 | Client bundles, logs and sanitized test evidence are inspected for secret/sensitive-data exposure. | NOT_RUN | Pending implementation/evidence |
| LAS-25-AC-04 | Findings are recorded with severity and reproduction steps; release gates and accepted limitations are documented without claiming zero risk. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-25/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-25/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-25/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-25/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-25/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Create an evidence-backed security regression baseline using at least two test accounts. Combine UI, direct API/storage authorization and dependency/configuration checks; UI tests alone do not establish security.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 02** (ID 3), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-22: https://genstek69.atlassian.net/browse/LAS-22
* LAS-23: https://genstek69.atlassian.net/browse/LAS-23
* LAS-24: https://genstek69.atlassian.net/browse/LAS-24

## Acceptance criteria

- [ ] A traceable matrix covers anonymous, owner, other-user and expired-session access for each supported asset operation.
- [ ] Tests reproduce blocked cross-user access, logout/recovery behavior, upload rejection and deletion/consent behavior.
- [ ] Client bundles, logs and sanitized test evidence are inspected for secret/sensitive-data exposure.
- [ ] Findings are recorded with severity and reproduction steps; release gates and accepted limitations are documented without claiming zero risk.

## Validation and definition of done

Link implementation/research evidence and GitHub PR to this ticket. Record actual checks and known limitations; do not mark done from UI appearance alone. Explain JavaScript/Playwright additions one step at a time during learning. Planning does not mean implementation or tests have run.

## Source

Gennady's MPS/LoVerse OS product ideas, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio    
Current learning task: LAS-10. Current branch remains codex/SCRUM-7-SCRUM-10-mixer; future changes get their own LAS issue branches.

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
