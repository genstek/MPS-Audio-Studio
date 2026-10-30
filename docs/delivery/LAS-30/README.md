# LAS-30 — Import reference audio and save versioned sound profiles

Jira: [LAS-30](https://genstek69.atlassian.net/browse/LAS-30) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-30.md` · Mode: IMPLEMENT · Prerequisites: LAS-26 (analysis), LAS-23 (private storage) — both READY_FOR_QA

Branch `feat/LAS-30-reference-profiles` · tested application commit `ad800eaef0c53355c2c75b00241fa5d4abf85db4`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What the user gets
**References** (masthead) opens *Reference profiles*:
1. **Choose reference WAV.** The duration, sample rate and channels are read from the header.
2. **Start/End** of the segment (at least 5 s, inside the file), plus **Name**, **Style or artist** (a label such as "Enigma") and **Source version** (e.g. "1990 album", "2003 remaster").
3. **Measure segment.** The LAS-26 analysis runs in a worker on this device and shows integrated loudness, loudness range, true peak, crest factor, correlation and tonal balance (low/mid/high share of energy).
4. **Save to my references** (signed in). The reference WAV goes to the private library as a `reference` asset in a "References" project, and its profile is stored with it. If the profile is refused, the uploaded file is deleted again, so no orphan is left.
5. **My saved references** are grouped by style. **Reanalyse** downloads the stored file, measures the same segment again and compares (tolerance 0.01 dB; any difference is listed). **Delete** removes the profile.

The dialog says plainly that a profile is a set of measurements and that **nothing is trained or learned** from it. Enigma, Modern Talking or Deep Purple are just labels the owner types; there are no pre-measured presets.

## What a profile records
- **Source identity:** the reference asset, its SHA-256 (checked on the server against the hash computed at upload), file name, sample rate, channels, bit depth, duration.
- **Segment:** start and end in seconds, plus its frame count.
- **Labels:** name, style, source version. Profiles with different files, versions or styles stay separate entries.
- **Measurements:** the full analysis report of the segment (`mps-analysis-1`: loudness, peaks, levels, clipping, stereo, octave spectrum), plus `measurements`, the unit and definition of every field (for example "LUFS: ITU-R BS.1770-4 integrated loudness, EBU R128 gating…").

## Server rules (`server/references.js`, schema v4)
- Every query is filtered by the signed-in owner. Someone else's profile or reference asset gets the same 404 as a missing one; signed out gets 401.
- A profile is accepted only if all of these hold:
  - the asset is the caller's and of kind `reference`;
  - `profile.input.sha256` equals the stored file's hash;
  - the segment lies inside the file and is at least 5 s;
  - the measured segment equals the declared one (within one sample);
  - the analysis version is the supported one;
  - the loudness state is `ok`. A silent segment is refused with "This segment is silent; choose one with music."
- Deleting a profile, the reference file, its project or the account removes the profiles: `ON DELETE CASCADE`, tested down to the database rows. The original reference file follows the LAS-23/24 storage, consent and deletion policy unchanged.
- Measurements are computed on the owner's device from the same file the server stores, proven by the checksum. The server does not re-measure, so a modified client could store wrong numbers, but only in its own private profiles.

## Reproducibility
The analysis is deterministic. Measuring the same file and segment twice gives identical numbers, shown by a server test and by **Reanalyse** in the browser test ("Reproducible: the same measurements."). The tolerance used for the comparison is 0.01 dB on loudness, LRA, true peak and crest factor, and 0.0001 on spectrum shares.

## Validation (developer evidence)
| Check | Result |
| --- | --- |
| 13 server tests: profile contents and definitions; separate versions and styles; refusals (other file, outside segment, < 5 s, other segment, other analysis version); silent segment; reference-only; two-user isolation (list, read, delete, use of the other's asset, signed out); deletion cascades (profile, asset, account → 0 rows); reproducibility; schema v3 → v4 upgrade of an existing database | PASS |
| 4 browser workflows: measure → save → grouped list → reanalyse (reproducible) → delete; signed out measures and is asked to sign in; short/outside/silent segments refused; a second account sees nothing | PASS |
| `npm run check` on the tested commit: ESLint 0, Vitest 221/221 (14 files), build, Playwright 67/67; artifact scan 125 pieces, 0 findings | PASS |

## Changed files
`server/db.js` (migration v4, exported migrations), `server/references.js`, `server/app.js`; `src/ReferencesDialog.jsx`, `src/reference-profiles.js`, `src/dsp/analysis.js` (`MEASUREMENTS`), `src/dsp/analysis.worker.js` and `src/analysis-client.js` (segment), `src/dsp/wav-decode.js` (`readWavHeader`), `src/main.jsx`, `src/styles.css`; `tests/server/references.test.js`, `tests/e2e/references.spec.js`.

## Limitations
- WAV references only (PCM/float, mono/stereo), at most 100 MiB, like the rest of the studio.
- A reference must be uploaded to be saved, so saving needs an account and the server. Measuring alone works without either.
- The profile is not used for anything yet. The level-matched comparison is LAS-31, proposals LAS-32.
- Styling is provisional; the LAS-43 wireframes have a References screen that is not yet approved.
- Linux Chromium only; not run on Mac/Chrome.
