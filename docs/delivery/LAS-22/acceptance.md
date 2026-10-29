# LAS-22 acceptance trace

Tested commit `dd277058b443fba083d93ea029982e2008bf6456`. Developer results; manual QA NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-22-AC-01 | Valid recovery resets; expired and used tokens fail safely | Vitest reset/lifecycle/short-password tests; Playwright reset + used/forged links | PASS | `evidence/npm-run-check-dd277058b443fba083d93ea029982e2008bf6456.log`, HTML report |
| LAS-22-AC-02 | Previous sessions follow the revocation policy; clear next steps | all sessions deleted (two devices); "signed out everywhere else"; "Your session has ended" on the other device | PASS | same |
| LAS-22-AC-03 | Repeated login/recovery limited without disclosing credentials or existence | per-address limits identical for unknown addresses; same recovery answer; 429 + Retry-After | PASS | same |
| LAS-22-AC-04 | Automated checks for expiry, invalid tokens, retry limits, protected access after session loss | idle 24 h and 7-day tests with clock; token tests; limit tests; `/api/account` 401 after reset | PASS | same |
