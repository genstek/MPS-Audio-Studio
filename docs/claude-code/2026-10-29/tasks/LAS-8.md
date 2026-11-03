# LAS-8 — Import WAV audio and display a track in the mixer

Jira: https://genstek69.atlassian.net/browse/LAS-8  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-5  
Sprint field: **Unscheduled foundation work; do not assign a sprint silently.**  
Work mode: **VERIFY_AND_CLOSE_GAPS** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Retain local WAV import, the current 100 MiB boundary and decoded-rate labeling; browser AudioContext can resample.
- Cover RIFF/WAVE header validation, valid-header/invalid-payload decode errors, replacement failure, same-file reimport and overlapping-load lifecycle. Do not implement drag/drop unless separately justified by the story.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-8-QA-01 | Import a synthetic PCM16 44.1 kHz WAV → correct name, channels, decoded duration/rate and Ready appear. | NOT_RUN |
| LAS-8-QA-02 | While a valid track exists, replace it with valid-header undecodable audio → actionable error; previous track remains usable. | NOT_RUN |
| LAS-8-QA-03 | Try empty, wrong extension, disguised/corrupt data and documented size boundaries → recoverable rejection; a later valid import succeeds. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-8-AC-01 | Valid WAV can be selected and displayed in a named track. | NOT_RUN | Pending implementation/evidence |
| LAS-8-AC-02 | Duration/status reflect decoded audio rather than hardcoded demo data. | NOT_RUN | Pending implementation/evidence |
| LAS-8-AC-03 | Invalid or unsupported files produce a clear recoverable error. | NOT_RUN | Pending implementation/evidence |
| LAS-8-AC-04 | Reimport/retry works without duplicate dangling audio nodes. | NOT_RUN | Pending implementation/evidence |
| LAS-8-AC-05 | Unit/integration validation uses small committed synthetic non-copyrighted test fixtures. | NOT_RUN | Pending implementation/evidence |
| LAS-8-AC-06 | Manual test steps and evidence are included in PR. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-8/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-8/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-8/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-8/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-8/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User story

As a user, I want to import an audio file and see it as a mixer track so that I can prepare it for listening and processing.

## Scope

* File picker supporting valid WAV files.
* Decode metadata and prepare playback using browser-supported audio APIs.
* Show file name, load status, basic track strip and duration once decoded.
* Handle unsupported/corrupt/empty files, decode failure and large-file performance without UI freeze.
* Do not overwrite source file.

## Acceptance criteria

1. Valid WAV can be selected and displayed in a named track.
2. Duration/status reflect decoded audio rather than hardcoded demo data.
3. Invalid or unsupported files produce a clear recoverable error.
4. Reimport/retry works without duplicate dangling audio nodes.
5. Unit/integration validation uses small committed synthetic non-copyrighted test fixtures.
6. Manual test steps and evidence are included in PR.
