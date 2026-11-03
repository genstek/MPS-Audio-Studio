# LAS-22 — Add password recovery, session expiry and authentication abuse controls

Jira: https://genstek69.atlassian.net/browse/LAS-22  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-13  
Sprint field: **LAS Sprint 02**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-21.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Use provider-backed recovery, bounded token lifetime/single use, session revocation policy and tested rate limits.
- Test time deterministically where possible; do not use long sleeps or expose account existence in recovery responses.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-22-QA-01 | Reset with a valid token → password changes and old sessions obey the documented revocation rule. | NOT_RUN |
| LAS-22-QA-02 | Expired, reused or forged token → denied; repeated attempts → throttled with a safe recovery path. | NOT_RUN |
| LAS-22-QA-03 | Expired session during a protected operation → clear state, no data leak or false save success. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-22-AC-01 | Valid recovery permits password reset; expired and already-used reset tokens fail safely. | NOT_RUN | Pending implementation/evidence |
| LAS-22-AC-02 | After reset, previous sessions follow the documented revocation policy and the user receives clear next steps. | NOT_RUN | Pending implementation/evidence |
| LAS-22-AC-03 | Repeated login/recovery attempts are limited and tested without disclosing credentials or account existence. | NOT_RUN | Pending implementation/evidence |
| LAS-22-AC-04 | Automated checks cover expiry, invalid tokens, retry limits and protected-route behavior after session loss. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-22/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-22/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-22/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-22/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-22/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Implement the chosen provider's recovery flow, expired/revoked-session UX and login/recovery throttling. Avoid leaking whether an account exists through recovery responses.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 02** (ID 3), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-21: https://genstek69.atlassian.net/browse/LAS-21

## Acceptance criteria

- [ ] Valid recovery permits password reset; expired and already-used reset tokens fail safely.
- [ ] After reset, previous sessions follow the documented revocation policy and the user receives clear next steps.
- [ ] Repeated login/recovery attempts are limited and tested without disclosing credentials or account existence.
- [ ] Automated checks cover expiry, invalid tokens, retry limits and protected-route behavior after session loss.

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
