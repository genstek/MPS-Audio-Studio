# LAS-21 — Add registration, verified login and logout to the studio

Jira: https://genstek69.atlassian.net/browse/LAS-21  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-13  
Sprint field: **LAS Sprint 01**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-19.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Implement registration/verification/login/logout with the LAS-19 decision and development mail infrastructure. Server/provider validates sessions.
- Separate backend-enforced auth from route presentation; redact credentials/tokens from all test traces and logs. Keep guest audio available according to ADR.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-21-QA-01 | Register a new test account → verify email → valid login grants the intended access. | NOT_RUN |
| LAS-21-QA-02 | Invalid credentials/unverified login → safe errors and no protected access. | NOT_RUN |
| LAS-21-QA-03 | Logout → old session fails direct protected API requests as well as UI routing. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-21-AC-01 | A new account can register and complete email verification using a development mail/test setup. | NOT_RUN | Pending implementation/evidence |
| LAS-21-AC-02 | Valid login opens the permitted studio route; invalid or unverified login is handled according to the documented policy. | NOT_RUN | Pending implementation/evidence |
| LAS-21-AC-03 | Logout invalidates the applicable session and protected endpoints reject subsequent unauthorized requests. | NOT_RUN | Pending implementation/evidence |
| LAS-21-AC-04 | Playwright covers core success/failure flows; passwords and session secrets are absent from traces, logs and repository fixtures. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-21/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-21/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-21/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-21/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-21/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Build accessible registration and login forms integrated with the chosen backend/provider. Show loading, success and safe error states; support verification and logout. Do not use a browser flag or localStorage value as proof of authentication.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 01** (ID 1), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-19: https://genstek69.atlassian.net/browse/LAS-19

## Acceptance criteria

- [ ] A new account can register and complete email verification using a development mail/test setup.
- [ ] Valid login opens the permitted studio route; invalid or unverified login is handled according to the documented policy.
- [ ] Logout invalidates the applicable session and protected endpoints reject subsequent unauthorized requests.
- [ ] Playwright covers core success/failure flows; passwords and session secrets are absent from traces, logs and repository fixtures.

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
