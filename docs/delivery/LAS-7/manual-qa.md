# LAS-7 manual QA for Gennady

Candidate: integration branch `delivery/LAS-40-all-sprints` (SHA in `docs/delivery/INDEX.md`). Start the app with `npm run dev -- --port 5174`, open http://127.0.0.1:5174/ in Google Chrome with DevTools Console open. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-7-QA-01 | Clean (incognito) window at 1280×720, then 1440×900. | Transport, Tracks, Master and Mixer appear with Import WAV; DevTools Console shows no red errors. | Not Run | NOT_RUN |
| LAS-7-QA-02 | Hover/click Input, EQ, Dynamics, Space "Unavailable", Master level and Export. | All are disabled and say Coming soon / unavailable; nothing changes the sound. | Not Run | NOT_RUN |
