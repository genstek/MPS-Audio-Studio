# LAS-29 — Establish DSP regression fixtures and a mastering listening-review protocol

Jira: https://genstek69.atlassian.net/browse/LAS-29  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-15  
Sprint field: **LAS Sprint 04**  
Work mode: **VALIDATE_IMPLEMENTATION** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-28.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Create deterministic synthetic DSP fixtures and an independent measurement/parity harness. Record the actual algorithms/tolerances and golden versioning policy.
- Prepare a matched-loudness listening protocol for Gennady. Lia v6 is an approved sonic target; obtain the real authorized file/checksum before matching. Historical loudness figures are not measurements of current files.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-29-QA-01 | Run filter/compressor/limiter/mono/correlation/parity fixtures → measured outputs and explicit tolerances, including negative tests. | NOT_RUN |
| LAS-29-QA-02 | Prepare original/processed/reference listening examples → same segment/time alignment, documented constant gain, blind labels if feasible; human verdict remains Not Run until listened. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-29-AC-01 | Versioned fixtures cover silence, impulses, tones, stereo phase, transient-rich audio and representative music. | NOT_RUN | Pending implementation/evidence |
| LAS-29-AC-02 | Checks detect unintended clipping, NaN/Inf, timing/channel changes and regression in bypass/processing behavior. | NOT_RUN | Pending implementation/evidence |
| LAS-29-AC-03 | Listening review records punch, bass balance, vocal clarity, harshness, pumping and mono compatibility without presenting taste as objective truth. | NOT_RUN | Pending implementation/evidence |
| LAS-29-AC-04 | Supported browsers/devices and performance observations are documented; results are reproducible and remaining limitations are visible. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-29/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-29/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-29/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-29/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-29/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Build a small reproducible benchmark of synthetic signals and authorized music clips. Record an audio-quality checklist and compare processing versions with matched loudness; do not treat passing UI tests as audio-quality proof.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 04** (ID 5), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-28: https://genstek69.atlassian.net/browse/LAS-28

## Acceptance criteria

- [ ] Versioned fixtures cover silence, impulses, tones, stereo phase, transient-rich audio and representative music.
- [ ] Checks detect unintended clipping, NaN/Inf, timing/channel changes and regression in bypass/processing behavior.
- [ ] Listening review records punch, bass balance, vocal clarity, harshness, pumping and mono compatibility without presenting taste as objective truth.
- [ ] Supported browsers/devices and performance observations are documented; results are reproducible and remaining limitations are visible.

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
