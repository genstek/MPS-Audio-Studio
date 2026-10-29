**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Architecture decision — LAS-19

Proposed ADR-003 (docs/ADR-003-accounts-and-private-storage.md): self-hosted Node.js server with only the standard library (node:http, node:crypto, node:sqlite) behind Vite's /api proxy; scrypt passwords; HttpOnly SameSite=Lax session cookie with hashed tokens, 24 h idle / 7 day absolute expiry, revocation on logout/reset/deletion; custom-header + Origin CSRF rule, no CORS; development mail outbox; hashed single-use verification (24 h) and reset (30 min) tokens; per-email/IP rate limits; owner-filtered queries; signed 5-minute download links that also need the owner session. Hosted providers rejected for now (credentials, cost, network in tests).
Flow diagram and endpoint × caller matrix: docs/delivery/LAS-19/README.md. Guest/local playback unchanged.
Branch / PR: docs/LAS-19-auth-architecture → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md).
External setup blockers for production: hosting with HTTPS, mail provider credentials, backups.
Disposition: decision READY_FOR_QA (Gennady's approval pending; status "proposed").
