# LAS-19 — Choose authentication architecture and define account/session flows

Jira: https://genstek69.atlassian.net/browse/LAS-19  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-13  
Sprint field: **LAS Sprint 01**  
Work mode: **ARCHITECTURE** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Inspect the repository: it is currently a local browser app with no auth backend. Add a concrete ADR before introducing the backend/provider boundary.
- Prefer a runnable development environment with verification/recovery test mail; document provider costs, production credentials and deployment as external setup blockers. No fake localStorage authentication.
- Keep guest/local playback runnable and testable without a paid provider.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-19-QA-01 | Follow the ADR setup from clean configuration → local guest playback works and chosen development auth is reproducible. | NOT_RUN |
| LAS-19-QA-02 | Review the endpoint/session matrix → anonymous, verified owner, unverified and expired/revoked sessions have explicit rules. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-19-AC-01 | Architecture decision records provider/library tradeoffs, data ownership, development setup and rollback. | NOT_RUN | Pending implementation/evidence |
| LAS-19-AC-02 | A flow diagram and endpoint/access matrix cover success, invalid credentials, expired session and unverified email. | NOT_RUN | Pending implementation/evidence |
| LAS-19-AC-03 | Secrets stay server-side; session cookie/token strategy covers expiry, revocation, CSRF where applicable and cross-origin settings. | NOT_RUN | Pending implementation/evidence |
| LAS-19-AC-04 | Local mixer and current LAS-10 exercises remain runnable; any guest restrictions are explicit. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-19/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-19/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-19/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-19/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-19/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Inspect the existing repository before choosing a supported authentication provider/library. Document registration, email verification, login, logout, recovery, session expiry and guest/local behavior. No provider purchase or production setup is included.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 01** (ID 1), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* No new-roadmap prerequisite; review current repository and LAS-5 mixer baseline before implementation.

## Acceptance criteria

- [ ] Architecture decision records provider/library tradeoffs, data ownership, development setup and rollback.
- [ ] A flow diagram and endpoint/access matrix cover success, invalid credentials, expired session and unverified email.
- [ ] Secrets stay server-side; session cookie/token strategy covers expiry, revocation, CSRF where applicable and cross-origin settings.
- [ ] Local mixer and current LAS-10 exercises remain runnable; any guest restrictions are explicit.

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
