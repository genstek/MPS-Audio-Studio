# LAS-10 acceptance trace

Tested commit `8b2068f5d64a74a48223eeb4d3b5c300b64809df`, environment `../ENVIRONMENT.md`. Developer results only; manual results are in `manual-qa.md` and are NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-10-AC-01 | One-command repeatable Playwright run on Chromium with real output | `PLAYWRIGHT_EXECUTABLE_PATH=… npm run check` exit 0: lint, Vitest 4/4, build, Playwright 14/14 | PASS (Linux Chromium 141) | `evidence/npm-run-check-8b2068f….log`, `evidence/html-report-8b2068f….zip` |
| LAS-10-AC-02 | Test script and assertions map to documented manual cases | Map in `README.md`; TC-001 → LAS-53, TC-002 → LAS-57, TC-003 → LAS-10 scope | PASS (documentation review by developer) | `README.md` |
| LAS-10-AC-03 | Failure shows actionable trace/screenshot/report | Throwaway copy of TC-001 with a wrong expected status, run outside the repository: exit 1 with Expected/Received, `test-failed-1.png`, `trace.zip`, `error-context.md`, HTML report | PASS | `evidence/controlled-failure/` |
| LAS-10-AC-04 | Observed pass/fail evidence and limitations | This folder; limitations in `README.md` | PASS | this folder |
| LAS-10-AC-05 | GitHub Actions proposed as follow-on | Proposal in `README.md`; no workflow added or run | PASS (proposal only) | `README.md` |
| Scope | Reconcile ports 5174/5173; prove server ownership with reuse | Guard runs: own server started (exit 0), foreign old server (exit 1, "did not report its checkout"), foreign folder with endpoint (exit 1, names the folder), own server reused (exit 0) | PASS | `evidence/server-guard/case1-4.log` |
