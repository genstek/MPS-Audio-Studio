# LAS-9 manual QA for Gennady

Use a recognizable WAV of two minutes or more that you own (it stays on your Mac; do not attach it to Jira unless you choose to). Start with `npm run dev -- --port 5174` in Chrome. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-9-QA-01 | Play to about 01:00 on the timer → Pause → wait 10 s → Play. | Timer stops at about 01:00 while paused; music continues from that point, not from the start. | Not Run | NOT_RUN |
| LAS-9-QA-02 | Play to about 01:00 → Stop → Play. Let a short WAV play to its end. | Stop sets 00:00.0 and Play starts from the beginning; at the natural end the status becomes Stopped and the timer 00:00.0. | Not Run | NOT_RUN |
| LAS-9-QA-03 | Click Play/Pause/Stop quickly many times; then choose a broken WAV while playing. | Never two copies of the sound; page stays responsive; the broken file shows an error and the current track keeps working. | Not Run | NOT_RUN |
