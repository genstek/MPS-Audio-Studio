# LAS-71 — Manual QA (Gennady) — all NOT_RUN

Environment to record: macOS version, Chrome version, machine RAM, commit, file names and exact sizes in bytes (Finder → Get Info shows bytes).

| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-71-01 | Open the studio with an empty session. | Tracks says "WAV up to 250 MiB · Files stay on your device". No "100 MiB" anywhere. | NOT_RUN |
| QA-71-02 | Import a valid WAV between 100 and 250 MiB (e.g. a 15–20 minute 24-bit stereo master). Note the time to "Ready". Play, pause, seek, stop. | Imports and plays; UI stays responsive. | NOT_RUN |
| QA-71-03 | Use a WAV of exactly 262,144,000 bytes (can be produced with `node -e` and `tests/fixtures/large-wav.js`, or ask for a prepared file). Import and play. | Accepted. | NOT_RUN |
| QA-71-04 | While a track plays, choose a WAV of 262,144,001 bytes or larger. | Red message names the file size and "at most 250 MiB (262,144,000 bytes)"; the playing track continues. | NOT_RUN |
| QA-71-05 | Export WAV of the large file (24-bit). Watch Activity Monitor memory. | Export finishes with a report; note time and peak memory. | NOT_RUN |
| QA-71-06 | Stems… → Add stem WAVs with one file over 250 MiB. | Refused with the same message; other stems unaffected. | NOT_RUN |
| QA-71-07 | Compare with a reference → WAV on this device → choose a file over 250 MiB. | Refused with the same message. | NOT_RUN |
| QA-71-08 | Signed in: Account → save the current large track (≤ 250 MiB) to the library. | Saved; a larger file is refused by the server with "Files can be at most 250 MiB (262,144,000 bytes)." | NOT_RUN |
