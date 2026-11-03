# LAS-23 manual QA for Gennady

`npm run server` + `npm run dev -- --port 5174`. Use test files (generate with the LAS-8 command) or a WAV you are happy to store locally in `.data/dev`. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-23-QA-01 | Account A signed in: import a WAV, Account → Save to my library. Copy the file id from `http://127.0.0.1:5174/api/projects` → open the project. In another browser profile sign in as account B and open `http://127.0.0.1:5174/api/assets/<A's id>`. | A sees the file; B gets `not_found`. B's library is empty. | Not Run | NOT_RUN |
| LAS-23-QA-02 | As A, press Download, copy the link from DevTools Network; open it in a private window (no session); wait 5 minutes and open it again as A. | Private window: `unauthenticated`; after 5 minutes: "This download link is invalid or has expired." | Not Run | NOT_RUN |
| LAS-23-QA-03 | Rename a text file to `.wav` and try to save it via the API (`curl -X POST -H 'X-MPS-Request: 1' --data-binary @notes.wav …` with your session cookie), or simply confirm the studio refuses it at import. | 422 "This file is not a WAV…"; nothing appears in the library. | Not Run | NOT_RUN |
| LAS-23-QA-04 | Save, Download and compare checksums (`shasum -a 256`) of the original and downloaded files; Delete → Confirm delete. | Same checksum; the file disappears from the list. | Not Run | NOT_RUN |
