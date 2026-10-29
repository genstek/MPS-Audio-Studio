# LAS-21 manual QA for Gennady

Two terminals: `npm run server` and `npm run dev -- --port 5174`. Use a made-up address such as `you+1@example.test` and a new password (not one you use elsewhere). Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-21-QA-01 | Account → Create account → submit. Open `http://127.0.0.1:5174/api/dev/outbox?to=<address>`, open the link. Sign in. | "Check your email"; the link opens the studio with "Email verified"; sign-in shows "Signed in as …". | Not Run | NOT_RUN |
| LAS-21-QA-02 | Sign in with a wrong password; with an unknown address; register a second address and sign in before verifying. | Wrong/unknown: "Email or password is incorrect." Unverified: "Verify your email first" with a resend button. | Not Run | NOT_RUN |
| LAS-21-QA-03 | Signed in, open `http://127.0.0.1:5174/api/account` in a tab (shows your email). Sign out, reload that tab. | After sign out the tab shows `unauthenticated` (401). | Not Run | NOT_RUN |
| LAS-21-QA-04 | Stop `npm run server`, reload the studio, open Account, then play a WAV. | "Accounts are unavailable right now. Local playback still works."; playback works. | Not Run | NOT_RUN |
