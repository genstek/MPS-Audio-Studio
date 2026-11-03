# LAS-24 — Project/account deletion and explicit external-processing consent

Jira: [LAS-24](https://genstek69.atlassian.net/browse/LAS-24) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-24.md` · Mode: IMPLEMENT · Prerequisite LAS-23

Branch `feat/LAS-24-deletion-consent` · tested application commit `8cf70845db887661cf7aaed40f8f600fc67788ba`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Deletion (follows `docs/PRIVACY_AND_THREAT_MODEL.md`)
- **File / project**: deleting a project removes every file in it — source, reference, stem, preview and export copies — from disk and database, cancels its queued or running jobs (audited as `job_cancelled`), and invalidates download links (404). Other projects are untouched.
- **Account** (`DELETE /api/account`, password required; wrong passwords count toward the sign-in lock): immediately deletes sessions, tokens, projects, files on disk, jobs, consents, transmission records and the account's development mail, then clears the cookie. Purge schedule: **immediate** for everything the studio stores; the audit trail keeps only a keyed hash of the old user id for 90 days (the one stated retention exception); development has no backups — production backups would expire within 30 days and are not erased immediately (policy). The address can register again as a new, empty account.

## Consent for external processing
- Consent is per account **and per recipient** (`consents` table, schema v3). `POST /api/assets/:id/external-jobs` is refused with 403 "Allow … first. Nothing was sent." without it; consent can be withdrawn at any time; another user's consent never reaches your files (404).
- **No external service exists.** With no recipient configured (the default), nothing can be consented to or sent. For tests, `MPS_TEST_RECIPIENT=1` adds a **local test stand-in** that records what it "receives" (bytes and SHA-256) in a table on the same computer instead of sending anything over the network.
- **Studio**: a "Send…" button per saved file appears only when the server offers a recipient. It opens a question naming the recipient, where it is, how long it keeps the file and why, with **Allow and send** or **Cancel**. Cancel sends nothing (proved by request recording in Playwright). Allowed services are listed with **Withdraw**.
- **Audit events** contain an event name, a 16-hex keyed user hash, an item id (file, project, job or recipient id) and a time — never audio, emails, passwords, tokens or download links (Vitest checks the table after a full flow).

## User-facing statements (AC-04)
Library: "Saving uploads a copy … on the studio server. Only you can open it, and it stays until you delete it. Nothing else is uploaded." Consent: recipient, location, retention, purpose, "Cancel sends nothing". Delete account: "Deletes your account, private library and every saved file from the studio server right away. Files on your computer are not touched." Screenshots in `evidence/screenshots/`.

## Tests
| Test | Kind | Covers |
| --- | --- | --- |
| deleting a project removes every kind of file, cancels its jobs and leaves other projects alone | Vitest (job gate) | AC-01 |
| deleting the account needs the password, then removes everything it owns at once | Vitest | AC-02 |
| nothing is sent without consent for that recipient; consent can be withdrawn | Vitest | AC-03 |
| with no external service configured nothing can be consented to or sent | Vitest | AC-03 default |
| audit events hold no audio, credentials, emails or reusable links | Vitest | AC-04 |
| LAS-24: Cancel sends nothing; Allow sends once to the named recipient; permission can be withdrawn | Playwright + request recording | AC-03/04 |
| LAS-24: deleting the account needs the password and removes the library | Playwright | AC-02 |

Found and fixed while testing: the development transmissions endpoint first listed every account's records, so parallel test runs saw each other's sends; it now filters by account. A style rule stretched the consent buttons into a tall column; scoped and re-rendered.

## Limits
No real external recipient, so real network transfer and third-party retention cannot be tested; the stand-in only proves the consent gate. Account deletion runs synchronously in the request. Linux Chromium 141.
