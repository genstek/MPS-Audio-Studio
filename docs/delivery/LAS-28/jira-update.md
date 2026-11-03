**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-28

Scope: Working EQ (24 bands L/R/Link, real curve, live spectrum, drag/keyboard/numeric), Dynamics and Limiter editors with gain-reduction meters; undo/redo, snapshots, settings files; Original/Processed switch that keeps the position, with BS.1770 loudness matching (louder version turned down); processed WAV export (24-bit, or 16-bit TPDF) at the source rate with compensated latency, progress, cancel and a measured report.
Branch / PR: feat/LAS-28-controls-ab-export → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: c43345d8c4e6369ece63817d1199fe5f14c08677
Material: docs/delivery/LAS-28/ on the delivery branch

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 controls, units, bypass, undo | EQ edit reaches chain and export (+6.00 dB); undo/redo; on/off per module; source unchanged | PASS | evidence/playwright-mastering-controls.txt |
| AC-02 A/B position, matching method | one source, timer continues; matching gains tested (6.0 dB) | PASS | README § A/B semantics |
| AC-03 export format and dither policy | rate/channels of source, 24-bit no dither or 16-bit TPDF, report | PASS | README § Export semantics |
| AC-04 workflow tests and audio inspection | 7 Playwright workflows; export = offline chain (≤ 0.5 LSB); ffprobe/FFmpeg inspection | PASS | evidence/export-inspection.json |

Commands/environment: npm run check exit 0 (ESLint 0, Vitest 192/192, build OK, Playwright 63/63, Chromium 141, Linux, Node 22.22); npm run scan:artifacts exit 0 (124 pieces, 0 findings); npm run characterize:chain exit 0; FFmpeg 6.1.1 / ffprobe for the independent inspection.
Manual QA: docs/delivery/LAS-28/manual-qa.md — QA-01 EQ editing and undo, QA-02 A/B with matching, QA-03 export inspection; Gennady execution NOT_RUN.
Limitations/blockers: master level/output trim and Space not implemented (labelled); snapshots last for the session only; matching re-renders the whole track (5.7 s per 2 min); preview runs at the device rate; provisional styling until LAS-44/45; no listening test (LAS-29); Mac/Chrome not run. Defects found and fixed: limiter 4× detection let true peaks read up to 0.23 dB over the ceiling on finer meters (now 8×); Undo hidden by editors; Escape after focus loss.
Disposition: READY_FOR_QA

No claim of manual sign-off, Jira closure or main merge is implied.
