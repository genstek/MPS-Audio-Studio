# LAS-21 acceptance trace

Tested commit `ac9ab7c7a1fdfe0165b9e7e171445ae0788a2245`. Developer results; manual QA NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-21-AC-01 | Register and verify with a development mail setup | Vitest flow + Playwright flow via dev outbox link | PASS | `evidence/npm-run-check-ac9ab7c7a1fdfe0165b9e7e171445ae0788a2245.log`, HTML report, screenshots |
| LAS-21-AC-02 | Valid login opens the permitted view; invalid/unverified handled by policy | Vitest + Playwright: generic 401, 403 unverified after correct password, resend offered | PASS | same |
| LAS-21-AC-03 | Logout invalidates the session; protected endpoints reject later requests | session row deleted; `/api/account` 401 for page and for replayed cookie | PASS | same |
| LAS-21-AC-04 | Playwright covers core success/failure; no passwords/session secrets in traces, logs, fixtures | 3 Playwright tests with traces off; random throwaway passwords; Vitest checks DB and logs; report scan 0 passwords, 0 token values | PASS | same |
| ADR-003 | Guest/local playback without server | Playwright with `/api` aborted; LAS-20 local-only test unchanged | PASS | same |
