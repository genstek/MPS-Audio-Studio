# LAS-172 — Save Track Analysis report (PDF / JSON)

**What:** "Save report…" beside "Analyze again" in the Track analysis dialog. Choose PDF or JSON.
The report is built from the result object already on screen. Nothing is measured again, no audio
is read, nothing is uploaded. The analyzer's DSP is unchanged.

- `src/analysis-display.js` — the rounded rows shown in the dialog, shared with the PDF so both match.
- `src/analysis-report.js` — JSON (`mps-track-analysis/v1`), a text-only PDF 1.4 writer (no dependency), file names, saving.
- `src/AnalysisDialog.jsx` — button, format choice, status. Save is offered only for a finished run of the current file; the saved-state is keyed to that file and run, so it resets on re-analysis, cancel, error or track replacement.
- `vite.config.js` — injects the build's `package.json` version as `__APP_VERSION__`.

## Behaviour and limits

- **Chromium (Chrome/Edge, macOS):** native save dialog (`showSaveFilePicker`). "Report saved as …" appears only after the write closed. Cancel shows "Save cancelled"; a write error shows an alert. The dialog asks before replacing a file.
- **Safari/Firefox (no picker):** a browser download. The page cannot know when or where it lands, so the status says "download started", never "saved". The browser chooses the folder and avoids silent overwrites by renaming.
- **iOS:** not a supported target here; no share sheet was added.
- **PDF text** is limited to Latin-1: the minus sign prints as "-", characters beyond Latin-1 in a file name print as "?". The JSON keeps exact text.
- **Absent measurements** are `null` (silence, too short, no 3 s window, mono stereo fields, non-finite values). A mono file has `"stereo": null`; a file under 8,192 samples has `spectrum.available: false`.
- The report holds the base file name, SHA-256 and size, never a path or audio. Bit depth is the decoded WAV header value.
- The "possible displayed sample-rate mismatch" (item 11) was **not reproduced**: the report uses `input.sampleRate` from the WAV decoder, and tests cover 44.1/48/96 kHz with misleading file names.

## Commands run

`npm run lint`, `npm run test:unit` (398 tests), `npm run build`, `CI=true npx playwright test tests/e2e/analysis-report.spec.js tests/e2e/analysis.spec.js` (Playwright's bundled Chromium on Linux).

## macOS Ventura 13 (Intel) local smoke steps — not run in CI

1. `npm ci && npm run dev`, open the app in Chrome.
2. Import a WAV, press **Analyze**, wait for "Analysis complete."
3. Press **Save report…** → **Save as PDF**. In the macOS save sheet check the name `<track>_analysis_<UTC time>.pdf`, save, expect "Report saved as …". Open it in Preview: sections for Track, Analysis, Decoded media, Loudness, Stereo and the octave-band table; no clipped text; values equal the dialog.
4. Repeat with **Save as JSON**; open it in a text editor and compare `loudness.integratedLufs` etc. with the dialog.
5. Save again with the same name: the sheet must ask before replacing. Cancel it: expect "Save cancelled", no success text.
6. Run `shasum -a 256` on the WAV: it equals the report's `source.sha256` and is unchanged.
7. In Safari repeat steps 3–4: expect "download started" and a file in Downloads.
8. Press **Analyze again**, then **Remove track** / import another file: the report option must be gone until a new analysis completes.
