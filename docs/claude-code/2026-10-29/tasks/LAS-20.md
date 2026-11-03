# LAS-20 — Define privacy rules, data lifecycle and threat model for studio assets

Jira: https://genstek69.atlassian.net/browse/LAS-20  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-14  
Sprint field: **LAS Sprint 01**  
Work mode: **ARCHITECTURE** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Inventory source audio, references, stems, profiles, projects, jobs, exports, logs and backups. Document local/server/external trust boundaries and ownership.
- Specify retention and deletion propagation, backup expiry, opt-in consent and a verifiable local-only no-upload mode before enabling storage.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-20-QA-01 | Trace import→analysis→preview→export in local-only mode → no audio network transmission. | NOT_RUN |
| LAS-20-QA-02 | Review threat scenarios → takeover, ID guessing, shared links, parser abuse, logs and backups each have a control and a test owner. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-20-AC-01 | Data-flow inventory identifies every storage location, recipient and processing boundary. | NOT_RUN | Pending implementation/evidence |
| LAS-20-AC-02 | Threat model covers account takeover, cross-user access, shared links, malicious audio, logs and backups. | NOT_RUN | Pending implementation/evidence |
| LAS-20-AC-03 | Policy defines minimum collected data, retention, account/project deletion and backup expiry without promising immediate backup erasure. | NOT_RUN | Pending implementation/evidence |
| LAS-20-AC-04 | External audio/AI transmission requires explicit informed opt-in; local-only mode has a verifiable no-upload expectation. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-20/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-20/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-20/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-20/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-20/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Map accounts, projects, source audio, references, stems, processing jobs and exports. Define trust boundaries, local versus server processing, ownership, external-service consent and retention before cloud storage is enabled.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 01** (ID 1), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* No new-roadmap prerequisite; review current repository and LAS-5 mixer baseline before implementation.

## Acceptance criteria

- [ ] Data-flow inventory identifies every storage location, recipient and processing boundary.
- [ ] Threat model covers account takeover, cross-user access, shared links, malicious audio, logs and backups.
- [ ] Policy defines minimum collected data, retention, account/project deletion and backup expiry without promising immediate backup erasure.
- [ ] External audio/AI transmission requires explicit informed opt-in; local-only mode has a verifiable no-upload expectation.

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
