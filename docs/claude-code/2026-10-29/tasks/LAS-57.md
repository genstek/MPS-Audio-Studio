# LAS-57 — LAS-10-TC-002: Verify that a valid WAV file is imported successfully

Jira: https://genstek69.atlassian.net/browse/LAS-57  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Test Case · Parent: LAS-5  
Sprint field: **SCRUM Sprint 0**  
Work mode: **AUTOMATION_AND_QA_HANDOFF** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Reuse LAS-57 as TC-002 under LAS-10/LAS-52; implement or map a focused valid-WAV test using tests/fixtures/wav.js.
- Preserve its real expected rule: Play and Stop enabled in Ready, Pause disabled until playback. Decoded sample rate may be resampled; verify decoded metadata honestly. Manual execution belongs to Gennady later.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-57-QA-01 | Clean empty session→import LAS-TC002-tone.wav (3s mono PCM16 44.1 kHz) → Ready, 01 TRACK, filename/duration/decoded metadata, Replace WAV. | NOT_RUN |
| LAS-57-QA-02 | Inspect Ready controls → Play/Stop enabled, Pause disabled; no alert. Record automated run separately from manual Not Run. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| Source criteria | See source below and custom fields | NOT_RUN | Pending evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-57/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-57/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-57/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-57/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-57/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

Verify that importing a valid WAV file adds the track to the workspace, displays the decoded audio information, updates the Transport status to Ready, and enables the appropriate playback controls.

## Imported test/custom fields

```json
{
  "Sprint": {
    "id": "customfield_10020",
    "value": [
      {
        "id": 2,
        "name": "SCRUM Sprint 0",
        "state": "active",
        "boardId": 1,
        "startDate": "2026-10-19T07:23:23.563Z",
        "endDate": "2026-11-02T07:23:23.563Z"
      }
    ]
  },
  "Test Data": {
    "id": "customfield_10050",
    "value": "File name: LAS-TC002-tone.wav  \nFormat: WAV, PCM 16-bit  \nDuration: 3 seconds  \nChannels: Mono  \nSample rate: 44,100 Hz  \nFile source: Deterministic synthetic test audio generated from tests/fixtures/wav.js"
  },
  "Expected Result": {
    "id": "customfield_10051",
    "value": "1. The empty mixer workspace loads and the Transport status displays No audio loaded.\n2. The system file picker opens and allows selection of a WAV file.\n3. The selected WAV file is accepted without displaying an error.\n4. The Transport status displays Ready. \n5. The Tracks badge displays 01 TRACK. \n6. The file name, WAV, and decoded audio information are visible. \n7. Import WAV changes to Replace WAV.\n8. Play and Stop are enabled. \n9. Pause remains disabled until playback starts.\n\n"
  },
  "Test Steps": {
    "id": "customfield_10052",
    "value": "1. Navigate to the application URL in the clean browser session.\n2. In the Tracks section, click Import WAV.\n3. Select the valid LAS-TC002-tone.wav test file.\n4. Wait for the import operation to complete and inspect the Tracks section.\n5. Inspect the Transport section and its controls.\n\n"
  },
  "Preconditions": {
    "id": "customfield_10053",
    "value": "1. The local Vite development server is running.\n2. The application URL is available.\n3. A clean browser session is open with no audio track loaded.\n4. A valid synthetic WAV test file is available.\n\n"
  },
  "Automation Status": {
    "id": "customfield_10054",
    "value": {
      "value": "Planned",
      "id": "10028",
      "color": "GREEN"
    }
  },
  "Test Type": {
    "id": "customfield_10049",
    "value": {
      "value": "Smoke",
      "id": "10022",
      "color": "MAGENTA"
    }
  }
}
```
