**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Security validation — LAS-25

Two-account authorization matrix (20 operations × anonymous / idle-expired / signed-out / other / owner) passes; observed statuses in docs/delivery/LAS-25/evidence/authorization-matrix-observed.md. Artifact/bundle/log scanner (npm run scan:artifacts) found 0 secrets in 113 pieces on the tested commit; a negative control with planted secrets fails as expected. npm audit (runtime and all) 0 vulnerabilities; server has no runtime dependencies.
Fixed while validating: F-01 registration timing revealed existing accounts (~7 ms vs ~70 ms) — now hashes on every path; F-02 email tokens moved from query string to URL fragment (no server/proxy logs, no report leakage); flaky cancel test made deterministic.
Open release gates: HTTPS + Secure cookie, CSP/HSTS, dev endpoints off, real mail, shared rate limits for multiple processes, backups. Accepted limits: in-memory limits, targeted 15-min lock, in-process analysis, experimental node:sqlite.
Branch / PR: test/LAS-25-security-baseline → delivery/LAS-40-all-sprints. Tested SHA d2d415d873d5efe626e39041fa4c200366136dbc: npm run check exit 0 (Vitest 84/84, Playwright 47/47).
Manual QA: NOT_RUN. Disposition: READY_FOR_QA (technical validation only; no zero-risk claim).
