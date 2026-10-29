# LAS-7 — Runnable web mixer shell

Jira: [LAS-7](https://genstek69.atlassian.net/browse/LAS-7) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-7.md` · Mode: VERIFY_EXISTING

Branch `test/LAS-7-shell-smoke` · tested application commit `655a959bc089a0d809caad0c73d8e74886bd8f41`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Audit of the existing shell (no second app scaffolded)
The React + Vite shell merged in `main` already provides the masthead, named Transport, Tracks, Master and Mixer regions, an empty state with one Import WAV action, and four processing strips plus Master level and Export that are disabled and labelled "Coming soon" / "unavailable". No application code was changed for this issue.

## What this slice adds
`tests/e2e/shell-smoke.spec.js` opens the app at 1280×720, 1440×900 and the smallest supported desktop size 761×450 (LAS-51 range) and fails on any console error, uncaught page error, failed request or HTTP ≥ 400 response. It checks the four regions, the empty-state import and that every placeholder is disabled and says it is unavailable. It saves one screenshot per size.

A negative control (a temporary `console.error` added to `src/main.jsx`, reverted afterwards and never committed) made the test fail with the logged message, so the check is not vacuous: `evidence/negative-control-console-error.log`.

## Run it
```sh
npm ci
npm run dev                     # documented manual start (port 5174 is the owner's habit: npm run dev -- --port 5174)
npm run test:e2e -- --grep LAS-7
```

## Observations (not changed here)
- The disabled Play button keeps its gold primary colour at a lower opacity; it is disabled and announced as such, but it may look more available than Pause/Stop. Reported for design review, not changed without a story.
- Console warnings (not errors) are not asserted; none appeared in the inspected runs.

## Limitations
Linux Chromium 141 only (`../ENVIRONMENT.md`). Production preview build (`npm run preview`) was built (`npm run build` exit 0) but not browsed. Mac/Chrome and manual inspection are Gennady's.
