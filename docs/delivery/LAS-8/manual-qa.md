# LAS-8 manual QA for Gennady

Start the app (`npm run dev -- --port 5174`) in a Chrome incognito window. Generate test files from the repository folder:
```sh
node -e "import('./tests/fixtures/wav.js').then(m => { const fs = require('fs'); fs.writeFileSync('LAS-TC002-tone.wav', m.makeWav()); fs.writeFileSync('stereo-48k.wav', m.makeWav({ seconds: 1.5, channels: 2, sampleRate: 48000 })); fs.writeFileSync('broken.wav', Buffer.from('RIFF0000WAVE')); fs.writeFileSync('empty.wav', Buffer.alloc(0)); fs.writeFileSync('notes.wav', 'not audio at all'); fs.writeFileSync('five-seconds.wav', m.makeWav({ seconds: 5 })); })"
```
Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-8-QA-01 | Import `LAS-TC002-tone.wav`, then `stereo-48k.wav`. | Name shown; `3.0 seconds · 1 channel(s) · <rate> Hz decoded`, then `1.5 seconds · 2 channel(s) · <rate> Hz decoded`; Ready. | Not Run | NOT_RUN |
| LAS-8-QA-02 | With a track playing, choose `broken.wav`. | "Unable to decode this WAV…" alert; the previous track keeps playing and still works after Stop/Play. | Not Run | NOT_RUN |
| LAS-8-QA-03 | Try `empty.wav`, `notes.wav`, any `.mp3`, then a valid WAV. Optionally a WAV larger than 100 MiB. | Each rejected with a clear message and nothing loaded; the valid WAV then imports. Over 100 MiB: "Choose a WAV smaller than 100 MiB." | Not Run | NOT_RUN |
| LAS-8-QA-04 | Import a WAV, press Play, choose the very same file again. | Import happens again (status Ready, playback stopped); only one copy of the sound is heard after Play. | Not Run | NOT_RUN |
| LAS-8-QA-05 | Import `five-seconds.wav` (generated above). | Ready, `5.0 seconds · 1 channel(s)`; before the fix this file was rejected as not a valid WAV. | Not Run | NOT_RUN |
