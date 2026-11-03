# LAS-34 — Import original stems and play them through synchronized mixer channels

Jira: https://genstek69.atlassian.net/browse/LAS-34  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-17  
Sprint field: **LAS Sprint 07**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-27.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Use a shared audio clock and explicit offset/sample-rate/length policy for aligned stems. Reuse current transport state and resource cleanup.
- Add per-channel gain/pan/mute/solo with actual individual/master metering and no accumulating drift. Include seek as required by this ticket, without claiming a full DAW.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-34-QA-01 | Aligned known impulses/stems → simultaneous start/pause/resume/seek/stop and measured alignment after repeated operations. | NOT_RUN |
| LAS-34-QA-02 | Adjust gain/pan/mute/solo → only intended routing changes; expected summing and mono behavior. | NOT_RUN |
| LAS-34-QA-03 | Mismatched rate/offset/length and reimport/unload → explicit policy, no silent timing shift or regression in single-track flows. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-34-AC-01 | Supported aligned stems start, pause, resume, seek and stop together without accumulating timing drift. | NOT_RUN | Pending implementation/evidence |
| LAS-34-AC-02 | Gain/pan/mute/solo alter the correct channel; individual and master meters represent real signals. | NOT_RUN | Pending implementation/evidence |
| LAS-34-AC-03 | Mismatched sample rates, offsets or lengths follow an explicit conversion/alignment policy and are explained to the user. | NOT_RUN | Pending implementation/evidence |
| LAS-34-AC-04 | Known aligned fixtures verify summing and timing; existing single-track flows and LAS-11/LAS-12 behavior regressions are checked. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-34/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-34/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-34/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-34/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-34/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Extend existing mixer/import work to multiple original stems with per-channel gain, pan, mute and solo. Validate sample rate, channel layout and intended time alignment before playback.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 07** (ID 8), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-27: https://genstek69.atlassian.net/browse/LAS-27

## Acceptance criteria

- [ ] Supported aligned stems start, pause, resume, seek and stop together without accumulating timing drift.
- [ ] Gain/pan/mute/solo alter the correct channel; individual and master meters represent real signals.
- [ ] Mismatched sample rates, offsets or lengths follow an explicit conversion/alignment policy and are explained to the user.
- [ ] Known aligned fixtures verify summing and timing; existing single-track flows and LAS-11/LAS-12 behavior regressions are checked.

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
        "id": 8,
        "name": "LAS Sprint 07",
        "state": "future",
        "boardId": 1,
        "goal": "Synchronized stems, per-channel processing, advanced workflows and UX validation. See LAS-40."
      }
    ]
  }
}
```
