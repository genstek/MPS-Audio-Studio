# LAS-10 manual QA for Gennady

Candidate: the integration branch `delivery/LAS-40-all-sprints` (SHA in `docs/delivery/INDEX.md`). All actual results are **Not Run**.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-10-QA-01 | Stop every app on port 5173. In the repository folder run `npm ci` and `npm run check`. | Exit code 0; the first Playwright line says `Testing the app served from <this folder>`; summary lists lint, Vitest and every Playwright test as passed. | Not Run | NOT_RUN |
| LAS-10-QA-01b | Start `npm run dev -- --port 5173 --strictPort` from a **different** checkout, then run `npm run test:e2e` here. | The run stops before any test with a message naming the other folder (or saying the server did not report its checkout). | Not Run | NOT_RUN |
| LAS-10-QA-02 | Open `npm run test:e2e:report` after a run; optionally unzip `docs/delivery/LAS-10/evidence/controlled-failure/html-report.zip` and open `index.html`. | The failure demo shows the error, a screenshot and a trace you can open. | Not Run | NOT_RUN |
| LAS-10-QA-03 | Read the test-to-manual-case map in `README.md` against TC-001 (LAS-53) and TC-002 (LAS-57). | Each automated assertion has a matching manual step. | Not Run | NOT_RUN |
