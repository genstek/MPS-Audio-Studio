# LAS-36 — Evaluate AI stem separation quality, runtime and deployment options

Jira: https://genstek69.atlassian.net/browse/LAS-36  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Task · Parent: LAS-17  
Sprint field: **LAS Sprint 08**  
Work mode: **RESEARCH** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-35.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Compare at least two feasible authorized source-separation approaches when resources allow, with licenses, model versions, hardware/runtime/memory and privacy/cost assumptions.
- Use available ground-truth stems for residual comparisons; record bleed, transients, warble, phase/mono and recombination. Deliver go/no-go plus scoped next step, not an invented production feature.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-36-QA-01 | Authorized mixture and known stems → run feasible candidates; record actual runtime and artifacts or precise resource blockers. | NOT_RUN |
| LAS-36-QA-02 | Matched listening/numerical comparison → limitations and go/no-go; unexecuted comparisons remain Not Run. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-36-AC-01 | At least two feasible approaches are compared for vocal/drum/bass/other separation when resources allow; unavailable options are documented. | NOT_RUN | Pending implementation/evidence |
| LAS-36-AC-02 | Listening and available objective comparisons record bleed, transient damage, warbling, phase/mono behavior and stem recombination residual. | NOT_RUN | Pending implementation/evidence |
| LAS-36-AC-03 | Report records runtime, hardware/memory requirements, model license, deployment/privacy options and estimated operating cost assumptions. | NOT_RUN | Pending implementation/evidence |
| LAS-36-AC-04 | A go/no-go recommendation defines supported use cases, quality gates and a separately scoped integration step; separation is not described as lossless source recovery. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-36/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-36/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-36/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-36/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-36/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Run a time-bounded investigation of suitable source-separation models using authorized clips and available hardware. Compare original stems where available. A recommendation and measured limitations are the deliverable; production integration is not assumed.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 08** (ID 9), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-35: https://genstek69.atlassian.net/browse/LAS-35

## Acceptance criteria

- [ ] At least two feasible approaches are compared for vocal/drum/bass/other separation when resources allow; unavailable options are documented.
- [ ] Listening and available objective comparisons record bleed, transient damage, warbling, phase/mono behavior and stem recombination residual.
- [ ] Report records runtime, hardware/memory requirements, model license, deployment/privacy options and estimated operating cost assumptions.
- [ ] A go/no-go recommendation defines supported use cases, quality gates and a separately scoped integration step; separation is not described as lossless source recovery.

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
