# LAS-70 — Contextual ⓘ hints with linked help

Jira: [LAS-70](https://genstek69.atlassian.net/browse/LAS-70) · Sprint 10 package · Mode: IMPLEMENT (shared styling to be finalised with LAS-44/45)

Branch `delivery/LAS-40-sprint-10` · implementation commit `1146068` · tested application commit `2c5d0ce`

Developer status: **READY_FOR_QA** for the covered controls (proposed); **coverage is partial** in older dialogs (see inventory) · Gennady manual QA: **NOT_RUN**

## What the user gets
- An **ⓘ** next to each covered control: a small circular button that sits on the corner of compact buttons (transport, headings, strips, Export) or inline after labels (editors, Master Level, Listen to, Match loudness). It is never part of the control or its label, so using it cannot press, move or toggle the control.
- **Hover the ⓘ for 3 seconds** → a popover opens; leaving earlier cancels. **Click, tap, Enter or Space** → opens at once.
- The popover is a **non-modal dialog** (not a native tooltip) with the exact function name, one or two plain sentences (what it does, when to use it, units/consequences where useful) and a link **"More about <name> →"**.
- The link opens **Studio help**, an in-app view with a chapter per area and an article per function, scrolled to and focusing that article. Playback, the project and all settings keep running; **×** or Escape returns focus to the ⓘ. A **Help** button in the header opens the same view at the top.
- The pointer can move from the ⓘ onto the popover and its link; leaving both closes it after 250 ms. **Escape** closes and returns focus to the ⓘ (and does not close the editor window behind it). A **click outside** closes it.
- **One popover at a time**; pending hover timers are cancelled when the ⓘ disappears (e.g. its editor closes).
- Placement stays inside the viewport (below the ⓘ, or above when there is no room; clamped at the sides; 280 px max or narrower on phones) and above editor windows (z-index 1000).
- Accessible names: "Help for <name>", e.g. "Help for Limiter ceiling". The Limiter ceiling hint follows Gennady's example.

Coverage inventory (control → hint → help anchor, and the gaps): [`coverage-inventory.md`](coverage-inventory.md). **62 functions covered**, including all Sprint 10 controls (project, player, Master Level, Space, section presets, windows). Parameter-level icons inside the older dialogs (Stems, Compare, References, Account, Settings, Analyze) are **not yet** added; those dialogs have a dialog-level ⓘ only.

## Test-suite change caused by this feature
- Every ⓘ is a button named "Help for <control>", and Playwright's default name matching is substring-based. About 130 existing locators such as `getByRole('button', { name: 'Play' })` therefore became ambiguous.
- Those locators now match exactly (`exact: true`; 137 additions in 30 spec and helper files), which is stricter.
- The transport glyphs (▶ Ⅱ ■) are `aria-hidden`, so the buttons' names are exactly "Play", "Pause" and "Stop".
- Two keyboard walks account for the extra Tab stops the ⓘ buttons add:
  - LAS48-TC-011 tabs from Play until Stop has focus (at most 6 presses) instead of exactly one.
  - LAS-51's loop cap that reaches the mixer scroller rises from 12 to 40 presses. It only bounds the loop; the scroller must still receive focus.
- No assertion was removed or weakened.

## Validation
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| 3 s hover, early-leave cancels (deterministic fake clock) | closed at 2.9 s, open at 3.05 s; leave at 2 s → still closed at 5 s | PASS | `tests/e2e/help.spec.js` |
| Immediate click/tap; one at a time; click outside closes | Master level then Export WAV → one popover; outside click closes | PASS | same |
| Name, short explanation, real detailed link | Play, Master level, Export WAV, Limiter ceiling texts; "More about Decay (RT60)" opens and focuses `#help-space-decay` | PASS | same |
| Every help entry has a real anchor | 62 anchors present in the Help view | PASS | same |
| No accidental activation; hover does not change values | ⓘ next to Play leaves "Ready"; ⓘ next to Limiter on leaves it checked; Master level unchanged after hover/ⓘ; chain unchanged | PASS | same |
| Focusable popover, pointer can reach the link | hover to the link keeps it open | PASS | same |
| Keyboard, Escape and focus return, names | Enter opens, Tab reaches the link, Escape returns focus; window stays open | PASS | same |
| Viewport and editor windows | inside 360×780; topmost over the Limiter window | PASS | same |
| Timers cancelled on unmount | hover, close the editor, no popover after 4 s | PASS | same |
| Inventory icons present | 29 studio controls + 32 editor controls checked by name | PASS | same |
| Help keeps playback | status stays Playing while help is open and after closing | PASS | same |
| No layout regression | LAS-48/51 matrix incl. 761×450 | PASS | final check |

## Limitations
- Styling of the ⓘ and popover is provisional (LAS-44/45 own the final look).
- Coverage gaps listed in the inventory; content is English like the studio UI.
- Real touch devices and screen readers (VoiceOver) were not run; manual QA covers them.
- Manual QA: [`manual-qa.md`](manual-qa.md) — **NOT_RUN**.

## Evidence on the tested commit `2c5d0ce`
- Test results: [`evidence/test-log-2c5d0ce.txt`](evidence/test-log-2c5d0ce.txt), an extract of [`../sprints/10/final/`](../sprints/10/final/). The full `npm run check` exited 0: Playwright 119/119 and Vitest 313/313.
- Screenshots (Chromium 153, headless, synthetic tone; the viewport is in each file name): [`popover-limiter-ceiling-1440x900.png`](evidence/popover-limiter-ceiling-1440x900.png), [`popover-phone-360x780.png`](evidence/popover-phone-360x780.png), [`studio-help-at-limiter-ceiling-1440x900.png`](evidence/studio-help-at-limiter-ceiling-1440x900.png)
- Records: [`results.json`](results.json) · [`jira-update.md`](jira-update.md) · [`manual-qa.md`](manual-qa.md) (**NOT_RUN**)
