# Sprint group 06 — Explainable proposal, presets and preferences

Native sprint: LAS Sprint 06 (ID 7, **future** — not started, closed or re-dated by this work).

**Tested integration state:** `delivery/LAS-40-all-sprints` at `87b3483` (merge of LAS-33). Its tree is identical to the LAS-33 branch head `f3d3bea`, which contains LAS-32.
- Outside `docs/`, it differs from the fully tested commit `d490a50` only by the one-line artifact-scanner allowlist change in `scripts/scan-artifacts.js` (`65f7278`). That change was linted and the scan rerun on it.
- `npm run check` on `d490a50` (2026-10-30): exit 0 — ESLint clean, Vitest 264/264 (18 files), Vite build, Playwright 76/76 on Linux Chromium 141.
- `npm run scan:artifacts`: 136 pieces, 0 findings.
- Evidence: `docs/delivery/LAS-33/evidence/`.

## Per-issue outcome
| Issue | Mode | Branch → PR | Tested SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-32 explainable reference-guided proposal | IMPLEMENT | `feat/LAS-32-reference-proposal` → [#35](https://github.com/genstek/MPS-Audio-Studio/pull/35) | 20323db | READY_FOR_QA. Guarded proposal measured by rendering; preview/strength/check/apply/undo/reject. **Listening evaluation NOT_RUN** | NOT_RUN |
| LAS-33 presets, preferences, remembered decisions | IMPLEMENT | `feat/LAS-33-presets-preferences` → [#36](https://github.com/genstek/MPS-Audio-Studio/pull/36) | d490a50 | READY_FOR_QA. Schema v5, owner-private; file migration and refusals; preferences apart from reference targets | NOT_RUN |

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach 87b3483
npm ci
npm run dev   # Account: sign in → Import WAV → Compare → Propose settings → Preview / Apply; Mixer → Settings… → My presets
npm run check && npm run scan:artifacts
```
**Database migration:** schema v4 → v5 (`presets`, `preferences`, `decisions`) runs forward-only on start; an in-place upgrade of a v4 database is tested.

## Regressions and behaviour changes
- **One regression found and fixed inside the group.** After the LAS-33 preferences card was added, the LAS-32 browser test's strength locator matched four `output` elements. It is scoped to the strength control now; the assertion is unchanged, and the failed run is kept as evidence.
- **Defect from LAS-28 fixed:** at 360 px the Settings dialog split into two columns and its file picker text was low-contrast. File pickers in every dialog now use normal grid placement and their own colours.
- The artifact scanner accepts PUT request log lines (the first PUT route is `/api/preferences`).
- **Applying a proposal** replaces the chain as one undo step. Previewing and rejecting never change the settings.

## Blockers and decisions for Gennady
1. **Listening evaluation (LAS-32 AC-04, listening part):** compare Mix / Processed (proposal) / Reference at matched loudness on your songs. NOT_RUN until you do.
2. Lia v6 reference: the authorized file and its SHA-256.
3. Still open: ADR-003 and the privacy policy (the account server now also stores presets, preferences and decisions); the design gates LAS-42 → 43 → 44.

## Suggested manual QA order
LAS-32-QA-01..03 (recipe, guards, preview/reject/apply/undo, with the listening record) → LAS-33-QA-01..03 (presets round trip, imports, preferences and decisions). All **Not Run**.
