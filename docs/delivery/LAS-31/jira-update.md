**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-31

Scope: **Compare** dialog. It measures a chosen section of the mix, as imported and as processed with the current settings, against a reference section: a local WAV, or a saved LAS-30 profile verified by checksum. It shows measured differences with units (loudness, true peak, LRA, crest, PLR, correlation, side/mid, mono change, octave tonal balance) and the limits of the comparison (mono, unequal or short sections, sample rates). Cautious interpretations are kept separate. A level-matched monitor loops both sections through the output stage; the reference is never processed. Selecting or comparing changes no settings. Also fixes the LAS-30 reference picker overflowing its dialog at 360 px.
Branch / PR: feat/LAS-31-reference-comparison → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: 5ff67e91d5fe0282d880ee7a182714fe1ecef217
Material: docs/delivery/LAS-31/ on the delivery branch

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 measures with units and labels | unit + browser tests (values equal an independent Node analysis) | PASS | evidence/vitest-comparison-verbose.log, evidence/screenshots/ |
| AC-02 level-matched A/B on the selected sections; loudness not a quality score | monitor gains checked; labelling | PASS | evidence/playwright-compare.txt |
| AC-03 measured vs interpretation; uncertain/unsupported flagged | unit + browser tests | PASS | evidence/vitest-comparison-verbose.log |
| AC-04 durations, mono/stereo, silence, section selection; no processing on selection | unit + browser tests; no settings messages reach the chain | PASS | evidence/playwright-compare.txt |

Commands/environment: npm run check exit 0 (ESLint 0, Vitest 239/239, build OK, Playwright 72/72, Chromium 141, Linux, Node 22.22); npm run scan:artifacts exit 0 (128 pieces, 0 findings); section render matches the whole-track render within 3e-8 (no-pre-roll control: 0.13 LU, 4.27 dB TP off).
Manual QA: docs/delivery/LAS-31/manual-qa.md — QA-01 compare and monitor, QA-02 edge sections, QA-03 settings unchanged; Gennady execution NOT_RUN.
Limitations/blockers: interpretations are fixed wording, not a listening result; the listening review is NOT_RUN; integrated loudness is the matching basis; the monitor plays at the browser's rate; saved references need sign-in; Lia v6 BLOCKED until the authorized file and checksum; provisional styling; Mac not run.
Disposition: READY_FOR_QA

No claim of manual sign-off, Jira closure or main merge is implied.
