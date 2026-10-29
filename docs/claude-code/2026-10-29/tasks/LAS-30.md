# LAS-30 — Import reference audio and save versioned sound profiles

Jira: https://genstek69.atlassian.net/browse/LAS-30  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-16  
Sprint field: **LAS Sprint 05**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-26, LAS-23.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Import an owner-private reference, choose a segment and store versioned measured profiles with file identity/checksum, analysis version and units.
- Persist profile metadata and file ownership/deletion behavior with LAS-23; keep styles/versions separate and handle silence/invalid segments.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-30-QA-01 | Import reference and select segment → profile identifies exact source/segment and actual measurements. | NOT_RUN |
| LAS-30-QA-02 | Reanalyze unchanged file/segment → stable profile within tolerance; other user cannot access it. | NOT_RUN |
| LAS-30-QA-03 | Delete source/project according to policy → no orphan accessible reference derivatives. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-30-AC-01 | A profile records track/source version, selected segment, analysis version and measurement definitions. | NOT_RUN | Pending implementation/evidence |
| LAS-30-AC-02 | Silence and unsuitable segments are handled explicitly; different source versions and styles remain separate. | NOT_RUN | Pending implementation/evidence |
| LAS-30-AC-03 | Profiles are owner-private and original reference audio follows the security, consent and deletion policy. | NOT_RUN | Pending implementation/evidence |
| LAS-30-AC-04 | Reanalysis of the same file/segment is reproducible within documented tolerance; UI does not claim model training has occurred. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-30/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-30/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-30/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-30/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-30/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Let the owner import a reference and choose a representative segment. Save measured tonal, dynamic and stereo descriptors with source/version metadata. Enigma, Modern Talking and Deep Purple are examples of separate references, not pre-measured presets.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 05** (ID 6), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-26: https://genstek69.atlassian.net/browse/LAS-26
* LAS-23: https://genstek69.atlassian.net/browse/LAS-23

## Acceptance criteria

- [ ] A profile records track/source version, selected segment, analysis version and measurement definitions.
- [ ] Silence and unsuitable segments are handled explicitly; different source versions and styles remain separate.
- [ ] Profiles are owner-private and original reference audio follows the security, consent and deletion policy.
- [ ] Reanalysis of the same file/segment is reproducible within documented tolerance; UI does not claim model training has occurred.

## Validation and definition of done

Link implementation/research report and GitHub PR. Record actual test/listening evidence and known limitations; a passing Playwright UI test alone does not prove DSP quality. Teach any JavaScript/Playwright additions one practical step at a time. This ticket is planned, not implemented or tested.

## Source

Gennady's MPS/LoVerse OS product planning, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio    
Current branch stays codex/SCRUM-7-SCRUM-10-mixer; future changes use their own LAS issue branches.

## Imported test/custom fields

```json
{
  "Sprint": {
    "id": "customfield_10020",
    "value": [
      {
        "id": 6,
        "name": "LAS Sprint 05",
        "state": "future",
        "boardId": 1,
        "goal": "Reference audio profiles and level-matched comparison. See LAS-40."
      }
    ]
  }
}
```
