# LAS-25 acceptance trace

Tested commit `d2d415d873d5efe626e39041fa4c200366136dbc`. Developer results; manual QA NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-25-AC-01 | Traceable matrix: anonymous, owner, other-user, expired session for each operation | 20 operations × 5 callers incl. idle-expired and signed-out | PASS | `evidence/authorization-matrix-observed.md` |
| LAS-25-AC-02 | Tests reproduce blocked cross-user access, logout/recovery, upload rejection, deletion/consent | server suites (84 Vitest) + Playwright account/library/privacy (47 E2E total) | PASS | `evidence/npm-run-check-d2d415d873d5efe626e39041fa4c200366136dbc.log`, HTML report |
| LAS-25-AC-03 | Client bundles, logs and sanitized test evidence inspected for secrets | artifact scanner: 113 pieces, 0 findings; negative control caught planted secrets | PASS | `evidence/scan-artifacts-d2d415d873d5efe626e39041fa4c200366136dbc.json`, `evidence/scanner-negative-control/` |
| LAS-25-AC-04 | Findings with severity and reproduction; release gates and accepted limits, no zero-risk claim | findings F-01…F-12, release gates | PASS | `README.md` |
