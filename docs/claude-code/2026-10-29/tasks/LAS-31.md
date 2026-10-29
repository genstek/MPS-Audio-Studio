# LAS-31 — Compare a mix with its reference at matched loudness

Jira: https://genstek69.atlassian.net/browse/LAS-31  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-16  
Sprint field: **LAS Sprint 05**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-30, LAS-28.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Compare matched source/reference segments using the LAS-26/30 metrics and LAS-28 monitor path. Keep comparison separate from processing.
- Display units, uncertainty and unsupported conditions. Selecting a reference must not silently alter audio.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-31-QA-01 | Switch comparable source/reference segments → measured spectral/dynamic/stereo differences and level-matched monitor. | NOT_RUN |
| LAS-31-QA-02 | Different lengths, mono/stereo and silent segments → honest supported/unsupported outcomes with no divide-by-zero. | NOT_RUN |
| LAS-31-QA-03 | Select another reference → no DSP parameters change until a proposal is explicitly applied. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-31-AC-01 | Comparison shows tonal balance, loudness/dynamics and stereo measures with consistent units and explanatory labels. | NOT_RUN | Pending implementation/evidence |
| LAS-31-AC-02 | A/B uses level matching and comparable selected sections; raw loudness differences are not presented as quality scores. | NOT_RUN | Pending implementation/evidence |
| LAS-31-AC-03 | The report distinguishes measured differences from subjective interpretations and flags unsupported or uncertain conclusions. | NOT_RUN | Pending implementation/evidence |
| LAS-31-AC-04 | Tests cover different durations, mono/stereo, silence and segment selection; no processing is applied merely by selecting a reference. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-31/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-31/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-31/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-31/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-31/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Show meaningful differences between the user's mix and a selected reference segment. Keep analysis separate from the eventual processing proposal and preserve the musical character of the input.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 05** (ID 6), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-30: https://genstek69.atlassian.net/browse/LAS-30
* LAS-28: https://genstek69.atlassian.net/browse/LAS-28

## Acceptance criteria

- [ ] Comparison shows tonal balance, loudness/dynamics and stereo measures with consistent units and explanatory labels.
- [ ] A/B uses level matching and comparable selected sections; raw loudness differences are not presented as quality scores.
- [ ] The report distinguishes measured differences from subjective interpretations and flags unsupported or uncertain conclusions.
- [ ] Tests cover different durations, mono/stereo, silence and segment selection; no processing is applied merely by selecting a reference.

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
