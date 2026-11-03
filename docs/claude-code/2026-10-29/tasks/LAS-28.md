# LAS-28 — Add editable mastering controls, level-matched A/B and processed WAV export

Jira: https://genstek69.atlassian.net/browse/LAS-28  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-15  
Sprint field: **LAS Sprint 04**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-27.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Connect editable controls to the real LAS-27 parameter model; implement per-module bypass, undo, saved snapshots and position-preserving level-matched original/processed A/B.
- Expose the interactive 24-band L/R/Link EQ with drag Frequency/Gain, Q control, numeric/keyboard editing and real response plot. Live spectrum must measure actual samples.
- Export actual processed 24-bit PCM WAV using equivalent offline DSP; record sample rate/channels/bit depth, render cancellation/tail/latency/dither policy. Independently inspect duration/header/peaks/parity.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-28-QA-01 | Drag/numerically edit an EQ point and Q at supported sizes → correct engine parameter/channel; keyboard access works; undo restores prior state. | NOT_RUN |
| LAS-28-QA-02 | Toggle original/processed at the same musical position → documented constant gain matching and no unexpected state reset. | NOT_RUN |
| LAS-28-QA-03 | Export then independently decode/analyze → valid processed WAV, expected duration/channels/rate/depth, original unchanged and preview/export parity within tolerance. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-28-AC-01 | Controls update audio behavior and display units; bypass and undo restore the expected sound/state without overwriting the original. | NOT_RUN | Pending implementation/evidence |
| LAS-28-AC-02 | A/B retains playback position and uses a documented loudness-matching method to avoid louder-is-better bias. | NOT_RUN | Pending implementation/evidence |
| LAS-28-AC-03 | WAV export records sample rate, channel count and bit depth; conversion/dither policy is explicit where applicable. | NOT_RUN | Pending implementation/evidence |
| LAS-28-AC-04 | Playwright checks the user workflow; audio inspection confirms exported duration, format and signal processing with defined tolerances. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-28/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-28/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-28/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-28/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-28/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Expose the implemented chain through usable controls, bypass, undo and saved settings. Compare original/processed audio at matched perceived loudness and export the actually processed audio, not the source file.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 04** (ID 5), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-27: https://genstek69.atlassian.net/browse/LAS-27

## Acceptance criteria

- [ ] Controls update audio behavior and display units; bypass and undo restore the expected sound/state without overwriting the original.
- [ ] A/B retains playback position and uses a documented loudness-matching method to avoid louder-is-better bias.
- [ ] WAV export records sample rate, channel count and bit depth; conversion/dither policy is explicit where applicable.
- [ ] Playwright checks the user workflow; audio inspection confirms exported duration, format and signal processing with defined tolerances.

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
        "id": 5,
        "name": "LAS Sprint 04",
        "state": "future",
        "boardId": 1,
        "goal": "Mastering controls, level-matched A/B, WAV export and redesigned studio shell. See LAS-40."
      }
    ]
  }
}
```
