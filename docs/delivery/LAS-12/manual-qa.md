# LAS-12 manual QA for Gennady

`npm run dev -- --port 5174`, Chrome. Use any WAV you own; keep a copy of its checksum (`shasum -a 256 file.wav`) before testing. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-12-QA-01 | Import → Play → Remove track. Repeat with Pause before Remove, and with Stop before Remove. | Sound stops at once and does not come back; No audio loaded, "Your session starts here", 00 TRACKS, Import WAV, 00:00.0 / 00:00.0; Play/Pause/Stop disabled. | Not Run | NOT_RUN |
| LAS-12-QA-02 | Import a large WAV as a replacement and press Remove track while "Loading audio…" shows. | The session stays empty after loading finishes; the new file does not appear. (Hard to time by hand with small files; skip if loading is too fast to catch.) | Not Run | NOT_RUN |
| LAS-12-QA-03 | After removal, import the same WAV and play; remove; import a different WAV and play. Compare `shasum -a 256` of the file with the value before. | Both play normally from the start; the checksum is unchanged. | Not Run | NOT_RUN |
| LAS-12-QA-04 | Keyboard only: Tab to Remove track, press Enter. | Track removed; focus is on Import WAV (the focus ring is visible there). | Not Run | NOT_RUN |
