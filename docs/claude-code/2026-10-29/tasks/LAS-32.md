# LAS-32 — Generate and apply an explainable reference-guided mastering proposal

Jira: https://genstek69.atlassian.net/browse/LAS-32  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-16  
Sprint field: **LAS Sprint 06**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-31, LAS-29.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Derive a bounded explainable parameter proposal from actual measured differences and the validated processors, with editable strength and rationale per module.
- Preview/reduce/edit/reject/undo the whole chain, preserve original and accepted baseline, and do not pretend to recover proprietary mastering settings.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-32-QA-01 | Measured source/reference pair → reproducible recipe with numeric settings, reasons and uncertainty. | NOT_RUN |
| LAS-32-QA-02 | Adversarial tonal/width/dynamics differences → boost/compression/mono/headroom guards bound the proposal. | NOT_RUN |
| LAS-32-QA-03 | Reject/undo → previous complete chain restored; listening improvement is recorded only after a real matched comparison. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-32-AC-01 | Each proposed module states the measured reason, parameter values, supported adjustment range and relevant uncertainty. | NOT_RUN | Pending implementation/evidence |
| LAS-32-AC-02 | Excessive boosts, overcompression and unsafe width changes are constrained and evaluated against documented guards. | NOT_RUN | Pending implementation/evidence |
| LAS-32-AC-03 | User can preview, reduce strength, edit, reject and undo the recipe; the original is retained. | NOT_RUN | Pending implementation/evidence |
| LAS-32-AC-04 | Representative examples are evaluated using matched-loudness listening and numerical checks; exact settings are based on actual inputs rather than invented measurements. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-32/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-32/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-32/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-32/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-32/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Translate supported measurement differences into a constrained recipe using the validated DSP modules. Offer editable strength and a preview before export. This is parameter selection/reference matching, not a guarantee of duplicating another artist's production.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 06** (ID 7), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-31: https://genstek69.atlassian.net/browse/LAS-31
* LAS-29: https://genstek69.atlassian.net/browse/LAS-29

## Acceptance criteria

- [ ] Each proposed module states the measured reason, parameter values, supported adjustment range and relevant uncertainty.
- [ ] Excessive boosts, overcompression and unsafe width changes are constrained and evaluated against documented guards.
- [ ] User can preview, reduce strength, edit, reject and undo the recipe; the original is retained.
- [ ] Representative examples are evaluated using matched-loudness listening and numerical checks; exact settings are based on actual inputs rather than invented measurements.

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
