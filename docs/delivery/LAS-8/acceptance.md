# LAS-8 acceptance trace

Tested commit `2325073ba12b29e2e4de00f6e36dcb17da5bfcda`. Developer results only; manual results are NOT_RUN in `manual-qa.md`.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-8-AC-01 | Valid WAV selected and shown in a named track | TC-002, playback.spec | PASS | `evidence/npm-run-check-2325073ba12b29e2e4de00f6e36dcb17da5bfcda.log` |
| LAS-8-AC-02 | Duration/status from decoded audio | stereo 48 kHz test shows 1.5 s, 2 channels, context rate; TC-002 shows 3.0 s, 1 channel | PASS | same, HTML report |
| LAS-8-AC-03 | Invalid/unsupported files give a clear recoverable error | TC-003 (extension, empty, text), header unit test, 100 MiB boundary unit test, failed first import | PASS | same |
| LAS-8-AC-04 | Reimport/retry without duplicate dangling nodes | probe counts after reimport, failed replacement and retry; unit replacement test; overlapping and dispose tests | PASS (engine-level count, not sound measurement) | same, `evidence/mutation/` |
| LAS-8-AC-05 | Small committed synthetic fixtures | `tests/fixtures/wav.js` generates tones in memory; no audio files committed | PASS | source |
| LAS-8-AC-06 | Manual test steps and evidence in PR | `manual-qa.md`, this folder, PR | PASS (prepared; execution NOT_RUN) | this folder |
| Scope | Large-file performance without UI freeze | not measured | NOT_RUN | — |
