# LAS-31 section render accuracy

Node v22.22.0. Programme = the LAS-29 music-like fixture. Differences against the same section cut from the whole-track render.

| Case | Largest sample difference | Loudness (LU) | True peak (dB) | Crest (dB) |
| --- | --- | --- | --- | --- |
| default preset, section 9–15 s, pre-roll 3 s | 0.00e+0 | 0.0000 | 0.0000 | 0.0000 |
| master preset, section 9–15 s, pre-roll 3 s | 7.45e-9 | 0.0000 | 0.0000 | 0.0000 |
| slow release (800 ms) after loud noise, section 6–10 s, pre-roll 4 s | 2.98e-8 | 0.0000 | 0.0000 | 0.0000 |
| same, **no pre-roll (negative control)** | 4.11e-1 | 0.1274 | 4.2721 | 3.9168 |
