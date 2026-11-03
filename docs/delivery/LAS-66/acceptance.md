# LAS-66 — Sprint 10 acceptance and regression coverage matrix

Each row maps an acceptance criterion from the Sprint 10 package to the automated test that checks it.

- **Status column:** shows the developer result on the final tested commit, recorded in [`README.md`](README.md).
- **Manual, design and listening checks:** Gennady's checks are listed separately in [`manual-qa.md`](manual-qa.md). They are all **NOT_RUN**.
- **Fixtures:** all audio fixtures are synthetic and deterministic:
  - `tests/fixtures/wav.js` generates sine, left-only, right-only and mono WAVs at a set level and length.
  - `tests/fixtures/large-wav.js` writes WAVs of an exact byte size.
  - `tests/unit/space.test.js` generates noise and impulses with a fixed seed.

Notation:
- `e2e` is Playwright in `tests/e2e/`.
- `unit` is Vitest in `tests/unit/` or `tests/server/`.
- `G` means Gennady's manual case (NOT_RUN).

## LAS-61 / LAS-62 — movable, concurrent editor windows
| Criterion | Automated check | Status |
| --- | --- | --- |
| EQ, Dynamics, Limiter (and Space) open at the same time; each edit reaches only its processor | e2e `editor-windows.spec.js` "EQ, Dynamics and Limiter stay open together…" (chain-probe parameter comparison) | PASS |
| Opening an open editor focuses it instead of duplicating it | same test | PASS |
| Drag by the title bar while playing; click brings the window to the front; position kept on reopen | e2e "windows move by their title bar while playing…" | PASS |
| Keyboard positioning (grip + arrows), Escape closes the focused window only, Reset window layout, recovery after the viewport shrinks | e2e "keyboard positioning, Escape on the focused window, Reset window layout and resize recovery" | PASS |
| Phone-size viewport: every window keeps its title and close button reachable; transport usable | e2e "on a phone-sized screen every open window…" | PASS |
| Parameter isolation per window; Undo is one chain-wide history (documented LAS-28 scope: Undo in any window reverts the newest edit) | e2e `editor-windows.spec.js` | PASS |
| Window layout saved with the project | e2e `project.spec.js` "Save, Save again, Save As, reopen…" (layout restored) | PASS |
| Visual design of the windows | Design gate (LAS-44/45) | PENDING (G) |

## LAS-63 — configured state and previews without playback
| Criterion | Automated check | Status |
| --- | --- | --- |
| Cards show on/bypassed/edited without playback; bypassed cards keep their configured shape | e2e `previews.spec.js` "without playback, cards show on/bypassed and edited state…" | PASS |
| Edits animate through intermediate shapes and end on the configured shape; animation sends no settings | same test (MutationObserver on the curve; parameter message count) | PASS |
| Undo and presets update the shape and state | same test | PASS |
| Reduced motion: one jump, no intermediate frames | e2e "with reduced motion the shape changes at once…" | PASS |
| Preview curves equal the DSP gain computers at steady levels | unit `previews.test.js` (compressor, limiter) | PASS |
| "edited" marks exactly the modules that differ from the defaults | unit `previews.test.js` | PASS |
| Real meters stay idle when stopped/paused and follow the signal when playing (no fabricated animation) | e2e "gain-reduction meters are idle while stopped or paused…" | PASS |
| 360 px phone with every card edited has no sideways scroll | e2e "with every card edited, a 360 px phone…" | PASS |

## LAS-64 — Space reverb, DSP and export parity
| Criterion | Automated check | Status |
| --- | --- | --- |
| Settings schema v2, Space before the limiter, defaults off, presets valid; v1 files migrate with Space off | unit `space.test.js` "LAS-64 Space settings"; unit `chain.test.js`, `presets.test.js`; e2e `presets.spec.js` (legacy v1 import) | PASS |
| Bypassed Space is bit-identical | unit `space.test.js` | PASS |
| Pre-delay exact; RT60 within 10 % at 44.1/48/96 kHz; damping shortens only the high-frequency tail | unit `space.test.js` | PASS |
| Stereo decorrelation at equal level; mono stays mono; mix 0 %/100 % exact; dry path aligned | unit `space.test.js` | PASS |
| Stability: no NaN/Infinity/runaway with extreme settings for 20 s; smooth parameter changes | unit `space.test.js` | PASS |
| Preview equals export at any block size; the tail option only appends; reset clears the tail | unit `space.test.js`; e2e `space.spec.js` "the export equals the offline chain with Space, with the tail included or cut" | PASS |
| Editor applies presets/values to the running chain; undo restores them | e2e `space.spec.js` | PASS |
| Reverb measurable at the speakers after the tone stops; silence stays silent with Space off | e2e `space.spec.js` | PASS |
| No change to existing renders | `npm run dsp:regression` (golden v2: 96 existing renders unchanged, new Space renders added) | PASS |
| Real-time performance | unit `space.test.js` performance (measured, logged) | PASS (measured) |
| Sound quality | Listening | NOT_RUN (G) |

## LAS-65 / LAS-44 / LAS-45 — design
| Criterion | Check | Status |
| --- | --- | --- |
| LAS-65 research with cited sources; two processor proposals | Document review (`docs/design/LAS-65/`) | DONE (for review) |
| LAS-44 design system and two whole-studio proposals, player variants | Document review (`docs/design/LAS-44/`) | DONE (for review) |
| Gennady's selection of a design | — | PENDING (G) |
| LAS-45 implementation of the approved design | Blocked: no approved design | BLOCKED |
| A future reskin keeps behaviour | The whole regression below is the reference a reskin must pass | Ready |

