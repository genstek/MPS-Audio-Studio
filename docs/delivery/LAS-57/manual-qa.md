# LAS-57 (TC-002) manual execution for Gennady

Preconditions: local Vite server running (`npm run dev -- --port 5174`), clean Chrome incognito window, `LAS-TC002-tone.wav` generated with the command in `README.md`. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-57-QA-01 | 1 open the app URL; 2 click Import WAV; 3 choose LAS-TC002-tone.wav; 4 wait and inspect Tracks | No audio loaded before; picker opens; no error; Ready; 01 TRACK; name `LAS-TC002-tone.wav`, `3.0 seconds · 1 channel(s) · 44,100 Hz decoded` (or your output rate, e.g. 48,000); Replace WAV | Not Run | NOT_RUN |
| LAS-57-QA-02 | 5 inspect Transport | Play and Stop enabled, Pause disabled; no alert. Pressing Play enables Pause | Not Run | NOT_RUN |

Record your run as a new Test Execution; the automated run in this folder is a separate record.
