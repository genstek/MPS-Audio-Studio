# LAS-23 acceptance trace

Tested commit `d8292b3fb15665374c1d2770267196afd8856cfb`. Developer results; manual QA NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-23-AC-01 | User B cannot list, read, modify, delete or process A's assets by guessing IDs or reusing endpoints | 12-operation cross-user test (API) + Playwright second account | PASS | `evidence/npm-run-check-d8292b3fb15665374c1d2770267196afd8856cfb.log`, HTML report |
| LAS-23-AC-02 | Anonymous requests and stale/expired links rejected | anonymous 401 on every endpoint incl. a valid link; expired/altered/moved links 403 | PASS | same |
| LAS-23-AC-03 | Invalid, disguised, oversized, malformed audio rejected; parsing time/memory limits and isolation documented | 13 malformed files → 422; 413 declared and streamed; header-only parser with 64-chunk cap; job time limit and cancellation | PASS (isolation = bounded in-process, documented) | same, README "Limits" |
| LAS-23-AC-04 | App-generated storage paths; secrets not in client bundles; valid uploads still work | random blob names, name sanitisation test, PCM/extensible/float uploads; bundle scan in LAS-25 | PASS (bundle scan evidence in LAS-25) | same |
