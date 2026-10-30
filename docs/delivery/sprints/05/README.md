# Sprint group 05 — Reference profiles and level-matched comparison

Native sprint: LAS Sprint 05 (ID 6, **future** — not started, closed or re-dated by this work). Goal in Jira: "Reference audio profiles and level-matched comparison."

**Tested integration state:** `delivery/LAS-40-all-sprints` at `833ddc7` (merge of LAS-31). Its tree, `f44d7d9`, is **identical** to the tested LAS-31 tree; `git diff 774f2b6 833ddc7` is empty, and the code equals `5ff67e9`. The LAS-31 run therefore applies to this exact state: `npm run check` exit 0 (2026-10-30) — ESLint clean, Vitest 239/239 (15 files), Vite build, Playwright 72/72 on Linux Chromium 141; `npm run scan:artifacts`: 128 pieces, 0 findings. Evidence: `docs/delivery/LAS-31/evidence/`.

## Per-issue outcome
| Issue | Mode | Branch → PR | Tested SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-30 reference import and versioned, owner-private sound profiles | IMPLEMENT | `feat/LAS-30-reference-profiles` → [#33](https://github.com/genstek/MPS-Audio-Studio/pull/33) | ad800ea | READY_FOR_QA. Schema v4; two-user isolation and deletion cascades tested; reproducible reanalysis | NOT_RUN |
| LAS-31 compare a mix with its reference at matched loudness | IMPLEMENT | `feat/LAS-31-reference-comparison` → [#34](https://github.com/genstek/MPS-Audio-Studio/pull/34) | 5ff67e9 | READY_FOR_QA. Measured differences with units and limits; interpretations kept separate; level-matched monitor; no settings change on selection | NOT_RUN |

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach 833ddc7
npm ci
npm run dev        # Account: sign in → References: save a reference segment → Import WAV → Compare
npm run check && npm run scan:artifacts
```
**Database migration:** schema v3 → v4 (`reference_profiles`) runs forward-only on start; an upgrade of an existing v3 database is tested. No other migration in this group.

## Regressions and behaviour changes
- No test regressions. One defect from LAS-30 was found and fixed in LAS-31: at 360 px the reference file picker sat outside the dialog. A regression test was added, and its negative control fails without the fix.
- New masthead button **References** and Tracks heading button **Compare**. The Tracks heading layout test (320 px and up) still passes with the extra button.
- While the comparison monitor runs, it replaces normal playback: the transport shows *Stopped*. Closing the dialog restores normal listening.

## Blockers and decisions for Gennady
1. **Lia v6:** the authorized file and its SHA-256. Profiles and comparison verify checksums and work with it once provided. No figure is invented meanwhile.
2. The **listening judgement** of the matched comparison and of LAS-29's blind sets is yours: NOT_RUN.
3. Still open from earlier groups: approve ADR-003 and the privacy policy (the account server now also stores references); the design gates LAS-42 → 43 → 44 (LAS-45 to 47).

## Suggested manual QA order
LAS-30-QA-01..03 (save, reanalyse, delete; second account) → LAS-31-QA-01..03 (compare and monitor, edge sections, settings unchanged). All **Not Run**.
