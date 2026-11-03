# LAS-24 — Add project/account deletion and explicit external-processing consent

Jira: https://genstek69.atlassian.net/browse/LAS-24  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-14  
Sprint field: **LAS Sprint 02**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-23.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Make project/account deletion propagate to derived audio, jobs, metadata and access permissions according to the LAS-20 policy.
- Require recipient/location-specific consent before external transmission; cancellation before upload must send no audio. Do not auto-enable an external service for convenience.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-24-QA-01 | Delete a disposable project → source/derived access revoked and applicable jobs cancelled. | NOT_RUN |
| LAS-24-QA-02 | Delete a test account → purge/backup-expiry behavior and exceptions match policy. | NOT_RUN |
| LAS-24-QA-03 | Cancel or withhold external-processing consent → network evidence shows zero audio upload. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-24-AC-01 | Project deletion removes access to original audio, reference copies, stems, previews and exports and cancels applicable jobs. | NOT_RUN | Pending implementation/evidence |
| LAS-24-AC-02 | Account deletion follows a documented purge schedule, including backup expiry and any narrowly stated retention exception. | NOT_RUN | Pending implementation/evidence |
| LAS-24-AC-03 | External processing cannot start without opt-in; cancellation before upload sends no audio to the external service. | NOT_RUN | Pending implementation/evidence |
| LAS-24-AC-04 | User-facing messages state processing location and retention; audit events contain no audio contents, credentials or reusable secret URLs. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-24/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-24/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-24/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-24/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-24/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Implement the privacy lifecycle for source tracks and derived data. Make processing location and external recipients visible; record consent and allow cancellation before transmission.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 02** (ID 3), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-23: https://genstek69.atlassian.net/browse/LAS-23

## Acceptance criteria

- [ ] Project deletion removes access to original audio, reference copies, stems, previews and exports and cancels applicable jobs.
- [ ] Account deletion follows a documented purge schedule, including backup expiry and any narrowly stated retention exception.
- [ ] External processing cannot start without opt-in; cancellation before upload sends no audio to the external service.
- [ ] User-facing messages state processing location and retention; audit events contain no audio contents, credentials or reusable secret URLs.

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
