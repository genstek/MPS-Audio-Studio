# LAS-63 — Processor settings and animated previews shown even when playback is stopped

Jira: [LAS-63](https://genstek69.atlassian.net/browse/LAS-63) · Sprint 10 package · Mode: IMPLEMENT (enhancement; the original "only EQ animates" defect reading is **withdrawn** per Gennady's correction — live meters already work while playing)

Branch `delivery/LAS-40-sprint-10` · implementation commits `569eb45`, phone fix `f9d5ccb` · tested application commit `TESTED_COMMIT`

Developer status: **READY_FOR_QA** (proposed) · Gennady manual QA: **NOT_RUN**

## What changed
Two kinds of graphics, kept apart on purpose:

| Kind | What it shows | When it moves | Source |
| --- | --- | --- | --- |
| **Configured shape** (new for Dynamics and Limiter; EQ and Space eased) | EQ response curve; compressor transfer curve with threshold and knee markers and makeup; limiter in→out curve flattened at the ceiling (with input gain); Space decay envelope with pre-delay, high-frequency damping and dry/wet bar | Only when a setting changes: a 180 ms ease to the new shape (none under `prefers-reduced-motion`); then it stays | computed from the settings (`src/previews.js`, `ProcessorPreviews.jsx`) |
| **Measured signal** (unchanged, LAS-28) | gain-reduction meters, EQ live spectrum | Only while audio plays; idle (0) when stopped, paused or silent | AudioWorklet meters / analyser |

Every card now shows, without playback:
- an **LED** with an accessible name ("Dynamics on" / "Dynamics bypassed") and `data-state`;
- the configured shape, kept visible in grey when the processor is **bypassed**;
- an **"edited"** tag when the module differs from the shipped defaults.

Editors show the same configured graphs large: Dynamics has a labelled transfer curve ("threshold −40.0 dB · 2.0:1 · knee 6.0 dB"), Limiter a ceiling curve, Space its decay graph (LAS-64), EQ its existing curve. Because every graph is derived from the one chain state, changes made by pointer, keyboard, presets, undo/redo, settings files and project open (LAS-69) all update cards and open editors together.

**No continuous idle/demo animation** was added: the package lists it as a design option for review, not an approved feature. Nothing animates unless a setting changes or audio plays.

Shared feedback: strip hover raises the indicator border, focus inside a strip tints it, the Edit button of an open editor has a blue border (LAS-62), disabled controls keep the existing 58 % opacity.

## Truthfulness
`tests/unit/previews.test.js` feeds steady signals through the real chain and checks the drawn curves: compressor output equals the curve within 0.05 dB at seven levels (threshold −24, 4:1, 8 dB knee, +3 dB makeup); limiter output equals the curve at five levels (+6 dB input, −3 dBTP ceiling).

## Validation
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| Enabled/bypassed and "differs from default" on every card, independent of playback | defaults: EQ/Limiter on, Dynamics/Space bypassed, no "edited"; after edits the tag appears; after undo it goes | PASS | `tests/e2e/previews.spec.js` |
| Enable + edit while stopped updates the graph immediately; shape kept after the edit | no track loaded; curve changes; same after 300 ms | PASS | same |
| EQ / Dynamics / Limiter / Space previews react to edits | Dynamics threshold, Space preset (browser); all four components eased (code) | PASS | same |
| Short parameter-driven transition | > 3 intermediate shapes recorded by a MutationObserver | PASS | same |
| Reduced motion | exactly one jump, no intermediate frames | PASS | same |
| Real meters truthful when stopped/paused | GR meter 0 while stopped with heavy settings; > 10 dB while playing a −1 dBFS tone; back to 0 after Pause | PASS | same |
| Presets, undo/redo sync | Space preset; two undos restore shape/state/tag | PASS | same |
| Visual updates never change audio parameters | no settings messages during the transition | PASS | same |
| Curves match the DSP | steady-signal comparison | PASS | `tests/unit/previews.test.js` |

Before/after video: not recorded (no screen recorder in this container); screenshots in [`evidence/`](evidence/).

## Limitations
- Card graphics are small (46 px) in the provisional layout; LAS-65/44 propose larger card graphs.
- The EQ card shows the left/linked curve only; independent right-channel curves are in the editor.
- Manual QA: [`manual-qa.md`](manual-qa.md) — **NOT_RUN**.
