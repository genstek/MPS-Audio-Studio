# LAS-35 — Process individual stems and render a synchronized stem master

Jira: https://genstek69.atlassian.net/browse/LAS-35  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **To Do** · Type: Story · Parent: LAS-17  
Sprint field: **LAS Sprint 07**  
Work mode: **IMPLEMENT** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-34, LAS-28.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Route independent versioned stem processing through the master chain. Measure and compensate processor latency; preserve original alignment and recall.
- Define combined/per-stem export headroom, tails, clipping and error recovery rather than silently normalizing every stem.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-35-QA-01 | Different chains on vocal/drums/bass fixtures → only intended channels change; bypass and recall are repeatable. | NOT_RUN |
| LAS-35-QA-02 | Latency-inducing processing → sample alignment preserved in monitored and offline summed output. | NOT_RUN |
| LAS-35-QA-03 | Render supported combined/per-stem WAVs → expected duration/rate/channels and routing, unchanged source bytes. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-35-AC-01 | Each stem supports its own chain/bypass and saved parameters without unintentionally altering other channels. | NOT_RUN | Pending implementation/evidence |
| LAS-35-AC-02 | Processing latency is measured and compensated where required; alignment survives preview and export. | NOT_RUN | Pending implementation/evidence |
| LAS-35-AC-03 | Combined and supported per-stem exports have correct duration, channels and sample rate with headroom/clipping behavior documented. | NOT_RUN | Pending implementation/evidence |
| LAS-35-AC-04 | Tests use known mixtures and cover mute/solo routing, chain recall, failure handling and original-file preservation. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-35/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-35/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-35/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-35/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-35/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User outcome / context

Apply independent validated processing to vocals, drums, bass and other supplied stems, then render a combined mix through the master chain. Preserve original stem timing and support parameter recall.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 07** (ID 8), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* LAS-34: https://genstek69.atlassian.net/browse/LAS-34
* LAS-28: https://genstek69.atlassian.net/browse/LAS-28

## Acceptance criteria

- [ ] Each stem supports its own chain/bypass and saved parameters without unintentionally altering other channels.
- [ ] Processing latency is measured and compensated where required; alignment survives preview and export.
- [ ] Combined and supported per-stem exports have correct duration, channels and sample rate with headroom/clipping behavior documented.
- [ ] Tests use known mixtures and cover mute/solo routing, chain recall, failure handling and original-file preservation.

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
