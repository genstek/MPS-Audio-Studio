# LAS-10 — Set up Playwright JS and first browser smoke tests

Jira: https://genstek69.atlassian.net/browse/LAS-10  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **In Progress** · Type: Task · Parent: LAS-5  
Sprint field: **SCRUM Sprint 0**  
Work mode: **VERIFY_AND_COMPLETE_TEST_COVERAGE** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Preserve the JavaScript Playwright/Vitest setup and existing tests. Map TC-001 to LAS-53 and valid-WAV TC-002 to LAS-57; do not create duplicate test cases.
- Keep role/label locators, synthetic fixtures, real expected states and beginner-readable comments. Do not weaken geometry assertions. Document HTML ZIP, trace and exact run commands.
- Reconcile README port 5174 with current Playwright 5173. Prove which checkout owns the server when reuseExistingServer is true. CI is proposed as a separate follow-on in the original AC, not a fabricated existing workflow.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-10-QA-01 | Run the current suite against the intended commit/server → report actual pass/fail/skip and environment. | NOT_RUN |
| LAS-10-QA-02 | Trigger a controlled assertion failure on a throwaway test branch → actionable trace/screenshot/HTML report, without altering product expectations to make it green. | NOT_RUN |
| LAS-10-QA-03 | Map each browser assertion to the source manual case and give Gennady the command and report path. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-10-AC-01 | One-command repeatable Playwright run on Chromium with real output, no fabricated pass claims. | NOT_RUN | Pending implementation/evidence |
| LAS-10-AC-02 | Test script and each assertion map to documented manual test case. | NOT_RUN | Pending implementation/evidence |
| LAS-10-AC-03 | Failure shows actionable trace/screenshot/report (configure on failure). | NOT_RUN | Pending implementation/evidence |
| LAS-10-AC-04 | PR includes observed pass/fail evidence and any limitations. | NOT_RUN | Pending implementation/evidence |
| LAS-10-AC-05 | GitHub Actions integration is proposed as follow-on task once local test is stable. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-10/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-10/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-10/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-10/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-10/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Goal

Create understandable Playwright automation in JavaScript for the evolving MPS web mixer. This is both production regression coverage and hands-on learning.

## Scope

* Install Playwright Test in web-app project with straightforward JavaScript config.
* Separate tests into tests/e2e and fixtures if the app structure warrants it.
* Write TC-001: mixer loads; TC-002: import a known test WAV and track appears; TC-003: invalid/unsupported file gets an error, when related features are available.
* Use role/label-based locators and meaningful assertions. Avoid sleep/timeouts and meaningless snapshots.
* Make tests independent; use deterministic synthetic audio files without personal/copyrighted tracks.
* Provide exact local commands for run, headed, UI mode and HTML report.
* Add short comments/explanations for beginner: what are test, page, locator, expect, await, assertions.

## Acceptance criteria

1. One-command repeatable Playwright run on Chromium with real output, no fabricated pass claims.
2. Test script and each assertion map to documented manual test case.
3. Failure shows actionable trace/screenshot/report (configure on failure).
4. PR includes observed pass/fail evidence and any limitations.
5. GitHub Actions integration is proposed as follow-on task once local test is stable.



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
  }
}
```
