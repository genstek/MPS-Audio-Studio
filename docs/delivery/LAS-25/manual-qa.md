# LAS-25 manual QA for Gennady

Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-25-QA-01 | With two test accounts in two browser profiles, try opening each other's `/api/projects/<id>` and `/api/assets/<id>` (ids from your own `/api/projects` view), and the other's download link. Then sign out and repeat with the old tab. | Other account: `not_found`; signed out: `unauthenticated`. | Not Run | NOT_RUN |
| LAS-25-QA-02 | Run `npm run check` then `npm run scan:artifacts` on your Mac. Repeat the LAS-21/22/23/24 manual cases. | Check exit 0; scan prints `"summary": {}` (no findings) and exits 0; no regressions. | Not Run | NOT_RUN |
