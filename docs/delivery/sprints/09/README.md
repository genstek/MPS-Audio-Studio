# Sprint group 09 — Gated plugin prototype and model-training feasibility

Native sprint: LAS Sprint 09 (ID 10, **future** — not started, closed or re-dated by this work).

**Tested integration state:** `delivery/LAS-40-all-sprints` at `b16c0ba` (merge of LAS-39). Outside `docs/` the code equals the LAS-35 tested commit `7fc3a59`.
- Final `npm run check` on `b16c0ba` (2026-10-30): exit 0 — ESLint clean (including the research JavaScript under `docs/`), Vitest 275/275 (20 files), Vite build, Playwright 81/81 on Linux Chromium 141.
- `npm run scan:artifacts`: 145 pieces, 0 findings.
- Evidence: [`docs/delivery/final-check/`](../../final-check/).

## Per-issue outcome
| Issue | Mode | Branch → PR | Report SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-38 application-controlled plugin processing | GATED_PROTOTYPE | — (status documents) | — | **BLOCKED**: needs a real-plugin LAS-37 pass, your architecture approval and a permitted host/plugin. A scoped plan is recorded; no pretend controls were built | PENDING |
| LAS-39 training a separate audio model | RESEARCH | `research/LAS-39-model-training-assessment` → [#41](https://github.com/genstek/MPS-Audio-Studio/pull/41) | aa46bd5 | READY_FOR_QA. Protocol grouped by song, with automated leakage checks before training. Synthetic experiment: LAS-32's closed loop beats a learned ridge predictor on measured match (0.11 vs 0.21 dB). Production training and style transfer **NO-GO**; a consented preference study is possible later. Real data and listening **NOT_RUN** | NOT_RUN |

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach b16c0ba
node --test docs/delivery/LAS-39/experiment/protocol.test.js       # 9 protocol tests
node docs/delivery/LAS-39/experiment/experiment.js results.json    # ≈ 7 min; compare with evidence/experiment-summary.json
```
No database migration, no new file format, no UI change.

## Regressions and behaviour changes
- None: no application code changed.
- The LAS-39 experiment imports the studio's own `src/` (analysis, chain, proposal), so it measures the code that ships.

## Blockers and decisions for Gennady
1. **LAS-38:** gated on LAS-37 (see sprint 08).
2. **LAS-39:**
   - Should remembered decisions ever be used for a local preference study? That needs a new purpose-specific opt-in, because the Settings text promises "nothing trained".
   - Can your own projects (unmastered mix + final master) form a first dataset?
   - The proposed quality and listening criteria need your approval.

## Suggested manual QA order
LAS-39-QA-01..02 (data and consent decision, run the experiment) → LAS-38 after its gate. All **Not Run**.
