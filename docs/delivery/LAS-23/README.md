# LAS-23 — Private audio storage, ownership checks and safe uploads

Jira: [LAS-23](https://genstek69.atlassian.net/browse/LAS-23) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-23.md` · Mode: IMPLEMENT · Prerequisites LAS-21, LAS-20

Branch `feat/LAS-23-private-storage` · tested application commit `d8292b3fb15665374c1d2770267196afd8856cfb`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What was built
**Server** (schema v2 in `server/db.js`; `server/library.js`; `server/wav.js`):
- **Ownership at the data layer.** Projects, assets and jobs each store `owner_id`; every read, change, delete, download and job query includes `AND owner_id = ?` for the signed-in user. Another user's id gets the same `404` as an id that does not exist. IDs are 128-bit random, but access never depends on guessing being hard.
- **Uploads** (`POST /api/projects/:id/assets?kind=&name=`, raw body): streamed to `tmp/` with a hard byte limit (100 MiB, `MPS_MAX_UPLOAD_BYTES`); declared or streamed over-limit bodies get `413`. The file is then checked by a **bounded RIFF/WAVE inspector**: headers only, at most 64 chunks, so time and memory do not depend on file size; it accepts PCM 8/16/24/32-bit and float 32/64-bit (incl. WAVE_FORMAT_EXTENSIBLE), 1–8 channels, 8–192 kHz, consistent fmt fields, whole frames, non-empty audio; anything else gets `422` with a clear reason and the temporary file is deleted.
- **Storage paths** are random names in `blobs/` (mode 0600). User file names are display text only: folders and control characters removed, 200 characters maximum.
- **Downloads**: `POST /api/assets/:id/download-link` returns a link signed with HMAC-SHA256 (server secret) over asset, owner and expiry (5 minutes). `GET /api/download/:id` needs that signature **and** the owner's session; no public or shared links exist.
- **Processing**: `POST /api/assets/:id/jobs {kind: "levels"}` runs a real streaming analysis of the stored file (per-channel peak and RMS in dBFS; RMS relative to full-scale square, so a full-scale sine reads −3.01 dB), after the response, with a 60 s time limit and cancellation (`DELETE /api/jobs/:id`).
- **Secrets stay server-side**: the client bundle contains only `fetch('/api/...')` calls; the server secret never leaves `MPS_DATA_DIR` (bundle scan in LAS-25).

**Studio** (`src/LibraryPanel.jsx`): a "Private library" section in the signed-in Account dialog. Nothing is uploaded until the user presses **Save “name” to my library**; the text says where the copy goes and that it stays until deleted. Saved files list with duration and size, **Download** (signed link) and two-step **Delete**. Any 401 shows "Your session has ended. Sign in again." — never a false "Saved".

## Defects found and fixed during this slice
1. **Analysis read `blockAlign` from stored metadata that did not include it** → results were `null`. Caught by the deterministic level test (expected −30.31 / −33.32 dBFS); fixed before the first commit.
2. **Refused uploads lost their answer behind a proxy** (Major for the UI): the server answered 401 before reading the body and the connection closed while Vite's proxy was still sending → EPIPE → the browser saw 500 ("library unavailable") instead of "session ended". Found by the full suite on `e1224001` (`evidence/npm-run-check-e1224001-before-proxy-fix.log`); reproduced in Vitest through a pass-through proxy (502 instead of 401/404); fixed in `d8292b3fb15665374c1d2770267196afd8856cfb` by reading and discarding unread bodies (up to the upload limit) before error answers. The library browser tests then passed 15/15 (`evidence/library-repeat-5x.log`).
3. During development one `ERR_HTTP_HEADERS_SENT` appeared once and could not be reproduced (6 later runs); handlers now end a response that fails after streaming started instead of answering twice, and every storage test asserts that no request ended in a server error.

## Tests
Vitest `tests/server/storage.test.js` (23): owner flow incl. byte-identical download and blob removal; extensible 24-bit and float uploads; **another user gets 404 for all 12 operations** with the owner's ids and links and nothing changes; anonymous 401 everywhere incl. valid links; links expire (5 min), cannot be altered or moved to another asset; **13 malformed files** (text, MP3, too short, chunk overflow, data before fmt, >64 chunks, ADPCM, 0 channels, 4 kHz, block-align mismatch, 12-bit, partial frame, empty) → 422 with no files left; over-limit uploads (declared and streamed) → 413; path/control-character names; level analysis; cancellation and time limit; refused uploads through a proxy.
Playwright `tests/e2e/library.spec.js` (3): save → download unchanged (SHA-256) → delete; second account sees nothing and gets 404 for the first account's ids; save after the session ended shows the session message.

## Limits
Development server: local disk, no encryption at rest, no antivirus, no quotas per user beyond the per-file limit; the analysis job runs in the server process (bounded by streaming, time limit and cancellation, not by a separate sandbox). Over-limit uploads close the connection, so through a proxy the browser may see a generic error (the studio itself refuses files over 100 MiB before upload). Linux Chromium 141.
