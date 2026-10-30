# LAS-29 manual QA for Gennady

Actual results stay **Not Run** until you test or listen.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-29-QA-01 | On your Mac: `npm ci`, then `npm run dsp:regression -- --out ./dsp-regression` (add `--ffmpeg` if FFmpeg is installed). Open `dsp-regression/dsp-regression.md`. Then `npx vitest run tests/unit/dsp-regression.test.js`. | "Findings: none. Golden differences: none." for all 96 renders (12 fixtures × 4 presets × 44.1/48 kHz). With FFmpeg: Result PASS. The test file passes, including the negative tests (broken renders are caught). A golden difference on your Mac would be a platform difference to report, not to accept silently. | Not Run | NOT_RUN |
| LAS-29-QA-02 | Follow `listening-protocol.md` with one of your own songs and the downloaded settings (and the authorized Lia v6 file with its checksum, if you want the reference in the set). Fill in `review-sheet.md` blind, then open `key.json`. | Versions play from the same moment and sound equally loud. Your scores and verdict are recorded as your listening result. | Not Run (no listening has happened) | NOT_RUN |
