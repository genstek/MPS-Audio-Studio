# LAS-20 — Privacy rules, data lifecycle and threat model

Jira: [LAS-20](https://genstek69.atlassian.net/browse/LAS-20) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-20.md` · Mode: ARCHITECTURE

Branch `docs/LAS-20-privacy-threat-model` · tested commit `11a30581b26b5abcebda3ac597a87c859830b3eb` · Policy: [`docs/PRIVACY_AND_THREAT_MODEL.md`](../../PRIVACY_AND_THREAT_MODEL.md) (status **proposed**, awaiting Gennady's review)

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Deliverables
- **Data-flow inventory** of every storage location (browser memory, device file, SQLite tables, blobs, temp files, logs, audit, outbox, server secret, test artifacts, backups), who can read it and whether it leaves the device or server.
- **Trust boundaries** browser↔device, browser↔server, server↔storage, server↔external services.
- **Retention and deletion** per item, including deletion propagation for files, projects and accounts, and an honest backup rule (production backups expire within 30 days; deleted data is not erased from existing backups immediately).
- **Consent rule**: recipient-specific opt-in shown with location and retention; Cancel sends nothing; server refuses external jobs without consent. No external recipient is configured.
- **Threat model** for account takeover, CSRF, cross-user ID guessing, shared links, malicious audio, resource exhaustion, secrets in logs/artifacts/bundle, backups, unconsented processing and supply chain — each with a control and a test owner (implemented in LAS-21–LAS-25).
- **Verifiable local-only mode:** `tests/e2e/local-only.spec.js` records every request during import → play → pause → stop → remove and fails on any non-GET request, request body or other origin. A negative control that adds an upload-like POST in the import path makes it fail (`evidence/negative-control/`).

## Defect found while writing the local-only test
A valid 5-second mono WAV was rejected as "not a valid WAV" — a pre-existing LAS-8 defect (RIFF size bytes decoded as UTF-8; ~9.3 % of file sizes). It was fixed and recorded under LAS-8 (PR #20) before this test was committed.

## Limits
Analysis, preview and export do not exist yet, so the local-only test covers import → play → pause → stop → remove; LAS-26+ must extend it. The policy is a development policy, not a legal notice. Linux Chromium 141 only.
