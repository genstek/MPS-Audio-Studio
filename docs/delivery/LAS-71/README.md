# LAS-71 — Supported audio file size raised from 100 MiB to 250 MiB

Jira: [LAS-71](https://genstek69.atlassian.net/browse/LAS-71) · Sprint 10 package `docs/claude-code/2026-11-02/SPRINT-10.md` · Mode: IMPLEMENT

Branch `delivery/LAS-40-sprint-10` (from `delivery/LAS-40-all-sprints` @ `0296386`) · implementation commit `aa8251d` · tested application commit `TESTED_COMMIT`

Developer status: **READY_FOR_QA** (proposed) · Gennady manual QA: **NOT_RUN** · Jira: updated in this session (see [`jira-update.md`](jira-update.md))

## Convention
**250 MiB = 250 × 1024 × 1024 = 262,144,000 bytes, inclusive.** Gennady asked for "250 MB"; the studio has always shown binary units ("100 MiB"), so the limit keeps that convention and every message names MiB, with the exact byte count where there is room. One shared constant: `src/file-limits.js` (`MAX_AUDIO_FILE_BYTES`, `MAX_AUDIO_FILE_LABEL`, `audioFileSizeProblem()`).

## Where the limit applies (audit)
| Path | Before | Now | Check |
| --- | --- | --- | --- |
| Source WAV import and replacement (`audio-engine.js` `load`) | 100 MiB, message "smaller than 100 MiB" | 262,144,000 bytes inclusive; refused before the file is read | unit + browser |
| Stem WAVs (`audio-engine.js` `addStem`) | 100 MiB | same shared limit; dialog says "Each stem WAV up to 250 MiB" | unit + browser |
| Local reference WAV in Compare (`CompareDialog`) | **no size check** (gap) | shared limit before the header is read | browser |
| Reference WAV in References (`ReferencesDialog`) | **no size check** (gap) | shared limit | code review (same function) |
| Private library upload (server `library.js`, `config.js`, `app.js` body discard) | 100 MiB default (`MPS_MAX_UPLOAD_BYTES` override) | default = the shared constant; message "Files can be at most 250 MiB (262,144,000 bytes)." | server tests |
| Settings / preset / session JSON files | 1 MiB | **unchanged** — this is a per-audio-file limit, not a blanket payload increase | — |
| Apple wrapper (PR #43, branch `feat/LAS-58-apple-standalone`, inspected, **not merged**) | loads the same web app in WKWebView; its own Swift code has no size limit; its README still says "up to 100 MiB" | inherits the JS limit once rebased; its README and the iOS memory budget need checking under LAS-58 | not run (no macOS) |

Empty state now reads "WAV up to 250 MiB · Files stay on your device"; no "100 MiB" text remains in the app (browser-checked).

## Failure handling
- Too large: "This file is N MiB. WAV files can be at most 250 MiB (262,144,000 bytes); choose a smaller file." — before anything is read; the current track keeps playing.
- Read failure (moved file, browser out of memory while reading): actionable message, "Nothing was changed."
- Decode failure for lack of memory (`RangeError`/allocation): "There was not enough memory to decode this WAV. Close other tabs or choose a shorter file. Nothing was changed." Other decode failures keep the LAS-8 message.
- Format checks (`.wav`, RIFF/WAVE header), supersede/cancel of an earlier import and the LAS-8/LAS-12 lifecycle are unchanged. Files are never truncated.

## Measured on this machine (not a guarantee for other hardware)
`scripts/large-file-check.js` against the dev server, headless Chromium 153 (Chrome for Testing), Linux x86-64, 4 vCPU Xeon 2.8 GHz, 15.7 GiB RAM, no audio device. Evidence: [`evidence/large-file-check.json`](evidence/large-file-check.json).

| File | Import (choose → Ready) | Play start | Longest frame gap while playing + matching | Loudness matching (worker) | Export 24-bit (worker, with matching in parallel) | Peak browser memory (RSS, all processes) | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 126,000,044 bytes (120.2 MiB, 11:54 stereo 44.1 kHz 16-bit) | 1.5 s | 0.09 s | 17 ms | 46 s | 53 s | 3.8 GB | PASS |
| 262,144,000 bytes (exactly 250 MiB, 24:46) | 2.8 s | 0.09 s | 17 ms | 112 s | 123 s | **6.8 GB** | PASS |

**Resource constraint:** a 250 MiB file needs about 7 GB of browser memory on this machine while matching and exporting run (the source is held as 32-bit float per channel several times: playback buffer, worker decode, render output). Machines with 8 GB or less may hit the memory messages above. Stems are decoded per file, so several long stems add up; the limit is per file, not per session.

## Server oversize answer and LAS-59
- Declared `Content-Length` over the limit: clean **413** `{ error: 'too_large', message }` before the body is read (default configuration, 262,144,001 declared bytes, headers only).
- Streamed bodies over the limit: 413 (existing LAS-23 test, now at limit−2/limit/limit+1 with a 2 MiB test limit).
- **LAS-59 (macOS ECONNRESET on the streamed oversize test) is not reproduced or fixed here**: no macOS in this session. On Linux the existing assertion passes unchanged; LAS-59 stays open.

## Validation
| Check | Result | Evidence |
| --- | --- | --- |
| Gate at limit−1, limit, limit+1 bytes (track) and limit+1 (stem); oversized file never read or decoded | PASS | `tests/unit/audio-engine.test.js` (LAS-71 tests) |
| Message text and MiB/byte wording | PASS | same |
| Read and memory failures during replacement keep the previous track | PASS | same |
| Server: default 262,144,000 bytes in config and library; limit−2/limit accepted, limit+1 refused with message; declared 262,144,001 → clean 413 | PASS | `tests/server/upload-limit.test.js` |
| Real 262,144,000-byte WAV imports, decodes (1486.1 s) and plays in Chromium; 262,144,001 bytes refused with the message while the first keeps playing; retry with a small file works | PASS | `tests/e2e/upload-limit.spec.js` |
| Stem and Compare reference refusal at limit+1 | PASS | `tests/e2e/upload-limit.spec.js` |
| Large-file load/play/match/export and memory | PASS (measured) | `evidence/large-file-check.json` |
| Earlier tests (LAS-8 import lifecycle, LAS-23 storage, TC-001 wording updated to 250 MiB) | PASS | final check, `../sprints/10/README.md` |

Logs: [`evidence/`](evidence/) (`vitest-las71.log`, `playwright-las71.log`).

## Limitations
- Browser-only results. macOS/iOS wrapper (LAS-58) and Safari/Firefox: **not run**.
- Memory use at 250 MiB is high (above); no streaming decode exists.
- No contextual ⓘ help text existed for import before; LAS-70 adds the import/limit hint.
- Manual QA ([`manual-qa.md`](manual-qa.md)): **NOT_RUN**.
