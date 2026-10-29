# LAS-22 manual QA for Gennady

`npm run server` and `npm run dev -- --port 5174`; use an account created in LAS-21 QA. Mails: `http://127.0.0.1:5174/api/dev/outbox?to=<address>`. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-22-QA-01 | Sign in in Chrome. In a private window: Account → Forgot password? → your address → open the reset mail link → new password. Back in the first window open Account. | Private window: "Password changed…". First window: "Your session has ended. Sign in again."; the old password fails, the new one works. | Not Run | NOT_RUN |
| LAS-22-QA-02 | Open the same reset link again; open `http://127.0.0.1:5174/?reset=abc`. | "This reset link is invalid or has expired. Request a new one." | Not Run | NOT_RUN |
| LAS-22-QA-03 | Enter a wrong password 5 times, then the right one. Repeat with an address that has no account. | Five times "Email or password is incorrect.", then "Too many attempts. Try again in 15 minutes." for both addresses. | Not Run | NOT_RUN |
| LAS-22-QA-04 | (Optional, 24 h) Sign in, leave the browser for a day, open Account. | "Your session has ended. Sign in again." | Not Run | NOT_RUN |
