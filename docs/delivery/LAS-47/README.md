# LAS-47 — Review usability, accessibility and visual consistency across the redesigned studio

Jira: [LAS-47](https://genstek69.atlassian.net/browse/LAS-47) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-47.md` · Mode: QA_REVIEW_REQUIRED · Prerequisites: LAS-46 (BLOCKED), LAS-48 (READY_FOR_QA)

Developer status: **BLOCKED** · Gennady final review: **PENDING** (not prefilled) · Jira sync: **SYNC_PENDING**

## Why it is blocked
LAS-47 reviews the **redesigned** studio: task journeys, keyboard and focus, accessible names, contrast, targets and visual snapshots. The redesign does not exist yet, because LAS-46 is blocked on the approved design (LAS-42 → 43 → 44 → 45). Gennady's final verdict is his to give and is not prefilled.

## What already exists for the current UI (evidence, not this review)
Each delivered slice checks its own accessibility basics in browser tests. These are developer checks of the provisional UI, not the LAS-47 review:
- **Names and roles:** controls are reached by role and accessible name (every e2e spec).
- **Keyboard:** EQ keyboard editing, Escape closes editors with focus returned, keyboard scrolling with a visible focus ring (LAS-28, LAS-51).
- **Live regions:** status lines use `aria-live` or `role=status`.
- **Layout:** no horizontal page scroll at 360 px, plus dialog fit checks (LAS-31 to LAS-35); the LAS-48 matrix covers continuous resize and 125/200 % zoom-equivalent sizes.
- **Defects found and fixed this way:**
  - file pickers outside or overlapping dialogs at 360 px (LAS-30, LAS-28 Settings);
  - low-contrast picker labels (Settings, Stems);
  - a masthead button that overflowed 761×450 (LAS-34).

## To unblock
When LAS-46 is in place:
- run the task review (registration, import, playback, processing, reference comparison, stems, undo, export) with severities;
- do keyboard, focus, contrast and target checks;
- take visual snapshots at the documented sizes, masking only meters and time;
- check zoom at 100/125/200 % and DPI by hand;
- then record Gennady's review against the approved brief.
