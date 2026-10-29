# Gennady's manual QA handoff

Preparation status: no new application tests or listening executed, no implementation delivered by this package. All new manual results start NOT_RUN. Claude must provide a runnable candidate, exact SHA, setup/data and per-issue evidence before testing begins.

## Suggested execution sequence after development

1. Environment and smoke: confirm checkout/server SHA and URL, clean console; LAS-53 existing TC-001 and LAS-57 TC-002. Reuse completed LAS-55/56 only as historical evidence, not new runs.
2. Transport: valid/invalid/replacement WAV, real resume vs stop, both LAS-11 resume paths, LAS-12 unload from each state and same-file reimport. Confirm with audible recognizable segments and engine checks.
3. Responsive regression: original LAS-50/51 steps, empty/loaded/long-name/error states, breakpoint and height/width sweeps, 100/125/200% zoom, keyboard/focus and actual DPI/browser scope. Reconcile LAS-49's 24 cases; no whole-plan Pass from one screenshot.
4. Auth/privacy: registration/verification/login/logout/recovery/expiry/rate limits; two users; direct cross-user access; malformed/oversized uploads; deletion propagation and no-upload consent cancellation. Use disposable test accounts/data only.
5. DSP/export: compare controlled tones/impulses and music; 24 L/R/Link EQ bands/drag/Q/keyboard, compressor/limiter, bypass/undo, finite output, actual meters and processed 24-bit WAV independently reopened/analyzed.
6. References/presets: exact approved reference file/segment and source hash, reproducible profiles, matched-level original/processed/reference monitoring, constrained explainable recipe, preferences vs reference targets and full preset recall/migrations.
7. Stems: aligned start/pause/seek/stop, per-channel routing/solo/mute, latency compensation, combined/per-stem render and failure recovery.
8. Design/accessibility: approved brief/screens vs actual app, complete task walks, focus/keyboard/errors and responsive control mapping. Design choices and listening verdicts require Gennady's real review.
9. Research/prototypes: inspect go/no-go reports, reproduce feasible measurements, distinguish unavailable hardware/data checks from failures and from completed product support.

## Record per run

| Field | Value to fill |
| --- | --- |
| Jira feature / Test Case / Test Execution | Actual keys |
| Build and branch | Full candidate commit and PR |
| OS / browser / device / audio output | Exact executed environment |
| Viewport / zoom / DPR | Actual CSS viewport and setup |
| Test data | Synthetic fixture/version or authorized source hash |
| Preconditions / steps / expected | Per-issue manual script |
| Actual result | NOT_RUN until executed, then observed behavior |
| Outcome | PASS / FAIL / BLOCKED / NOT_RUN / NOT_APPLICABLE |
| Evidence | File/trace/report/link with commit |
| Bug | Separate bug key with reproducible steps and expected/actual |

Developer automated results and human manual results remain separate. A louder master is not automatically better; use the same segment at matched perceived loudness and record gain. A green UI test is not proof of correct audio or secure authorization.
