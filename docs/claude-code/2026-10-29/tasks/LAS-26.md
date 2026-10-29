# LAS-26 — Analyze WAV loudness, true peaks, spectrum, dynamics and stereo behavior

Jira: https://genstek69.atlassian.net/browse/LAS-26  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-15  
Sprint field: **LAS Sprint 03**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Build actual analysis with algorithm/version/sample-rate/segment metadata; workers or a documented non-blocking path handle long data.
- Validate integrated loudness, sample peak, oversampled true peak, dynamics, spectrum and stereo indicators against independent fixtures/tools. Define silence/mono/unsupported states.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-26-QA-01 | Silence, tones, impulses, mono/stereo, clipped and intersample-peak fixtures → finite, correctly labeled values within declared tolerances. | NOT_RUN |
| LAS-26-QA-02 | Analyze a representative long WAV → UI stays usable; cancel/retry and corrupt input recover safely. | NOT_RUN |
| LAS-26-QA-03 | Compare an identical file/segment twice → reproducible measurements; source hash unchanged. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-26-AC-01 | Report includes integrated loudness, sample and true peaks, useful dynamics measures, spectral energy and stereo/mono indicators where applicable. | NOT_RUN | Pending implementation/evidence |
| LAS-26-AC-02 | Known tones, silence, mono/stereo and deliberately clipped fixtures produce validated results with documented tolerances. | NOT_RUN | Pending implementation/evidence |
| LAS-26-AC-03 | Measurement definitions and reference implementation are recorded; sample peaks are not mislabeled as true peaks. | NOT_RUN | Pending implementation/evidence |
| LAS-26-AC-04 | Unsupported/corrupt inputs fail clearly; original audio is unchanged and the UI remains responsive during analysis. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-26/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-26/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-26/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-26/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-26/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Add an analysis module and a readable report for real audio. Define each measurement, units, supported sample rates/channel layouts and the loudness/true-peak implementation. Reuse existing WAV import and transport (LAS-8/LAS-9).

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 03** (ID 4), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* Review current repository and existing LAS-8/LAS-9 import/transport readiness; preserve LAS-10/LAS-11/LAS-12.

## Acceptance criteria

- [ ] Report includes integrated loudness, sample and true peaks, useful dynamics measures, spectral energy and stereo/mono indicators where applicable.
- [ ] Known tones, silence, mono/stereo and deliberately clipped fixtures produce validated results with documented tolerances.
- [ ] Measurement definitions and reference implementation are recorded; sample peaks are not mislabeled as true peaks.
- [ ] Unsupported/corrupt inputs fail clearly; original audio is unchanged and the UI remains responsive during analysis.

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
        "id": 4,
        "name": "LAS Sprint 03",
        "state": "future",
        "boardId": 1,
        "goal": "Audio analysis, validated DSP chain and approved design system. See LAS-40."
      }
    ]
  }
}
```
