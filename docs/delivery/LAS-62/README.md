# LAS-62 — Open EQ, Dynamics, Limiter and Space editors independently at the same time

Jira: [LAS-62](https://genstek69.atlassian.net/browse/LAS-62) · Sprint 10 package · Mode: IMPLEMENT · depends on [LAS-61](../LAS-61/README.md) window management (same commit)

Branch `delivery/LAS-40-sprint-10` · implementation commit `ce72cd4` (Space editor added in the LAS-64 commit) · tested application commit `TESTED_COMMIT`

Developer status: **READY_FOR_QA** (proposed) · Gennady manual QA: **NOT_RUN**

## Behaviour
- Before: one `editor` state in the mixer — opening Dynamics replaced EQ (Gennady's recording 19.04.14).
- Now: each editor (EQ, Dynamics, Limiter, Space) has its **own open state, position and stacking order**. Opening one leaves the others open.
- Opening an editor that is already open **brings it to the front and focuses its Close button**; it is never duplicated (the strip's Edit button gets a blue border while its editor is open).
- Closing one leaves the others, their values and positions unchanged, and **never changes processing** (no settings message is sent on close; the processor stays on).
- Edits go to the processor of the window they are made in (each editor writes only its own module).
- **Escape** closes the window that has focus; with focus on the page it closes the front window only. Focus returns to the strip button that opened it.
- The transport and the Processed/Original switch stay usable: windows are non-modal and open below the transport.

## Documented scope of Undo/Redo, A/B and bypass (unchanged, no cross-window leakage)
- **Undo/Redo** is one history for the whole chain (LAS-28): the Undo button in any editor undoes the newest edit, whichever window it was made in. This is the existing documented scope; per-window histories are not introduced. Tested: after edits in Dynamics, Limiter and EQ, Undo in the Dynamics window reverts the EQ edit (the newest) and leaves the Limiter value.
- **Processed/Original** in every editor header is the one global listening switch.
- **On/bypass** checkboxes belong to their module only.

## Validation
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| All three (four with Space) open together | open Limiter, EQ, Dynamics → 3 dialogs open | PASS | `tests/e2e/editor-windows.spec.js` |
| Own open state; reopening focuses without duplication | count stays 3; Close Limiter focused; Limiter in front | PASS | same |
| Closing one leaves others, values and positions | EQ box unchanged; Limiter ceiling still −2.0; no settings sent | PASS | same |
| Edits reach the correct processor | compressor on, limiter ceiling −2, EQ off arrive in the chain | PASS | same |
| Undo/redo/A-B scope | undo reverts the newest edit only | PASS | same |
| Closing never disables the processor | compressor still enabled after closing Dynamics | PASS | same |
| Focus/z-order/Escape; transport usable | Escape closes the focused window, focus returns to its Edit; Play/Pause with three windows open at 390×844 | PASS | same |
| Export keeps current settings | LAS-28/LAS-64 export parity tests with editors open | PASS | `mastering-controls.spec.js`, `space.spec.js` |

Manual QA: [`manual-qa.md`](manual-qa.md) — **NOT_RUN**.
