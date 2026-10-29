# LAS-12 acceptance trace

Tested commit `4e8a9038bb1393eeb1c6b4c1addb459b209a49d7`. Developer results only; manual results are NOT_RUN in `manual-qa.md`.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-12-AC-01 | Clearly named accessible action removes the track | "Remove track" button (role button, same visible and accessible name); Playwright clicks it by role | PASS | `evidence/npm-run-check-4e8a9038bb1393eeb1c6b4c1addb459b209a49d7.log`, screenshots |
| LAS-12-AC-02 | Works while playing, paused or stopped; audio stops and does not resume | Playwright three states: probe playing 0 / connected 0, no new start after 300 ms; Vitest unload while playing | PASS (engine state, not listened) | same |
| LAS-12-AC-03 | Name/duration cleared, position reset, empty state with Import WAV | Playwright empty-state assertions incl. timer 00:00.0 / 00:00.0 | PASS | same |
| LAS-12-AC-04 | Play/Pause/Stop cannot start playback when empty | all disabled; Vitest `play()` resolves false after unload | PASS | same |
| LAS-12-AC-05 | Import another or the same WAV and play normally | same file from disk twice, then a different stereo file; start offset 0; context running again | PASS | same |
| LAS-12-AC-06 | Original file untouched; resources released | SHA-256 of the file on disk equal before/after; buffer dropped, source disconnected, context suspended | PASS (GC not measured) | same |
| LAS-12-AC-07 | Deterministic cleanup checks + Playwright for playing/paused/stopped, empty state, reimport; not UI-only | 2 Vitest + 3 Playwright tests with probe; mutation check | PASS | same, `evidence/mutation/` |
| LAS-12-QA-02 (dev) | Removal during an in-flight replacement | held decode, Remove, release: session stays empty | PASS | same |