## LAS-60 / LAS-69 — project create, save, open, section presets
| Criterion | Automated check | Status |
| --- | --- | --- |
| New project: name validation, Cancel keeps the session, unsaved work protected | e2e `project.spec.js` "New project asks for a name…" | PASS |
| Save → Save again → Save As isolation → reopen after a restart with relink; settings, stems, layout, media identity (SHA-256) | e2e "Save, Save again, Save As, reopen after a restart with relink…"; unit `project.test.js` | PASS |
| Cancelled/failed saves keep the session and the last file; edits made while saving stay unsaved; corrupt/newer/foreign files refused | e2e "cancelled and failed saves…"; unit `project.test.js` | PASS |
| No File System Access API: Save downloads, Open uses the file picker | e2e "without the File System Access API…" | PASS |
| Section presets: one module only, one undo step; wrong module/whole files refused | e2e "section presets save and load one module only…"; unit `module-presets.test.js` | PASS |
| Leaving with unsaved changes asks first | e2e "leaving the page with unsaved changes asks first" | PASS |
| Native (macOS/iOS wrapper) save/open dialogs | Not in scope of this web build (PR #43 / LAS-58 kept separate) | NOT_RUN |
| Cloud save privacy | No cloud project save exists; projects are local files | Not applicable |

## LAS-67 — player
| Criterion | Automated check | Status |
| --- | --- | --- |
| FF/RWD ±5 s per click, clamped, while paused and playing, one source | e2e `player.spec.js` | PASS |
| Hold-to-seek every 200 ms after 400 ms; stops at the end; Play from the end restarts at 0 | e2e `player.spec.js` | PASS |
| Timeline seeks by keyboard and pointer, playing and paused | e2e `player.spec.js` | PASS |
| Needles and bars follow the real output: L-only, R-only, mono, Master Level, silence, pause | e2e `player.spec.js` | PASS |
| Clip indicator only at full scale at the speakers; reset on click | e2e `player.spec.js` | PASS |
| Spectrum draws the real output; "no signal" when silent; frame gaps bounded | e2e `player.spec.js` | PASS |
| Replacement/unload during rapid seeking | e2e `player.spec.js` | PASS |
| 360 px phone: fits, every control reachable | e2e `player.spec.js`; LAS-51 essentials include RWD/FF/timeline | PASS |
| Visual look (tape deck A vs hybrid B) | Design gate (LAS-44) | PENDING (G) |

## LAS-68 — Master Level
| Criterion | Automated check | Status |
| --- | --- | --- |
| 0 dB, −6 dB, mute measured at the speakers in both A/B paths without interrupting playback | e2e `master-level.spec.js` | PASS |
| L-only, R-only and mono attenuated equally | e2e `master-level.spec.js` | PASS |
| Kept through pause/stop/editors/replacement/unload/reload; never changes the exported WAV | e2e `master-level.spec.js` | PASS |
| One Master Level for the stem mix | e2e `master-level.spec.js` | PASS |
| Gain law and routing | unit `monitor-bus.test.js` | PASS |

## LAS-70 — contextual help
| Criterion | Automated check | Status |
| --- | --- | --- |
| 3 s hover, early leave cancels, immediate click, one popover at a time | e2e `help.spec.js` (fake clock) | PASS |
| Keyboard, focus return, Escape, screen-reader names | e2e `help.spec.js` | PASS |
| No accidental control activation | e2e `help.spec.js` | PASS |
| Real help links to every entry; inventory icons present | e2e `help.spec.js` | PASS |
| Viewport bounds and z-order over editor windows; timers cancelled | e2e `help.spec.js` | PASS |
| Wording, VoiceOver, touch | Manual | NOT_RUN (G) |

## LAS-71 — 250 MiB limit
| Criterion | Automated check | Status |
| --- | --- | --- |
| 262,144,000 bytes imports and plays; +1 byte refused, track kept | e2e `upload-limit.spec.js` | PASS |
| Stems and references use the same limit | e2e `upload-limit.spec.js` | PASS |
| Server gate at limit − 2, limit, limit + 1; clean 413 before the body | unit `tests/server/upload-limit.test.js` | PASS |
| Large-file load/play/export timings and memory | `scripts/large-file-check.js` → `docs/delivery/LAS-71/evidence/large-file-check.json` | Measured |
| LAS-59 macOS ECONNRESET on the streamed oversize test | Not reproducible on Linux; no macOS here | NOT_RUN |

## Retained regressions
| Area | Check | Status |
| --- | --- | --- |
| LAS-48/51 viewport matrix (761×450 … 1440×900, 360/390 phones), essentials before scrolling, keyboard scroll | e2e `LAS48-coverage.spec.js`, `LAS51-layout.spec.js`, `LAS51-responsive.spec.js`, `responsive.spec.js` | PASS |
| Transport, import, Pause toggle, unload, playback recovery | e2e `transport-position`, `pause-toggle`, `import-*`, `unload-track`, `playback` | PASS |
| LAS-28 mastering controls, export, presets, analysis, compare, proposal, stems, accounts, library, local-only | the remaining e2e specs | PASS |
| Lint, unit, build, artifact scan, DSP regression | `npm run check`, `npm run scan:artifacts`, `npm run dsp:regression` | PASS |
