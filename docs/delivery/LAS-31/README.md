# LAS-31 — Compare a mix with its reference at matched loudness

Jira: [LAS-31](https://genstek69.atlassian.net/browse/LAS-31) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-31.md` · Mode: IMPLEMENT · Prerequisites: LAS-30 (reference profiles), LAS-28 (monitor path) — both READY_FOR_QA

Branch `feat/LAS-31-reference-comparison` · tested application commit `5ff67e91d5fe0282d880ee7a182714fe1ecef217`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What the user gets
With a track loaded, **Compare** (Tracks heading) opens *Compare with a reference*:
1. **Reference:** either a **saved reference** (LAS-30 profile; signed in) or a **WAV on this device** with its own Start/End section.
2. **Mix start/end:** the section of the loaded mix to compare (for example the chorus against the reference's chorus).
3. **Measure and compare.** The mix section is measured twice, as imported and as processed with the current settings, in a worker. The reference section is measured on this device. A saved reference uses its stored measurements, but only after the downloaded file's SHA-256 matches the profile.
4. **Results table** (Reference / Mix / Processed mix / Mix − reference / Processed − reference):
   - **Loudness and level:** integrated loudness (labelled "Level difference (not a quality measure)") and true peak.
   - **Dynamics:** loudness range, crest factor, peak-to-loudness ratio.
   - **Stereo:** correlation, side relative to mid, loudness change in mono.
   - **Tonal balance:** octave bands, each relative to the total of the compared bands.

   Every row carries its unit and a one-line explanation. Differences of LUFS are shown in LU and of dBTP in dB (EBU R128 usage).
5. **Limits of this comparison**, labelled *Not compared*, *Uncertain* or *Note*:
   - a mono side (stereo measures not compared);
   - sections of different length (more than 20 %);
   - a section shorter than 5 s;
   - different sample rates (only the octave bands both can contain);
   - always: "Level differences are measurements, not quality scores; listening is level-matched."
6. **Interpretation (not a measurement):** cautious readings of large measured differences, for the mix and separately for the processed mix. For example: "The mix has more relative energy above 4 kHz (+x.x dB on average); it may sound brighter or harsher." When any *Uncertain* limit applies, each reading ends with "(uncertain: see the limits above)". If nothing is large: "No large differences were measured; judge by ear with the level-matched monitor."
7. **Listen at matched loudness:** **Start monitor** loops the mix section and the reference section, each on its own. **Reference / Mix / Processed mix** switches instantly. The louder versions are turned down to the quietest, using the integrated loudness of exactly the measured sections; nothing is turned up. The status line names the gains. Closing the dialog stops the monitor and restores normal listening.

Selecting, measuring and monitoring a reference **changes no processing settings**. The reference itself is never processed.

## How it works
| Part | File | Role |
| --- | --- | --- |
| Comparison | `src/reference-comparison.js` | Pure: `compareToReference(reference, mix, processed)` → rows, conditions, interpretations; `matchLevels()` gains. Refuses silent, too-short and different-version reports with a reason |
| Section render | `src/dsp/segment-render.js` | Renders one section with the chain as it sounds inside the whole-track render. Pre-roll = max(3 s, 5 × slowest attack/release), so an earlier detector state has decayed below e^−5. Plus a 10 ms post-roll for the limiter look-ahead |
| Worker | `src/dsp/render.worker.js` mode `compare` | Decodes the file, renders the section, analyses original and processed (LAS-26 `analyze`) |
| Monitor | `src/audio-engine.js`, `src/output-stage.js` | `startComparison` / `compareListen` / `stopComparison`. The mix loop feeds the normal processed/original paths (LAS-28). The reference loop has its own unprocessed path into the same analyser and output. Play, Stop, import and removal end the monitor; master listening and loudness-match changes wait until it ends |
| UI | `src/CompareDialog.jsx`, `src/main.jsx`, `src/styles.css` | Dialog, results table (scrolls inside its own focusable region on narrow screens), monitor |

## Validation (developer evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| **Comparison, 12 unit tests** (real `analyze()` reports of generated audio): <br>• the same audio gives zero differences; <br>• the same music 6 dB louder gives +6.0 LU, labelled a level difference, with no tonal change and no quality wording; <br>• a brighter and a duller mix give band differences beyond ±3 dB at 8 kHz, with interpretations for the mix and the processed mix kept apart; <br>• unequal lengths are flagged and every interpretation is marked uncertain; a section under 5 s is flagged; <br>• mono against stereo, both ways: stereo rows not compared; <br>• silent and too-short sections are refused with a reason; a band with no energy is "not measurable"; <br>• 44.1 against 48 kHz compares only the 9 shared bands, renormalised (white noise within 0.6 dB); <br>• the matching section of a track gives 0 LU and another section −18 LU; <br>• different analysis versions are refused; <br>• matched gains are never above 0 dB | PASS | `evidence/vitest-comparison-verbose.log` |
| **Section render vs whole-track render** (largest sample difference): default 0, master 7e-9, 800 ms release after loud noise 3e-8; loudness, true peak and crest equal to 0.0001. **Negative control without pre-roll:** 0.41 sample difference, 0.13 LU, 4.27 dB true peak | PASS | `evidence/section-render-accuracy.md` (script: `section-render-accuracy-script.mjs.txt`, run from the git-ignored `.data/`) |
| **Engine monitor, 3 unit tests:** <br>• two loops on the right paths and normal playback stopped; <br>• gains and switching are applied; master listening and loudness-match changes wait until the monitor ends; <br>• `setParams` is never called; <br>• Play, Stop, a new import and removal each end the monitor; <br>• a start cancelled while decoding never starts; a bad reference and a missing track are refused | PASS | `evidence/vitest-comparison-verbose.log` |
| **Browser workflows, 4 tests:** <br>• local reference: the displayed loudness of each section equals the same analysis run in Node; four measure groups; level-difference note; <br>• monitor: two sources playing; reference gain 10^(Δ/20) within 0.01; Mix and Processed switching; closing stops it and normal playback works again; <br>• **no settings messages reached the chain** and the last settings are unchanged; <br>• mono 48 kHz reference, 4 s against 10 s: four limits shown, stereo "not compared", interpretations marked uncertain; silent and out-of-range sections refused; <br>• saved references: stored measurements used; switching references sends no settings; a tampered download is refused by checksum; <br>• 360×780 and 1440×900: no horizontal page scroll; the table scrolls inside its own focusable region only when narrow | PASS | `evidence/playwright-compare.txt`, `evidence/screenshots/` |
| References picker at 360 px (LAS-30 defect): regression test passes. **Negative control:** without the fix it fails (picker right edge 389 px against the dialog's 341 px) | PASS | `evidence/playwright-compare.txt`, `evidence/picker-negative-control.txt` |
| `npm run check`: ESLint 0, Vitest 239/239 (15 files), build, Playwright 72/72. Run on the staged tree, which was then committed unchanged as `5ff67e9` (only these docs were added afterwards) | PASS | `evidence/npm-run-check-5ff67e91d5fe0282d880ee7a182714fe1ecef217.log`, `evidence/html-report-5ff67e91d5fe0282d880ee7a182714fe1ecef217.zip` |
| `npm run scan:artifacts`: 128 pieces, 0 findings | PASS | `evidence/scan-artifacts-5ff67e91d5fe0282d880ee7a182714fe1ecef217.json` |
| Listening review of the monitor; Mac/Chrome run | NOT_RUN | `manual-qa.md` |

These checks prove the measurements, the conditions and the wiring. **No listening test has been run**; whether the matched comparison *sounds* fair is Gennady's judgement.

## Defect found in an earlier slice
**LAS-30 References dialog at 360 px.** The **Choose reference WAV** picker inherited the Tracks panel's named grid area (`grid-area: picker`). Inside a dialog's grid this created an extra column, and the picker sat partly outside the dialog (x 218 + 172 px against a dialog edge at 341 px). Found while laying out this dialog. Fixed for every dialog (`.analysis-dialog .file-picker { grid-area: auto; }`), with a new regression test in `tests/e2e/references.spec.js`.

## How the new tests work (one step at a time)
1. **Unit test of the comparison** (`tests/unit/reference-comparison.test.js`): build two signals in code, analyse them with the real `analyze()`, call `compareToReference()`, and check one fact per test. For example, the same music 6 dB louder gives a loudness difference of +6 LU and no tonal difference.
2. **Negative control:** to show the pre-roll matters, the same section is also rendered *without* pre-roll. That render measures more than 0.1 LU away from the whole-track render, while the pre-rolled one stays within 0.01 LU.
3. **Engine test with stand-ins** (`tests/unit/audio-engine.test.js`): the audio context and output stage are replaced by small fakes that record calls. The test reads which nodes were connected, looped and started, and checks that `setParams` was never called.
4. **Browser test** (`tests/e2e/compare.spec.js`):
   - Playwright imports a generated WAV and opens the dialog.
   - It computes the expected loudness *in Node* with the same analysis code, then compares it with the text in the table.
   - Two probes record what the page sends to the chain (`params` messages) and the three output gains. The test checks the monitor gains, and that the number of settings messages did not change.

## Changed files
- New: `src/reference-comparison.js`, `src/dsp/segment-render.js`, `src/CompareDialog.jsx`.
- Changed: `src/audio-engine.js`, `src/output-stage.js`, `src/dsp/render.worker.js`, `src/render-client.js`, `src/main.jsx`, `src/styles.css`.
- Tests: `tests/unit/reference-comparison.test.js`, `tests/unit/audio-engine.test.js`, `tests/e2e/compare.spec.js`, `tests/e2e/helpers/chain-probe.js`, `tests/e2e/references.spec.js`.

## Limitations
- **Measurements, not judgement.** The interpretations are fixed wording for large measured differences (≥ 3 dB average in the low or high bands, crest factor or side/mid). They are not a listening result. The listening review (LAS-29 protocol) stays NOT_RUN.
- The monitor plays at the browser's rate. A file at another rate is resampled for listening, while measurements use the file's own rate (as in LAS-28).
- The sections loop independently and are not time-aligned: they are different music.
- Integrated loudness is the matching basis (BS.1770). It does not equalise perceived loudness for very different spectra.
- The processed column is measured with the settings at the time of comparison. If the settings change, the dialog says the column and its matching gain are out of date until you measure again.
- Saved references need sign-in and the server. Local references need neither.
- Lia v6: BLOCKED until the authorized file and its checksum are provided (it would be compared like any reference).
- Styling is provisional until the LAS-44/45 design gates. Linux Chromium only; not run on Mac/Chrome.
