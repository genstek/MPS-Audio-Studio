# LAS-123 — QA gates for Intelligent Mastering: protocol and coverage

**Status:** automated suite added for features that exist today; everything else is explicitly **NOT_RUN** or **skipped** with the owning ticket. Nothing here proves listening quality. Fixtures are generated from code; no Suno/user audio is stored or may be added. Test IDs refer to [INTELLIGENT_MASTERING_QA_MATRIX.md](INTELLIGENT_MASTERING_QA_MATRIX.md).

## Automated coverage map

Suite: `tests/unit/las123-qa.test.js` (Vitest). A skipped test is NOT_RUN, never PASS.

| Requirement | Matrix | Status | Where |
|---|---|---|---|
| Level, RMS, LUFS math at 44.1/48/96 kHz | IA-01, IA-21 | Automated | `DSP math` |
| True peak (inter-sample peak) at 44.1/48/96 kHz | IA-21 | Automated | `DSP math` |
| Section time alignment (step located within one 100 ms hop, all rates; reproducible) | IA-02 | Automated for the segment-analysis primitive only | `section time alignment` |
| Spectral gap measured at the correct section | IA-03 | Automated (measurement only) | `spectral measurement` |
| Gap labelled "possible arrangement change", no auto boost; mismatched reference alignment | IA-03, IA-19 | **NOT_RUN** — LAS-173, LAS-122 | skipped |
| Pan motion vs phase fault; L=−R burst local vs whole-file; centred mono | IA-05/06/07 | Automated at metric level | `pan motion vs phase fault` |
| Stem offset recovery (+47 ms, primitive) | IA-10 | Automated primitive only | same |
| Stereo-stage advice ignores intentional pan; stem alignment proposal | IA-05, IA-10 | **NOT_RUN** — LAS-128, LAS-122 | skipped |
| Silent / short / invalid / truncated source, NaN/Inf input | IA-04 | Automated | `invalid, silent and short` |
| False positives on clean tone | — | Automated (minimal) | `false positives` |
| Metadata precision, 16/24-bit headers, independent byte-level WAV readback | IA-01, IA-18 | Automated (independent RIFF reader in the test) | `metadata precision` |
| Real 96 kHz header after 48→96 SRC, no content above source Nyquist | IA-18 | Automated | `resample and clipping` |
| Clipping counted on export; limiter keeps export unclipped | — | Automated | same |
| No EQ reset at 30–60 s (76 s continuous render, −12 dB bell steady within 0.05 dB) | IA-15 | Automated offline render only | `no 30–60 s EQ reset` |
| Preview → Reject; Apply is one undo step; Undo/Redo exact; stale revision/track/project; out-of-bounds proposal | IA-15, IA-16 | Automated at the state-machine level (undo stack modelled in the test, not the React hook) | `Preview → Reject → Apply → Undo` |
| Preview/Apply/Undo through real UI during playback; live (worklet) 30–60 s | IA-15 | **NOT_RUN** — LAS-120 | skipped / manual |
| Intentional-pan annotation persists | IA-13 | **NOT_RUN** — LAS-122 | skipped |
| Saved report JSON / PDF | — | **NOT_RUN** — LAS-172 | skipped |
| No upload | — | Existing e2e: `tests/e2e/local-only.spec.js`, `privacy.spec.js` (not new in this PR) | existing |
| 7.1.4, vocal delay overlap, stem bleed, monitor-only EQ parity, 250 MB cancel | IA-08/09/11/14/17/20/22 | **NOT_RUN** — no implementation / out of LAS-123 scope | — |

## Run record (fill in per run)

Record every run in this table; do not edit past rows.

| Field | Value |
|---|---|
| Base SHA | `3087a171a738ce6fc37ddc140359b248f1c47c6b` (main at branch creation) |
| Tested SHA | the PR head commit; take it from CI |
| Node | v24.22.2 (repo requires ≥ 22.13) |
| Commands | `npm ci`, `npm run lint`, `npm run test:unit`, `npm run build`, `npm run test:e2e -- tests/e2e/local-only.spec.js tests/e2e/hires-export.spec.js tests/e2e/proposal.spec.js` |
| CI logs | link the GitHub Actions run for the tested SHA |
| Independent WAV readback | automated: `readbackWav()` in the suite; manual: `ffprobe -show_streams export.wav` and compare rate/bits/duration |

### Run 1 — local Linux (agent session, base SHA above plus the uncommitted QA files)

| Command | Result |
|---|---|
| `npm run lint` | clean |
| `npm run test:unit` | 30 files; 424 passed, 9 skipped (NOT_RUN placeholders) — baseline before this change was 369 passed |
| `npm run build` | built |
| `npm run test:e2e -- tests/e2e/local-only.spec.js tests/e2e/hires-export.spec.js tests/e2e/proposal.spec.js` | 8 passed (after `npx playwright install chromium`; the first attempt failed only because the browser was missing) |

The full Playwright suite and the Ventura/Intel build were **not** run. Manual listening: **NOT_RUN**.

## Manual protocol — macOS Ventura 13.7.8 (Intel)

**All steps NOT_RUN until a person executes them on that machine.** Record PASS/FAIL, SHA, date and tester; attach screenshots/logs. Do not use private audio in shared evidence; use the synthetic files from `tests/fixtures`.

Environment: Intel Mac, macOS 13.7.8, build SHA ______, built per `apple/README.md` and `apple/QA.md` (Gatekeeper not bypassed; note signing state honestly).

| # | Step | Expected | Result |
|---|---|---|---|
| M1 | Build/launch the Intel app on 13.7.8 | Starts, no crash, build SHA shown matches | NOT_RUN |
| M2 | Import synthetic stereo WAVs at 44.1 / 48 / 96 kHz, 16 and 24-bit | Rate, duration, format shown correctly | NOT_RUN |
| M3 | Play 5+ minutes with an EQ band set; watch 30–60 s | No EQ reset, no clicks, no -12 dB jump | NOT_RUN |
| M4 | Apply → Undo → Redo → Save → Reopen while playing | State consistent (IA-15) | NOT_RUN |
| M5 | Export 16-bit and 24-bit, and 48→96 kHz | `ffprobe` header matches chosen rate/bits; true peak under ceiling | NOT_RUN |
| M6 | Network monitor (Little Snitch / `nettop`) during import→export | No audio or file name leaves the machine | NOT_RUN |
| M7 | 10 repeated import/play/stop cycles | Stable memory, no hang | NOT_RUN |
| M8 | Save report JSON/PDF (after LAS-172) | Files open; numbers equal on-screen | NOT_RUN (LAS-172) |
| M9 | **Manual listening**: A/B original vs processed at matched loudness | Person's verdict recorded separately from measurements | NOT_RUN |

## Known gaps

- Timeline (LAS-173), advice (LAS-122), Preview/Apply UI (LAS-120), stereo stage (LAS-128), report (LAS-172) tests are skipped placeholders only.
- Section alignment is tested on the existing segment analysis, not on a timeline feature.
- The 76 s EQ test exercises the offline renderer; the live worklet path and Ventura hardware are not covered.
- Undo is modelled with the same commit contract the hook uses; the React hook's undo is covered only by existing e2e specs.
- No Ventura/Intel CI exists in this change. The Apple workflow is not modified.
