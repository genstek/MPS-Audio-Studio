# LAS-48 — Responsive studio workspace: coverage gaps

Jira: [LAS-48](https://genstek69.atlassian.net/browse/LAS-48) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-48.md` · Mode: VERIFY_AND_CLOSE_COVERAGE_GAPS

Branch `test/LAS-48-coverage-gaps` · tested application commit `8d7d6c849c1564d3c4918d8c470d034a7e8c5992`

Developer status: **READY_FOR_QA** for the current shell · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Starting point (kept)
The accepted PR #8 layout (LAS-50/51, Done, closed on main 364d863) stays unchanged: desktop range width ≥ 761 and height ≥ 450 with all essential controls visible before scrolling; at ≤ 760 px the layout stacks and the page scrolls deliberately. No layout CSS was changed for LAS-48. The later transport additions (LAS-9 time read-out, LAS-11 pressed Pause, LAS-12 Remove track) pass the unchanged LAS-51 geometry suite.

**LAS-44 dependency:** the native "LAS-44 blocks LAS-48" link is stale for this work. LAS-48's own description says LAS-44/45 are later design coordination and must not block the urgent existing-layout fix. This delivery verifies the current layout only; the final redesign stays subject to LAS-44 approval. The Jira link itself was not changed (no Jira access).

## Coverage added (`tests/e2e/LAS48-coverage.spec.js`, helper `tests/e2e/helpers/layout.js`)
| Test | Source cases | What it checks |
| --- | --- | --- |
| proposed QA matrix, empty / WAV-loaded | TC-001..004, 007; AC-02, AC-07 | 1920×1080 → 1440×900 → 1280×720 → 1024×768 → 768×1024 → 390×844 and back on one page; no sideways scroll; no page scroll at desktop sizes; every essential control fully visible and not covered (scrolled into view only at stacked/short sizes); button labels not cut off. Loaded state uses WAV-A as specified (90 s stereo 48 kHz synthetic). |
| zoom-equivalent 125% / 200% | TC-010, TC-021 (emulated); AC-04, AC-06 partly | CSS viewports produced by 125%/200% zoom in 1280×720, 1440×900, 1920×1080 windows, with DPR 1.25 / 2. **Emulation, not real browser zoom.** |
| playback, paused position and stop survive resizing | TC-012..014; AC-05 | while Playing across six sizes the time keeps advancing and the one source is never restarted; while Paused the position does not change and Play resumes from it; Stopped stays at 00:00.0 with Play enabled / Pause disabled; track identity kept |
| keyboard focus stays visible across resizes | TC-011; AC-04 | focused Stop keeps focus, `:focus-visible` and a solid outline at 1280×720, 761×450, 760×520, 390×844, 1440×900, then Enter works |

Negative control: a temporary CSS rule making strip buttons 15 rem wide made the matrix test fail at 768×1024 ("Input button fully visible", ratio 0.877) — `evidence/negative-control/`. Reverted, never committed.

**TC-023 evidence:** fresh TC-001 traces at 1280×720 and 1440×900 on this commit (`evidence/tc001-traces/`, open with `npx playwright show-trace <zip>`). TC-001's assertions are unchanged. Inspecting the snapshots in UI Mode/Trace Viewer and separating viewer scroll behaviour from app layout is Gennady's manual step.

## Not covered / blocked here
| Item | Status | Reason |
| --- | --- | --- |
| Real browser zoom 125/200 %, maximize/restore, moving between displays (TC-005, TC-010 real, TC-022) | NOT_RUN | Manual on a real Mac; no display hardware here |
| Firefox, WebKit, Safari (TC-024) | BLOCKED | Only Chromium 141 is installed in this container; browser downloads are blocked |
| Waveform, EQ graph, meters, faders/pan pointer mapping (TC-016..020, AC-06) | BLOCKED | Those controls do not exist yet (LAS-28/LAS-34 scope) |
| Many tracks / bounded track area (TC-008, AC-03) | BLOCKED | Single-track product; multitrack is LAS-34/35 |
| Gain/pan/mute/solo/EQ persistence (TC-015) | BLOCKED | Controls not implemented |
| Listening during resize | NOT_RUN | Automated position checks do not prove absence of audible glitches |
