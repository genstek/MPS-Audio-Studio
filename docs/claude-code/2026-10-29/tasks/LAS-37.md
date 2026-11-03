# LAS-37 — Design and evaluate a native VST3/AU host bridge for the web studio

Jira: https://genstek69.atlassian.net/browse/LAS-37  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-18  
Sprint field: **LAS Sprint 08**  
Work mode: **RESEARCH** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-29.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Inspect native code availability: current main has historical JUCE documents, not a working native host. Keep the browser app intact.
- Evaluate an authenticated local host bridge, discovery, parameter/state control, crash/resource containment, formats/architectures/licenses and preview/export parity with a permitted plugin.
- If macOS/AU, SDK/plugin or host build is unavailable, deliver design/prototype evidence for the feasible subset and explicit blockers; no support claim from a diagram.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-37-QA-01 | Permitted plugin on available platform → actual routed processing and parameter/state evidence, or exact unexecuted blocker. | NOT_RUN |
| LAS-37-QA-02 | Unauthorized bridge client and host/plugin crash → isolation/control design and executable evidence where available; no loss of source/project. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-37-AC-01 | Architecture decision explains why ordinary native VST3/AU binaries require a native host and defines the browser/host boundary. | NOT_RUN | Pending implementation/evidence |
| LAS-37-AC-02 | Feasibility evidence covers at least one permitted test plugin, audio routing, parameter access and preview/offline behavior. | NOT_RUN | Pending implementation/evidence |
| LAS-37-AC-03 | Platform/architecture compatibility, supported formats, JUCE/SDK/plugin licensing and installation requirements are recorded. | NOT_RUN | Pending implementation/evidence |
| LAS-37-AC-04 | Threat model covers untrusted plugins, local bridge authentication, file/system permissions, crashes and resource limits; recommendation is go/no-go with a scoped next step. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-37/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-37/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-37/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-37/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-37/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Inspect the existing native/JUCE work and compare a local native host plus web interface with built-in browser DSP and offline rendering. Investigate plugin discovery, audio routing, parameter control, persistence and isolation before selecting an architecture.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 08** (ID 9), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-29: https://genstek69.atlassian.net/browse/LAS-29

## Acceptance criteria

- [ ] Architecture decision explains why ordinary native VST3/AU binaries require a native host and defines the browser/host boundary.
- [ ] Feasibility evidence covers at least one permitted test plugin, audio routing, parameter access and preview/offline behavior.
- [ ] Platform/architecture compatibility, supported formats, JUCE/SDK/plugin licensing and installation requirements are recorded.
- [ ] Threat model covers untrusted plugins, local bridge authentication, file/system permissions, crashes and resource limits; recommendation is go/no-go with a scoped next step.

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
        "id": 9,
        "name": "LAS Sprint 08",
        "state": "future",
        "boardId": 1,
        "goal": "Evaluate AI stem separation and native plugin-host feasibility. See LAS-40."
      }
    ]
  }
}
```
