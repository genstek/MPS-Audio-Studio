# LAS-68 — Manual / listening QA (Gennady) — all NOT_RUN

Record macOS, Chrome version, output device and its volume (keep the system volume fixed during the test).

| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-68-01 | Open the studio empty. | Master level fader disabled; text "Import a WAV or add stems to use the master level." | NOT_RUN |
| QA-68-02 | Import a WAV, Play. Drag the fader down slowly and quickly. | Volume follows smoothly, no clicks; playback position keeps running. | NOT_RUN |
| QA-68-03 | Focus the fader; use ←/→, Page Up/Down, Home, End; double-click it; press "0 dB". | Steps of 0.5 dB / 6 dB, mute, unity; the value text matches what you hear. | NOT_RUN |
| QA-68-04 | Set −12 dB. Switch Processed ↔ Original. | Both quieter by the same amount; the A/B difference stays the same. | NOT_RUN |
| QA-68-05 | Set −20 dB, Export WAV, play the exported file elsewhere at a fixed system volume. Compare with an export at 0 dB. | The two exports are identical in loudness (the fader is not in the export). | NOT_RUN |
| QA-68-06 | Pause/resume, Stop, open/close editors, Replace WAV, Remove track, reload the page. | The chosen level is kept. | NOT_RUN |
| QA-68-07 | Stems…: add two stems, set the fader in the stem dialog, play. Close the dialog. | Stem mix follows the fader; the main fader shows the same value. | NOT_RUN |
