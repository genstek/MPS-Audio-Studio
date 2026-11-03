# LAS-23 — Enforce private audio storage, ownership checks and safe uploads

Jira: https://genstek69.atlassian.net/browse/LAS-23  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-14  
Sprint field: **LAS Sprint 02**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-21, LAS-20.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Enforce owner checks for every operation on projects/audio/references/stems/jobs/exports. Use private storage and scoped expiring downloads.
- Validate actual file content/size and isolate parsing with time/memory bounds. Test API/storage access independently of the UI.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-23-QA-01 | Account B guesses A’s IDs for list/read/write/delete/process/download → every unauthorized operation fails. | NOT_RUN |
| LAS-23-QA-02 | Anonymous and expired signed-link access → rejected under policy. | NOT_RUN |
| LAS-23-QA-03 | Disguised, malformed, oversized and path-manipulating uploads → rejected; valid authorized upload still succeeds. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-23-AC-01 | User B cannot list, read, modify, delete or process user A's assets by guessing IDs or reusing endpoints. | NOT_RUN | Pending implementation/evidence |
| LAS-23-AC-02 | Anonymous requests and stale/expired download links are rejected according to the policy. | NOT_RUN | Pending implementation/evidence |
| LAS-23-AC-03 | Invalid, disguised, oversized and malformed audio is rejected; parsing jobs have documented time/memory limits and isolation. | NOT_RUN | Pending implementation/evidence |
| LAS-23-AC-04 | Storage paths are application-generated, secrets are excluded from client bundles and supported uploads still work. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-23/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-23/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-23/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-23/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-23/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Protect projects, source WAVs, references, stems, jobs and exports at the backend/storage layer. Use private storage and authorized downloads; validate real audio content, size and processing limits, not just filename or MIME.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 02** (ID 3), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-21: https://genstek69.atlassian.net/browse/LAS-21
* LAS-20: https://genstek69.atlassian.net/browse/LAS-20

## Acceptance criteria

- [ ] User B cannot list, read, modify, delete or process user A's assets by guessing IDs or reusing endpoints.
- [ ] Anonymous requests and stale/expired download links are rejected according to the policy.
- [ ] Invalid, disguised, oversized and malformed audio is rejected; parsing jobs have documented time/memory limits and isolation.
- [ ] Storage paths are application-generated, secrets are excluded from client bundles and supported uploads still work.

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
