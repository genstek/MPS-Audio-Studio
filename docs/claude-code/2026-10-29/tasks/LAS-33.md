# LAS-33 — Save mastering preferences and reusable reference-based presets

Jira: https://genstek69.atlassian.net/browse/LAS-33  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-16  
Sprint field: **LAS Sprint 06**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-32.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Persist versioned presets/preferences, rename/apply/export/delete and migration/invalid-data handling under owner control. Include all 24 EQ bands per channel.
- Separate reference targets from explicit user preferences and accepted/rejected variants. Do not silently train/upload music.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-33-QA-01 | Save customized chain→reload→apply → complete state restored, including L/R/Link bands and chain order. | NOT_RUN |
| LAS-33-QA-02 | Import old/invalid/newer schema → documented migration or actionable rejection without corrupting the current project. | NOT_RUN |
| LAS-33-QA-03 | Reset preference influence → reference target retained; other-user access denied. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-33-AC-01 | User can save, rename, apply, export where appropriate and delete a preset with its processing/analysis versions. | NOT_RUN | Pending implementation/evidence |
| LAS-33-AC-02 | Accepted/rejected variants and explicit ratings are stored only with clear user control and owner isolation. | NOT_RUN | Pending implementation/evidence |
| LAS-33-AC-03 | A new proposal distinguishes reference-derived targets from user preference adjustments and allows resetting either. | NOT_RUN | Pending implementation/evidence |
| LAS-33-AC-04 | Preferences do not silently fine-tune an external model or upload music; serialization/recall is tested. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-33/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-33/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-33/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-33/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-33/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Store explicit feedback and editable presets, such as denser bass, preserved punch, restrained highs and clearer vocals. Keep artist/reference profiles separate and make the influence of user preferences visible.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 06** (ID 7), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-32: https://genstek69.atlassian.net/browse/LAS-32

## Acceptance criteria

- [ ] User can save, rename, apply, export where appropriate and delete a preset with its processing/analysis versions.
- [ ] Accepted/rejected variants and explicit ratings are stored only with clear user control and owner isolation.
- [ ] A new proposal distinguishes reference-derived targets from user preference adjustments and allows resetting either.
- [ ] Preferences do not silently fine-tune an external model or upload music; serialization/recall is tested.

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
        "id": 7,
        "name": "LAS Sprint 06",
        "state": "future",
        "boardId": 1,
        "goal": "Explainable processing proposals, preferences and reusable presets. See LAS-40."
      }
    ]
  }
}
```
