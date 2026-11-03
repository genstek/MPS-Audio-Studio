# LAS-67 — Manual QA (Gennady) — all NOT_RUN

| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-67-01 | Empty studio. | RWD, FF and the timeline are disabled. | NOT_RUN |
| QA-67-02 | Import a song. Click FF twice, RWD once (stopped). Play. | Time shows 0:05 → 0:10 → 0:05; Play starts at 0:05. | NOT_RUN |
| QA-67-03 | While playing, hold FF for about two seconds. | The time jumps forward about 25 s per second; playback continues; no stutter of overlapping audio. | NOT_RUN |
| QA-67-04 | Hold FF until the end while playing. | Playback ends (Stopped, 0:00). | NOT_RUN |
| QA-67-05 | Drag the timeline while playing and while paused; use ←/→, Page Up/Down, Home, End on it. | Seeks as described; Paused stays Paused. | NOT_RUN |
| QA-67-06 | Watch the L/R needles and bars on a stereo song, a left-only test file and a mono file. | Needles move with the music (smooth, about 300 ms); one-sided files move only one side; mono moves both equally. | NOT_RUN |
| QA-67-07 | Switch Processed/Original and move Master Level. | Meters follow what you hear. | NOT_RUN |
| QA-67-08 | Play a very loud file on Original with Match loudness off. | CLIP lights and stays until clicked. | NOT_RUN |
| QA-67-09 | Watch the spectrum while playing; pause. | Real spectrum with Hz/dB scales; "no signal" after the meters fall. | NOT_RUN |
| QA-67-10 | Replace or remove the track while seeking quickly. | No errors; nothing keeps playing after removal. | NOT_RUN |
| QA-67-11 | Choose the player look (tape deck A or compact hybrid B) in `docs/design/LAS-44/studio-proposals.html`. | Choice recorded in LAS-44 / LAS-67. | PENDING (design decision) |
