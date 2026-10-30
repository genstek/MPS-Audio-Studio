# Sprint group 07 — Stems: synchronized playback, per-stem processing and stem master; gated redesign work

Native sprint: LAS Sprint 07 (ID 8, **future** — not started, closed or re-dated by this work).

**Tested integration state:** `delivery/LAS-40-all-sprints` at `09b3874` (merge of LAS-35). Its tree is **identical** to the LAS-35 branch head, which contains LAS-34; outside `docs/` the code equals the fully tested commit `7fc3a59`.
- `npm run check` on `7fc3a59` (2026-10-30): exit 0 — ESLint clean, Vitest 275/275 (20 files), Vite build, Playwright 81/81 on Linux Chromium 141.
- `npm run scan:artifacts`: 145 pieces, 0 findings.
- Evidence: `docs/delivery/LAS-35/evidence/`.

## Per-issue outcome
| Issue | Mode | Branch → PR | Tested SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-34 stems through synchronized mixer channels | IMPLEMENT | `feat/LAS-34-stems` → [#37](https://github.com/genstek/MPS-Audio-Studio/pull/37) | 98bf1c6 | READY_FOR_QA. Shared-clock starts, sample alignment measured on real Web Audio rendering, explicit policy | NOT_RUN |
| LAS-35 per-stem processing and stem master render | IMPLEMENT | `feat/LAS-35-stem-processing` → [#38](https://github.com/genstek/MPS-Audio-Studio/pull/38) | 7fc3a59 | READY_FOR_QA. Live = offline to 1.19e-7; exports exact to 24-bit rounding; session recall by checksum | NOT_RUN |
| LAS-46 approved mastering/reference/stem/export workflows | GATED_IMPLEMENTATION | — (status documents) | — | **BLOCKED**: needs the approved design (LAS-42 → 43 → 44 → 45). The workflows themselves work in provisional styling | PENDING |
| LAS-47 usability, accessibility and visual review of the redesign | QA_REVIEW_REQUIRED | — (status documents) | — | **BLOCKED**: needs LAS-46. Gennady's review is not prefilled | PENDING |

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach 09b3874
npm ci
npm run dev   # Mixer → Stems… → Add stem WAVs → strips, chains, Play/seek → Render stem master
npm run check && npm run scan:artifacts
```
No database migration in this group. New file formats: `mps-stem-session` v1 (settings only, no audio).

## Regressions and behaviour changes
- **One layout regression found and fixed inside the group.** A masthead *Stems* button made the page 3 px too tall at 761×450 (6 LAS-51 tests failed). The entry moved to the mixer heading (*Stems…*); the accepted responsive layout is unchanged.
- **One DSP defect found and fixed inside the group.** Offline per-stem chain tails were cut at a short stem's end; they now run to the session end, as they do live.
- Single-track playback and stem playback take turns; single-track flows (LAS-8 to LAS-12, LAS-28) pass unchanged.

## Blockers and decisions for Gennady
1. **Design gates:** LAS-42 direction → LAS-43 walkthrough → LAS-44 approval. LAS-45, LAS-46 and LAS-47 wait on these.
2. Still open: ADR-003 and the privacy policy; the Lia v6 file and checksum; the listening reviews (LAS-29, LAS-32).

## Suggested manual QA order
LAS-34-QA-01..03 (sync, routing and meters, mismatches) → LAS-35-QA-01..03 (per-stem chains and recall, alignment, rendered files in your DAW). All **Not Run**.
