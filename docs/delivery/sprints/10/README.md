# Sprint group 10 — Pro Mixer

Native sprint: LAS Sprint 10 - Pro Mixer (ID 36, board 1, **future**; this work did not start, close or re-date it).

Package: `docs/claude-code/2026-11-02/SPRINT-10.md` on `docs/LAS-40-sprint-10-handoff-2026-11-02` (package commit `d005b9d`).

Base: `delivery/LAS-40-all-sprints` @ `0296386` (the owner's last tested baseline, confirmed as the actual HEAD before editing).

Branch: `delivery/LAS-40-sprint-10` → [PR #45](https://github.com/genstek/MPS-Audio-Studio/pull/45). Not merged; not main.

**Tested application commit:** `2c5d0ce` (`2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`). Commits after it change only `docs/`.

| Check | Command | Exit | Result | Log |
| --- | --- | --- | --- | --- |
| Lint | `npm run lint` (in `npm run check`) | 0 | no findings | `final/npm-run-check-2c5d0ce.log` |
| Unit and DSP tests | `npm run test:unit` (in `npm run check`) | 0 | 313/313 in 26 files | same; per test: `final/vitest-verbose-2c5d0ce.log` |
| Build | `npm run build` (in `npm run check`) | 0 | built | same |
| Browser | `npm run test:e2e` (in `npm run check`), 2 workers | 0 | **119/119** in 8.2 min | same |
| Artifact scan | `npm run scan:artifacts` | 0 | 159 pieces, 0 findings | `final/scan-artifacts-2c5d0ce.log` |
| DSP regression | `npm run dsp:regression` | 0 | 120 renders (96 earlier + 24 Space), 0 findings, 0 golden differences | `final/dsp-regression-2c5d0ce.log` |

Before the review fixes, the full browser run on the LAS-70 tree (`1146068`) was **116/118**. Its 2 failures are kept in `runs/e2e-1146068-before-review-fixes.log`:
- LAS-26: a 212 ms main-thread task.
- LAS-64: the speakers tail read −70.23 dBFS.

Both were root-caused and fixed (see LAS-66), not re-run until green.

Logs:
- [`final/`](final/): the final check, the artifact scan, the DSP regression and verbose unit tests.
- [`baseline-0296386/`](baseline-0296386/): the baseline run, with the tail of the unit output as captured, and the whole e2e log.

Logs are verbatim, except that trailing spaces are trimmed and private temporary folders are shown as `<scratch>`.

## Baseline (before any Sprint 10 change)
On `0296386`, the baseline checks were clean:
- ESLint: clean.
- Vitest: 275/275 (20 files).
- Vite build: passed.
- Playwright: 81/81 with Chromium 153.

No baseline failures were found to record separately.

LAS-59 (macOS ECONNRESET on the streamed oversize upload test) does not reproduce on Linux. There is no macOS here, so it stays open and unverified.

## Per-issue outcome
| Issue | Mode | Commits | Developer outcome | Proposed Jira status | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-71 250 MiB upload limit | IMPLEMENT | `aa8251d` | READY_FOR_QA: 262,144,000 bytes inclusive everywhere; measured load/export/memory | QA Ready | NOT_RUN |
| LAS-68 Master Level | IMPLEMENT | `8e74cc1` | READY_FOR_QA: monitor volume after A/B, measured at the speakers, excluded from exports | QA Ready | NOT_RUN (incl. listening) |
| LAS-61 movable windows | IMPLEMENT | `ce72cd4` | READY_FOR_QA | QA Ready | NOT_RUN |
| LAS-62 concurrent editors | IMPLEMENT | `ce72cd4`, `bef9308` | READY_FOR_QA | QA Ready | NOT_RUN |
| LAS-63 configured-state previews | IMPLEMENT | `569eb45`, `f9d5ccb` | READY_FOR_QA | QA Ready | NOT_RUN |
| LAS-64 Space reverb | IMPLEMENT | `bef9308`, `d65775b`, `159e902` | READY_FOR_QA: DSP verified numerically, preview = export, golden v2 | QA Ready | NOT_RUN (incl. listening) |
| LAS-67 player | IMPLEMENT | `a915a54`, `2c5d0ce` | READY_FOR_QA (behaviour); look waits for LAS-44 | QA Ready | NOT_RUN |
| LAS-60 New project | IMPLEMENT | `6793920` | READY_FOR_QA | QA Ready | NOT_RUN |
| LAS-69 Save / Open / section presets | IMPLEMENT | `6793920`, `e42b2ff` | READY_FOR_QA | QA Ready | NOT_RUN |
| LAS-70 contextual help | IMPLEMENT | `1146068` | READY_FOR_QA for covered controls; older dialogs partial (inventory) | QA Ready | NOT_RUN |
| LAS-65 processor design research | RESEARCH + DESIGN | `849ba64` | Proposals ready for review; **nothing approved** | In Review | PENDING selection |
| LAS-44 design system and studio designs | DESIGN | `849ba64` | Proposals ready for review; **nothing approved** | In Review | PENDING selection |
| LAS-45 approved shell | GATED | — | **BLOCKED** on the LAS-44 selection; no reskin started | To Do | — |
| LAS-66 QA acceptance and regression | QA | docs | Coverage matrix and checklist; automated regression executed; design acceptance waits for the selection | In Progress | NOT_RUN |

Per issue: `docs/delivery/LAS-N/`, containing README, acceptance mapping, manual QA, `results.json`, `jira-update.md` and evidence.

## Behaviour changes to know about
- **Settings files are now chain schema v2** (Space added). Version 1 files and presets still load, with Space off. Version 2 files are refused by older builds.
- **Exports can be longer** when Space is on and "include the reverb tail" is chosen (the default with Space on). With Space off, nothing changes.
- **Master Level never changes an exported WAV.** It is a per-browser listening level.
- **Project files** (`.mps-project.json`) hold settings and audio identities, never audio. Missing audio is relinked by SHA-256.
- **Test suite:** locators now match names exactly (the ⓘ buttons are named "Help for …"). Two keyboard walks allow the extra Tab stops. No assertion was removed.

## Decisions for Gennady
1. **LAS-65:** processor proposal A, B, the "B inside A" hybrid, or changes.
2. **LAS-44:**
   - Studio Proposal 1, Proposal 2, a mix, or changes.
   - Player A (tape deck with dual needles) or B (compact hybrid).
   - Confirm the QA viewport matrix.
3. **LAS-45** starts after (2).
4. **Master Level policy:** it is a monitor volume, as the package proposed. Confirm, or ask for a separate render trim.
5. **FF/RWD:** ±5 s per click, and hold repeats every 200 ms after 400 ms, as the package proposed. Confirm or adjust.

## Suggested manual QA order
1. LAS-71, LAS-68, LAS-67: load, play and listen.
2. LAS-61/62/63, then LAS-64 with listening.
3. LAS-60/69: a save → reload → open round trip.
4. LAS-70.
5. The design review: LAS-65 → LAS-44.

All steps are **NOT_RUN**. The consolidated list is in [`../../LAS-66/manual-qa.md`](../../LAS-66/manual-qa.md).

## Run it locally
```sh
git fetch origin delivery/LAS-40-sprint-10 && git switch --detach 2c5d0ce
npm ci
npm run check             # lint, unit, build, Playwright (installed Google Chrome by default)
npm run dsp:regression    # golden DSP results v2
npm run dev               # then open http://127.0.0.1:5173
```
