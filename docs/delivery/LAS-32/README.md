# LAS-32 — Generate and apply an explainable reference-guided mastering proposal

Jira: [LAS-32](https://genstek69.atlassian.net/browse/LAS-32) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-32.md` · Mode: IMPLEMENT · Prerequisites: LAS-31 (comparison), LAS-29 (fixtures, listening protocol) — both READY_FOR_QA

Branch `feat/LAS-32-reference-proposal` · tested application commit `20323dbb5ac38d0e373f0dc0b6be9ede20fdc038`

Developer status: **READY_FOR_QA** (proposal, guards, workflow, numerical evaluation) · Listening evaluation: **NOT_RUN** (Gennady) · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What the user gets
After **Measure and compare** (LAS-31), the Compare dialog offers **Propose settings**. In a worker, the proposal renders and measures the chosen mix section repeatedly, then shows one card per module:

| Card part | Content |
| --- | --- |
| Status | *proposed* or *not proposed* |
| Measured reason | the measured difference that motivates the module, or why nothing is proposed |
| Proposed values | exact settings, plus their measured effect in the final check |
| Supported range | the guards, and the editable range afterwards |
| Guards | when a guard limited the proposal, and by how much |
| Uncertainty | the comparison's limits (LAS-31), plus what the module's measure cannot see |

Below the cards:
- **Proposal strength** (0–100 %):
  - EQ gains and limiter input gain scale linearly;
  - the compressor ratio moves from 1 towards the proposed ratio.
- **Preview proposal** plays the proposal at that strength through the real chain without changing your settings or their history. The monitor's *Processed mix* lets you hear it against the reference.
- **Check at this strength** renders and measures the section again. It shows the distance to the reference before and after, the true peak and the largest gain reductions. While previewing, it also updates the monitor's matching gains.
- **Apply proposal** replaces the chain as **one undo step**; Undo in the mixer restores the complete previous chain. Every module stays editable in the normal editors.
- **Reject proposal** restores what was playing; your settings never changed.

The panel says plainly that the proposal "does not recover how the reference was mastered", and that a smaller measured distance "is not proof that it sounds better".

## How the proposal is made (`src/proposal.js`, `mps-proposal-1`)
1. **EQ:**
   - One bell per compared octave band (Q 1.41, about one octave).
   - The gains are fitted so that the **octave-average** change cancels the measured shape difference. The analysis measures each band relative to the total, so the whole shape is corrected, not only the largest differences.
   - The fit is then **refined by measurement** twice: the section is rendered with the EQ, measured again, and the remaining difference is added to the targets.
   - A third refinement happens after the dynamics are in place, because limiting shifts the band balance.
2. **Compressor (macro dynamics):**
   - Tried only when the mix's **loudness range** (EBU 3342) is at least 2 LU wider than the reference's.
   - Settings: slow RMS detection (30 ms attack / 300 ms release), threshold halfway into the section's range; ratios 1.5, 2, 2.5 and 3 are each rendered.
   - It is **kept only if** the rendered range comes at least 0.5 LU closer within the gain-reduction guard.
   - Peak density (crest factor) is left to the limiter. Measurement showed this is necessary: across 36 compressor settings tried, none lowered the programme's crest factor by more than 0.85 dB, and most raised it (transients pass the attack while the body is compressed).
3. **Limiter input gain:**
   - Raised towards the reference's integrated loudness, re-rendered until within 0.3 LU or a guard stops it.
   - A mix that is louder than the reference gets nothing: there is no output trim, and listening stays level-matched.
4. **Width:** measured and reported, but **never proposed**: the chain has no width processor (Space is planned). A negative correlation adds a mono-compatibility warning.
5. **Final check:**
   - The final settings are rendered and measured against the reference.
   - If the last EQ refinement would push a dynamics guard, the dynamics are brought back inside it (threshold raised or input gain lowered) and rendered again.
   - Only if that fails are the last guard-checked settings kept, and the card says so.

## Guards (`GUARDS`)
| Guard | Value |
| --- | --- |
| EQ band boost / cut | +4 dB / −6 dB; no boost below 40 Hz; combined curve at most +6 dB; bells under 0.5 dB left out |
| Compressor | ratio 1.5–3; at most 6 dB gain reduction on the section; started by a loudness-range difference of 2 LU or more, kept only for a 0.5 LU improvement |
| Limiter | input gain 0–12 dB; at most 6 dB limiter gain reduction; ceiling −1 dBTP |
| Width | none proposed (no processor); mono-compatibility warning for negative correlation |

Gain reductions are measured over the rendered pre-roll as well as the section, which is conservative.

## Validation (developer evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| **Proposal, 8 unit tests** (real renders and analyses of the LAS-29 programme): <br>• towards a mastered reference, every module has reasons, range and uncertainty; the largest band difference drops below half; loudness ends within 1 LU; true peak at most −0.9 dBTP; <br>• extreme tonal difference: every band within −6/+4 dB, no boost below 40 Hz, combined curve ≤ +6 dB (checked on 400 points), guard notes present; <br>• wide-range mix: slow compression proposed at ratio ≤ 3, gain reduction ≤ 6 dB, range at least 0.5 LU closer; the reverse case is not compressed, with the reason; <br>• a denser, louder mix gets no compression and no gain, with the reason; <br>• a 24 dB-quiet mix: input gain ≤ 12 dB and limiter reduction ≤ 6 dB; <br>• width is never proposed; −1.00 correlation warns about mono; <br>• **the same inputs give an identical proposal**; <br>• strength 0 / 50 / 100 % scale every move and stay valid | PASS | `evidence/vitest-proposal-verbose.log` |
| Engine: the monitor takes new matching gains for a measured preview; ignored without a monitor | PASS | same log |
| **Browser workflow** (`tests/e2e/proposal.spec.js`): <br>• the user first sets +2 dB limiter input gain; <br>• **every module card shows exactly the status, reasons, values, range and uncertainty computed in Node from the same file bytes**; <br>• proposing sends no settings to the chain; <br>• at 50 % the preview sends exactly the scaled proposal; the check renders at 50 %; <br>• Reject restores the user's chain; <br>• Apply sends exactly the proposal, and mixer Undo restores the user's chain; <br>• no horizontal page scroll at 360×780 or 1440×900 | PASS | `evidence/playwright-proposal.txt`, `evidence/screenshots/` |
| Representative cases (7, synthetic), including adversarial tonal, dynamics, loudness and phase cases, at 100 % and 50 % | PASS (numerical) | `evidence/proposal-examples.md` |
| Compressor survey motivating the loudness-range basis: 36 settings, largest crest-factor reduction 0.85 dB | Recorded | `evidence/compressor-crest-survey.md` |
| `npm run check`: ESLint clean, Vitest 248/248 (16 files), build, Playwright 73/73. Run on the staged tree, committed unchanged as `20323db`. A first attempt stopped at ESLint because my own debug scripts sat in the git-ignored `.data/` folder, which ESLint lints. They were removed (not repository code) and the check was run again | PASS | `evidence/npm-run-check-20323dbb5ac38d0e373f0dc0b6be9ede20fdc038.log`, `evidence/npm-run-check-attempt1-lint-failed.log`, `evidence/html-report-20323dbb5ac38d0e373f0dc0b6be9ede20fdc038.zip` |
| `npm run scan:artifacts`: 131 pieces, 0 findings | PASS | `evidence/scan-artifacts-20323dbb5ac38d0e373f0dc0b6be9ede20fdc038.json` |
| Matched-loudness listening evaluation of representative examples (AC-04, listening part); Mac/Chrome | NOT_RUN | `manual-qa.md` |

## Representative examples (numerical; synthetic audio only)
"Distance" is the measured difference to the reference section, for the mix and then for the rendered proposal at 100 %. Full module texts, the 50 % column, true peaks and gain reductions: [`evidence/proposal-examples.md`](evidence/proposal-examples.md).

| Case | Proposed | Largest band (dB) | Loudness (LU) | Loudness range (LU) | Crest factor (dB) | Guards that acted |
| --- | --- | --- | --- | --- | --- | --- |
| Mix vs the same music through the "master" preset | EQ, limiter +3.9 dB | 2.2 → 0.3 | −3.6 → −0.1 | −0.1 → −0.1 | 1.9 → 0.0 | — |
| Mix vs a much brighter version | EQ (at its limits) | 21.1 → 18.6 | 11.0 → 5.3 | 0.2 → 0.1 | −9.9 → −7.4 | every band at −6/+4 dB; no gain (mix louder) |
| Quiet wide-range mix vs a slowly compressed version | EQ, compressor 1.5:1 | 2.5 → 0.2 | 4.1 → 0.0 | 7.5 → 4.7 | −3.0 → −1.7 | ratio 2 refused (7.1 dB gain reduction) |
| Mix vs a hard-limited version | EQ, limiter +7.1 dB | 3.3 → 0.3 | −9.7 → −3.9 | 0.1 → 0.2 | 7.9 → 3.9 | limiter reduction held at 6 dB |
| Mastered mix vs a quieter, unprocessed reference | EQ | 2.2 → 0.9 | 9.6 → 9.4 | 0.1 → 0.1 | −1.9 → −2.1 | no boost below 40 Hz; no gain (no output trim) |
| Mix 24 dB too quiet vs the mastered version | EQ, limiter +12 dB | 2.2 → 0.4 | −27.6 → −15.4 | −0.1 → −0.1 | 1.9 → 1.8 | input gain stops at 12 dB |
| Mix with an inverted right channel vs the original | nothing | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | mono-compatibility warning (correlation −1.00) |

What this shows:
- Where the processors can reach the reference, the measured distances shrink to a fraction of a dB or LU.
- Where they cannot, the guards stop the proposal and say why: extreme tilt, density beyond 6 dB of limiting, loudness beyond 12 dB of gain, louder than the reference, width.
- None of this says the result *sounds* better.

## Changed files
- New: `src/proposal.js`, `src/ProposalPanel.jsx`.
- Changed: `src/CompareDialog.jsx` (takes the chain; ends previews; hosts the panel), `src/useChainSettings.js` (preview layer), `src/audio-engine.js` (monitor gains update), `src/dsp/render.worker.js` (mode `propose`; compare mode returns meters), `src/render-client.js`, `src/main.jsx`, `src/styles.css`.
- Tests: `tests/unit/proposal.test.js`, `tests/unit/audio-engine.test.js`, `tests/e2e/proposal.spec.js`.

## Limitations
- **No listening evaluation has been run.** AC-04 asks for matched-loudness listening of representative examples; the protocol and tools exist (LAS-29 listening sets, LAS-31 monitor), but the judgement is Gennady's, so it is **NOT_RUN**. The numerical checks above are synthetic.
- One section drives the proposal; the rest of the song is not considered.
- Octave-band EQ only: no narrow resonances, no dynamic EQ, no multiband.
- The compressor proposal addresses loudness range only. A reference's punch or transient shape is not modelled.
- Proposing takes several section renders, about 5–13 s for a 6–12 s section on this container. It runs in a worker with progress and is cancelled when the dialog closes.
- The proposal is built from the defaults, not from your current settings. Applying it replaces the chain; Undo restores yours.
- Lia v6 as a reference: BLOCKED until the authorized file and its checksum are provided.
- Styling is provisional until the LAS-44/45 design gates. Linux Chromium only; not run on Mac/Chrome.
