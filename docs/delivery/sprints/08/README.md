# Sprint group 08 — Research: AI stem separation and a native plugin host bridge

Native sprint: LAS Sprint 08 (ID 9, **future** — not started, closed or re-dated by this work).

**Tested integration state:** `delivery/LAS-40-all-sprints` at `b16c0ba` (merge of LAS-39). Outside `docs/` the code equals the LAS-35 tested commit `7fc3a59`.
- Final `npm run check` on `b16c0ba` (2026-10-30): exit 0 — ESLint clean (including the research JavaScript under `docs/`), Vitest 275/275 (20 files), Vite build, Playwright 81/81 on Linux Chromium 141.
- `npm run scan:artifacts`: 145 pieces, 0 findings.
- Evidence: [`docs/delivery/final-check/`](../../final-check/).

Both issues are research. Their reports, tools, prototypes and tests live under `docs/delivery/LAS-36/` and `docs/delivery/LAS-37/`; **no application code changed** in this group.

## Per-issue outcome
| Issue | Mode | Branch → PR | Report SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-36 AI stem separation: quality, runtime, deployment | RESEARCH | `research/LAS-36-stem-separation` → [#39](https://github.com/genstek/MPS-Audio-Studio/pull/39) | 8a4b6d7 | READY_FOR_QA. Classical separation **NO-GO**: vocals fail and drum transients are lost, even on easy synthetic stems. ML candidates **NOT_RUN**: every model host is blocked by this environment's network policy. A reusable scorer and a scoped next step are included | NOT_RUN |
| LAS-37 native VST3/AU host bridge | RESEARCH | `research/LAS-37-plugin-host-bridge` → [#40](https://github.com/genstek/MPS-Audio-Studio/pull/40) | 624df6c | READY_FOR_QA. Architecture: local paired bridge with one process per plugin instance, offline rendering first. A bridge prototype passes 7/7 tests with stand-in plugins. Real plugin **NOT_RUN** (denied by the session's permission policy); no macOS for AU. **GO only for a scoped validation step** | NOT_RUN |

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach b16c0ba
python3 -m venv .venv && .venv/bin/pip install -r docs/delivery/LAS-36/tools/requirements.txt
.venv/bin/python docs/delivery/LAS-36/tools/separation_eval.py          # LAS-36 synthetic evaluation (JSON)
node --test docs/delivery/LAS-37/prototype/bridge.test.js               # LAS-37 bridge prototype, 7 tests
```
No database migration, no new file format, no UI change.

## Regressions and behaviour changes
- None: no application code changed.
- The research files are JavaScript under `docs/`, so they are linted by `npm run check`.

## Blockers and decisions for Gennady
1. **LAS-36:** permission or a machine with access to a model host, to run the ML separators through the included scorer. Then a listening comparison.
2. **LAS-37:** your decision on the bridge architecture, and permission (or your Mac) to run a permitted plugin behind the same API. LAS-38 waits for this.
3. Licensing notes in LAS-37 are recalled, not re-verified.

## Suggested manual QA order
LAS-36-QA-01..02 (read the report, run the scorer) → LAS-37-QA-01..02 (real-plugin decision, run the prototype tests). All **Not Run**.
