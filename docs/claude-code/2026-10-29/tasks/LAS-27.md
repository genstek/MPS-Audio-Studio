# LAS-27 — Implement a reproducible EQ, compressor and limiter processing chain

Jira: https://genstek69.atlassian.net/browse/LAS-27  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-15  
Sprint field: **LAS Sprint 03**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-26.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Create a versioned parameter schema and a validated EQ→compressor→limiter chain with documented preview/offline semantics. Do not turn unavailable controls into decorations.
- Preserve the user-requested 24 independent parametric bands per L and per R, Left/Right/Link, 20 Hz–min(20 kHz,0.45×sampleRate), gain/Q/type. See REQUIREMENT_RECONCILIATION.md; introduce in small testable slices within this task.
- Use stable/smoothed parameters and a verified transfer response, not a Gaussian UI curve. Characterize compressor timing and limiter latency/oversampled true-peak detection. Optional reverb/saturation remain deferred by this ticket.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-27-QA-01 | Change one left-channel EQ band → measured left response changes; right response stays unchanged; Link edits both according to documented semantics. | NOT_RUN |
| LAS-27-QA-02 | Impulse/sweep/level-step fixtures → response, attack/release, limiter ceiling, latency, bypass and no-NaN guards pass at supported sample rates. | NOT_RUN |
| LAS-27-QA-03 | Serialize/reload the chain → same parameters and deterministic output within tolerance. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-27-AC-01 | Every enabled processor demonstrably changes a known signal as expected; bypass returns the defined unprocessed signal. | NOT_RUN | Pending implementation/evidence |
| LAS-27-AC-02 | Parameter serialization includes filter frequency/gain/Q, compressor controls, chain order and version for repeatable rendering. | NOT_RUN | Pending implementation/evidence |
| LAS-27-AC-03 | Numerical checks cover filter response, compression behavior, peak limiting, latency and non-finite output. | NOT_RUN | Pending implementation/evidence |
| LAS-27-AC-04 | Original inputs are preserved; unsupported settings fail safely and preview/export share documented processing semantics. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-27/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-27/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-27/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-27/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-27/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Build the first real DSP pipeline with parametric EQ, compression and a peak-controlled final stage. Choose AudioWorklet/WebAssembly and offline rendering boundaries after repository inspection; defer optional saturation/reverb until the baseline is validated.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 03** (ID 4), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-26: https://genstek69.atlassian.net/browse/LAS-26

## Acceptance criteria

- [ ] Every enabled processor demonstrably changes a known signal as expected; bypass returns the defined unprocessed signal.
- [ ] Parameter serialization includes filter frequency/gain/Q, compressor controls, chain order and version for repeatable rendering.
- [ ] Numerical checks cover filter response, compression behavior, peak limiting, latency and non-finite output.
- [ ] Original inputs are preserved; unsupported settings fail safely and preview/export share documented processing semantics.

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
