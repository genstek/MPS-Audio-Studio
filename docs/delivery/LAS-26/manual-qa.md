# LAS-26 manual QA for Gennady

Actual results stay **Not Run** until you test. Use Chrome on your Mac.

Test files you can make yourself (no copyrighted audio needed), for example with FFmpeg or any audio editor:
- `tone-23.wav`: 20 s, 1 kHz sine at −23 dBFS, stereo, 48 kHz, 24-bit:
  `ffmpeg -f lavfi -i "sine=frequency=1000:duration=20:sample_rate=48000" -af "volume=-4.94dB,pan=stereo|c0=c0|c1=c0" -c:a pcm_s24le tone-23.wav`
  (FFmpeg's sine source peaks at −18.06 dBFS; −4.94 dB brings it to −23. Checked here with FFmpeg 6.1.1: I −23.0 LUFS, peaks −23.0.)
- `silence.wav`: 5 s of digital silence; `mono.wav`: any mono WAV; `clipped.wav`: a tone boosted until it clips; a long WAV (5–10 minutes) of your own music; a 4-channel or compressed (non-PCM) WAV if you have one.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-26-QA-01 | Import each test file → **Analyze**. | Tone: integrated −23.0 LUFS (±0.1), true peak and sample peak about −23.0, correlation +1.00, 1 kHz band ≈100 %. Silence: "Silent" note, peaks "—". Mono: "Mono file: stereo measures do not apply." Clipped: clipping runs > 0, true peak above 0 dBTP possible and labelled dBTP, sample peak dBFS. All values have units; nothing says NaN or Infinity. | Not Run | NOT_RUN |
| LAS-26-QA-02 | Import the long WAV → **Analyze** → while it runs press **Cancel analysis** → **Try again** → close the dialog (×) → **Play** → reopen with **Analyzing…/Analyze**. Then import the 4-channel/compressed file → **Analyze**. | The page never freezes; Cancel shows "Analysis cancelled."; Play works while analysing; the report appears when done. The unsupported file shows a clear message and still plays. | Not Run | NOT_RUN |
| LAS-26-QA-03 | Analyze the same file twice (**Analyze again**); note the SHA-256 at the bottom; compare it with `shasum -a 256 <file>` in Terminal. Optionally compare integrated loudness and true peak with a meter you trust (e.g. FFmpeg `ebur128=peak=true`). | Both runs identical; SHA-256 equals the Terminal value; the file's modification date is unchanged; values agree with your meter within the README tolerances. | Not Run | NOT_RUN |
