# LAS-33 — Save mastering preferences and reusable reference-based presets

Jira: [LAS-33](https://genstek69.atlassian.net/browse/LAS-33) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-33.md` · Mode: IMPLEMENT · Prerequisite: LAS-32 (READY_FOR_QA)

Branch `feat/LAS-33-presets-preferences` · tested application commit `d490a50fad2e84629605a0cf5b35ca5f7fa5ccee` · tooling follow-up `65f7278` (artifact scan accepts PUT log lines)

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What the user gets
**Settings… (mixer) → My presets** (signed in):
- **Save current settings as preset** with a name. A preset is the complete chain: all 24 bands per channel, Link or independent, compressor, limiter and processing order (`mps-chain` v1).
- Each preset shows its origin and versions: *saved settings · chain v1*, or *from a proposal · chain v1 · mps-proposal-1 at 80 % · mps-analysis-1*.
- Per preset: **Apply** (one undo step), **Rename**, **Export** (downloads `<name>.mps-preset.json`) and **Delete**.
- **Import preset file…**:
  - an `mps-preset` v1 file is validated and added;
  - an LAS-28 settings file (`mps-chain` v1) is **migrated** into a preset, and the message says so;
  - a newer, invalid or foreign file is refused with the reason and "Nothing was changed".
  - Importing never applies anything by itself.
- **Remembered proposal decisions:** the decisions you chose to remember, each with Forget, plus **Forget all decisions**.

**Proposal panel (LAS-32), new parts:**
- **Your preferences:** a card separate from the reference-derived modules.
  - Contents: low shelf at 120 Hz and high shelf at 8 kHz (±4 dB), and the strength a new proposal starts at.
  - **Save my preferences** stores them in your account; **Reset my preferences** returns them to neutral and says the reference targets are unchanged.
  - Preferences sit on EQ bands 23–24, so they never overwrite the reference-derived bells.
- **Use reference targets** / **Use my preferences**: either part can be switched off for preview, check and apply. AC-03 asks for resetting either; switching one off is a reset for that proposal.
- **Remember my decision** (off by default) with an optional **Rating** 1–5. Only when ticked, Apply or Reject stores the decision, its settings summary and the rating.
- **Save as preset** stores the proposal as played: strength, parts and preferences, with its analysis and proposal versions and the saved reference profile it came from.

## Data and rules (`server/presets.js`, schema v5)
| Table | Holds | Deleted when |
| --- | --- | --- |
| `presets` | name, chain JSON, chain version, origin (`manual` / `proposal` / `import`), analysis version, proposal version, strength, optional reference profile | its owner deletes it or the account; deleting the reference profile keeps the preset and forgets the link (`SET NULL`) |
| `preferences` | one `mps-preferences` v1 record per owner | Reset, or account deletion |
| `decisions` | accepted/rejected, rating 1–5 or none, strength, proposal version, settings summary (≤ 8 KiB), optional reference profile | Forget / Forget all, or account deletion; the profile link as for presets |

- **Owner control:**
  - Every query is filtered by the signed-in owner; another owner's id gets the same 404 as a missing one, and signed out gets 401.
  - Only your own reference profile can be linked.
  - State changes need the studio's request header (ADR-003 CSRF rule).
- **Validation:**
  - The server validates with the studio's own schemas (`src/presets.js`, `validateChain`).
  - Wrong band counts, other processing orders, newer chain versions, out-of-range values, unknown origins, bad ratings, a wrong proposal version and oversized bodies (> 64 KiB) are refused with a reason.
  - At most 200 presets and 500 remembered decisions per owner.
- **Privacy (AC-04):**
  - Only settings are stored: no audio, no model, nothing trained, nothing sent elsewhere.
  - A browser test watches every request to these endpoints: each goes to this studio only, carries JSON only, and stays under 64 KiB.

## File formats
- `mps-preset` v1: `{ schema, version, name, chain (mps-chain v1), origin, analysisVersion, proposalVersion, strength }`, written as stable JSON.
- **Migration:** an `mps-chain` settings file becomes a preset named after the file, origin `import`. Future preset versions add steps here; a file from a newer studio is refused, never guessed.
- `mps-preferences` v1: `{ schema, version, lowShelfDb, highShelfDb, strength }`.

## Validation (developer evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| **11 server tests:** <br>• save, list, read back the complete chain (24 + 24 bands, independent mode, order, compressor, limiter), rename, delete; <br>• proposal presets keep their versions and strength; <br>• refusals: 25 bands, newer chain version, other order, missing chain, unknown origin, strength 150, a 70 KiB body, with nothing stored; <br>• two-user isolation (list, read, rename, delete; signed out 401); <br>• CSRF header required; <br>• preferences: defaults, save, reset, validation, owner-only; <br>• decisions: stored only when sent, listed, forgotten one or all, owner-only; six kinds of bad decision refused; <br>• only your own profile can be linked; deleting the profile forgets the link; deleting the account leaves 0 rows in all three tables; <br>• schema v4 → v5 upgrade in place | PASS | `evidence/vitest-presets-verbose.log` |
| **5 unit tests:** <br>• preset file round trip (stable text, independent L/R, order); <br>• mps-chain migration; <br>• newer, unknown, non-JSON, broken and zero-version files refused with reasons; <br>• preferences bounds and versions; <br>• reference targets and preferences composed separately, either switched off, neutral preferences change nothing | PASS | same log |
| **3 browser workflows:** <br>• save a customised chain → reload → Apply → the chain sent to the engine **equals** the saved one; rename; export file equals the preset; delete; <br>• imported settings file migrated; newer, invalid and foreign files refused with reasons and **no settings message** to the chain; <br>• preferences saved; preview carries the high shelf on band 24 plus the reference bells; reference targets off → shelf only; reset preferences → bells kept, shelf gone; "Remember my decision" + rating 4 → listed → Forget all; a second account sees no presets or decisions; <br>• **traffic check:** every request to presets, preferences and decisions went to this studio, as JSON under 64 KiB; <br>• Settings at 360×780 and 1280×720: no horizontal scroll, pickers inside the dialog | PASS | `evidence/playwright-presets.txt`, `evidence/screenshots/` |
| Earlier flows that share these components: LAS-28 mastering controls (settings files, snapshots, editors) and the LAS-32 proposal | PASS | `evidence/playwright-presets.txt` |
| `npm run check`: ESLint clean, Vitest 264/264 (18 files), build, Playwright 76/76. Run on the staged tree committed unchanged as `d490a50` | PASS | `evidence/npm-run-check-d490a50fad2e84629605a0cf5b35ca5f7fa5ccee.log`, `evidence/html-report-d490a50fad2e84629605a0cf5b35ca5f7fa5ccee.zip` |
| **First full run failed** (1 of 76): the LAS-32 browser test located the strength value with an unscoped `output`, which matched four elements once the preferences card added sliders. My regression; I had not rerun that spec after changing the panel. The locator was scoped to the "Proposal strength" control (an intentional test change; the assertion is the same), the spec rerun and the full check rerun | FIXED | `evidence/npm-run-check-attempt1-failed.log` |
| `npm run scan:artifacts`: 136 pieces. The first scan flagged one warning: the server log line `PUT /api/preferences 200 6ms` was outside the LAS-25 allowlist, which predates PUT routes. The allowlist now accepts PUT (`65f7278`); rescan: **0 findings** | PASS | `evidence/scan-artifacts-before-put-allowlist.json`, `evidence/scan-artifacts-65f727828d227cd8103cd18c95126ec77b387f20.json` |
| Mac/Chrome run and Gennady's own presets | NOT_RUN | `manual-qa.md` |

## Defects found in earlier slices and fixed here
**Settings dialog at 360 px (LAS-28):**
- The *Load settings…* picker inherited the Tracks panel's named grid area and pushed the section into two cramped columns. This is the same cause as the LAS-30 References defect fixed in LAS-31, but that fix only covered the analysis-style dialogs. The rule now applies to every `<dialog>`.
- The dialog's label colour also made the picker's text grey on gold. Picker labels now keep their own colour.
- A layout assertion (pickers inside the dialog, the form below its heading) was added to the LAS-33 browser test.

## Changed files
- New: `src/presets.js`, `server/presets.js`.
- Changed: `server/db.js` (migration v5), `server/app.js`, `src/SettingsDialog.jsx`, `src/ProposalPanel.jsx`, `src/CompareDialog.jsx` (passes the saved reference profile id), `src/styles.css`.
- Tests: `tests/server/presets.test.js`, `tests/unit/presets.test.js`, `tests/e2e/presets.spec.js`; `tests/e2e/proposal.spec.js` (strength locator scoped).
- Tooling: `scripts/scan-artifacts.js` (PUT log lines).

## Limitations
- **Preferences** are deliberately few: two shelves and a starting strength. They are explicit numbers you set; nothing is learned from your decisions.
- **Remembered decisions** are a record for you; no proposal uses them yet.
- **Presets need an account and the server.** Settings files (LAS-28) still work without either. Presets are not shared between accounts.
- **Proposal guards:** a preference shelf adds to a proposal's EQ and is not counted in the proposal's +6 dB curve guard. It is bounded to ±4 dB on its own, and **Check at this strength** measures the result.
- Styling is provisional until the LAS-44/45 design gates. Linux Chromium only; not run on Mac/Chrome.
