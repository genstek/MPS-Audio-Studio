# LAS-24 acceptance trace

Tested commit `8cf70845db887661cf7aaed40f8f600fc67788ba`. Developer results; manual QA NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-24-AC-01 | Project deletion removes access to originals, references, stems, previews, exports; cancels jobs | Vitest project purge with gated job | PASS | `evidence/npm-run-check-8cf70845db887661cf7aaed40f8f600fc67788ba.log` |
| LAS-24-AC-02 | Account deletion follows a documented purge schedule incl. backup expiry and stated exception | Vitest + Playwright; schedule in README and privacy policy | PASS | same |
| LAS-24-AC-03 | No external processing without opt-in; cancel before upload sends no audio | Vitest consent rule; Playwright request recording (Cancel → 0 requests, 0 received) | PASS (local stand-in only) | same, HTML report |
| LAS-24-AC-04 | Messages state location and retention; audit has no audio, credentials or reusable secret URLs | screenshots; Vitest audit contents | PASS | `evidence/screenshots/` |
