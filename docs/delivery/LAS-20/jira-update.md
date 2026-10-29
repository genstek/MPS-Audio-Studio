**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Privacy and threat model — LAS-20

Proposed policy docs/PRIVACY_AND_THREAT_MODEL.md: data-flow inventory, trust boundaries, retention/deletion propagation with honest 30-day backup expiry, recipient-specific consent (Cancel sends nothing), and a threat model with controls and test owners (LAS-21–25).
Verifiable local-only mode: tests/e2e/local-only.spec.js (no non-GET, no body, no other origin during import→play→pause→stop→remove); negative control fails as expected.
Tested SHA 11a30581b26b5abcebda3ac597a87c859830b3eb: npm run check exit 0 (Vitest 17/17, Playwright 36/36, Linux Chromium 141).
Found and fixed on the way: LAS-8 defect rejecting ~9.3 % of valid WAV sizes (PR #20).
Branch / PR: docs/LAS-20-privacy-threat-model → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md).
Manual review: NOT_RUN. Disposition: READY_FOR_QA (policy status "proposed").
