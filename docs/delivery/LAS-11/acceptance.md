# LAS-11 acceptance trace

Tested commit `760dc13b749ded8f5344d1e98dd9e09bb7fd3c9e`. Developer results only; manual results are NOT_RUN in `manual-qa.md`.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-11-AC-01 | While playing, Pause pauses and keeps the position | Playwright: Paused, timer frozen value used as reference | PASS | `evidence/npm-run-check-760dc13b749ded8f5344d1e98dd9e09bb7fd3c9e.log` |
| LAS-11-AC-02 | While paused, Pause again resumes from that position | Playwright: new source offset within 0.051 s of the paused display | PASS (engine offset, not listened) | same, HTML report |
| LAS-11-AC-03 | While paused, Play also resumes | same check through Play | PASS (engine offset) | same |
| LAS-11-AC-04 | Stop resets; next Play from the beginning | Playwright: 00:00.0, next start offset 0; LAS-9 test too | PASS | same |
| LAS-11-AC-05 | UI reflects the real state; toggling never overlaps playback | aria-pressed and status checks; probe "most playing at once" = 1; Vitest pending-start guard and cancellation with mutation checks | PASS | same, `evidence/mutation-*` |
| LAS-11-AC-06 | Regression coverage for both resume paths and Stop | 3 Vitest + 2 Playwright tests in `npm run check` (Vitest 14/14, Playwright 23/23) | PASS | same |
