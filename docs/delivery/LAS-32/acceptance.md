# LAS-32 acceptance trace

Tested commit `20323dbb5ac38d0e373f0dc0b6be9ede20fdc038`. Developer results; Gennady's manual QA and the listening evaluation are NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-32-AC-01 | Each proposed module states the measured reason, parameter values, supported adjustment range and relevant uncertainty | Module cards (EQ, compressor, limiter, width) with status, measured reason, values plus their measured effect, supported range, guard notes, uncertainty; unit test checks every module has them; the browser test checks every text equals the Node computation | PASS | `tests/unit/proposal.test.js`, `tests/e2e/proposal.spec.js`, `evidence/screenshots/` |
| LAS-32-AC-02 | Excessive boosts, overcompression and unsafe width changes are constrained and evaluated against documented guards | GUARDS table (README). Tested: band −6/+4 dB, no boost below 40 Hz, combined curve ≤ +6 dB, ratio ≤ 3, compressor and limiter reduction ≤ 6 dB measured, input gain ≤ 12 dB, true peak at the ceiling; width never proposed, with a mono warning; the final render is checked against every guard | PASS | unit tests, `evidence/proposal-examples.md` |
| LAS-32-AC-03 | User can preview, reduce strength, edit, reject and undo the recipe; the original is retained | Strength 0–100 %; Preview through the real chain without changing settings or history; Reject restores the user's chain; Apply is one undo step and mixer Undo restores the complete previous chain; modules editable afterwards in the normal editors; the source file is never modified | PASS | `tests/e2e/proposal.spec.js` |
| LAS-32-AC-04 | Representative examples evaluated using matched-loudness listening and numerical checks; settings based on actual inputs | **Numerical: PASS.** Every proposal is rendered and measured from the actual section; reproducible; 7 representative synthetic cases at 100 and 50 %; Node and browser give identical proposals for the same file. **Listening: NOT_RUN.** It needs Gennady (LAS-29 protocol, LAS-31 monitor) | PARTIAL: numerical PASS, listening NOT_RUN | `evidence/proposal-examples.md`, `manual-qa.md` |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-32-QA-01 | reproducible recipe with numeric settings, reasons, uncertainty: PASS | NOT_RUN |
| LAS-32-QA-02 | adversarial tonal/dynamics/loudness/phase cases bounded by the guards: PASS | NOT_RUN |
| LAS-32-QA-03 | reject and undo restore the previous complete chain; no improvement claimed: PASS | NOT_RUN |

## Developer checks on `20323dbb5ac38d0e373f0dc0b6be9ede20fdc038`
- `npm run check`: exit 0 — ESLint clean, Vitest 248/248 (16 files), build, Playwright 73/73 (run on the staged tree committed unchanged; an earlier attempt failed lint on my scratch scripts, see the README).
- `npm run scan:artifacts`: 131 pieces, 0 findings.
