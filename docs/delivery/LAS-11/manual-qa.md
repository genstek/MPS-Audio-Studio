# LAS-11 manual QA for Gennady

Use any WAV of a minute or more that you own (it stays on your Mac). `npm run dev -- --port 5174`, Chrome. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-11-QA-01 | Play → wait to ~00:20 → Pause → Pause. | First Pause: sound stops, timer freezes, Pause looks pressed. Second Pause: sound continues from ~00:20. | Not Run | NOT_RUN |
| LAS-11-QA-02 | Play → Pause at ~00:30 → Play. | Sound continues from ~00:30, Pause no longer pressed. | Not Run | NOT_RUN |
| LAS-11-QA-03 | Toggle Pause many times quickly, then Stop, then Play; try with keyboard (Tab to Pause, Space). | Never two copies of the sound; Stop returns to 00:00.0; Play starts from the beginning; controls stay consistent. | Not Run | NOT_RUN |
