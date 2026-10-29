# LAS-42 — UI audit and visual direction (design review gate)

Jira: [LAS-42](https://genstek69.atlassian.net/browse/LAS-42) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-42.md` · Mode: DESIGN_REVIEW_REQUIRED

Branch `design/LAS-42-ui-audit` · audited application commit `c7a705bb2bea968a54127459dca32257f68dc7b6` (delivery tip after LAS-20; same UI as all foundation work)

Developer status: **BLOCKED** on Gennady's design decision — the audit, brief and two directions are prepared; **no direction is chosen and no final theme is assumed** · Gennady's choice: **PENDING** · Jira sync: **SYNC_PENDING**

## What is prepared
1. **Audit** of the current studio with measurements and annotated screenshots — [`audit.md`](audit.md), `evidence/audit/`.
2. **Design brief** (audience, tasks, targets, references, brand assets, checkpoints) — [`design-brief.md`](design-brief.md).
3. **Two meaningfully different directions**, as static browser mockups you can open locally:
   - **A — Console** (`docs/design/LAS-42/direction-a-console.html`): dark graphite hardware desk; vertical strips with knobs, faders and LED meters; amber VU; A/B/REF switch beside a waveform; master section on the right.
   - **B — Focused workstation** (`docs/design/LAS-42/direction-b-workstation.html`): light, flat, waveform-first; left navigation (Master, Mix/stems, References, Presets, Export); module tabs with a large EQ curve; right inspector with exact numeric fields and loudness readouts; transport bar at the bottom.
   Screenshots at 1440×900 and 1280×720: `evidence/directions/`. All numbers in the mockups are placeholders, not measurements; nothing in them works.

## Comparison
| | A — Console | B — Focused workstation |
| --- | --- | --- |
| Feel | Analog studio desk, tactile | Calm, modern, document-like |
| Main focus | All modules visible as strips at once | One module at a time with large, precise editing |
| EQ editing | Knobs per band; graph needs a separate inspector | Large draggable curve plus exact fields |
| Many bands (24 per channel, LAS-27) | Hard to show; needs paging or an extra panel | Natural: curve shows all bands, list/inspector edits one |
| Small windows (761×450) | Strips must compress; risk of tiny knobs | Navigation collapses; inspector can become a drawer |
| Readability | Dark theme with small labels is the risk to manage | High contrast, larger text by default |
| Matches historical UX spec | Yes (docs/UX_DESIGN.md "Analog Console") | Partly (inspector, numeric precision) |
| Implementation cost | Higher: custom knob/fader/VU drawing and keyboard handling | Lower: standard controls plus one EQ canvas |

Developer note (not a decision): B fits the 24-band EQ and reference-matching work better; A fits the historical "console" intent. A hybrid (B's structure with A's dark palette) is also possible. **Gennady decides.**

## Decision record
| Date | Decision | By |
| --- | --- | --- |
| — | Pending: choose A, B, a hybrid or new references | Gennady |

Until a direction is chosen: no theme, console style or branding is implemented; LAS-43 wireframes stay structure-only (greyscale) and LAS-44 high-fidelity design does not start. Independent backend and DSP work continues.
