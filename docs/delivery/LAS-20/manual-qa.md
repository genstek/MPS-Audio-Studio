# LAS-20 manual QA for Gennady

Actual results stay **Not Run** until you test or review.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-20-QA-01 | Without signing in, open Chrome DevTools → Network, import a WAV, play, pause, stop, remove. | Only page/script GET requests at start; no POST/PUT and no request carrying your file. | Not Run | NOT_RUN |
| LAS-20-QA-02 | Read the threat table in `docs/PRIVACY_AND_THREAT_MODEL.md`. Approve or request changes to retention and backup rules. | Each threat has a control and a test owner; your decision is recorded in Jira. | Not Run | NOT_RUN |
