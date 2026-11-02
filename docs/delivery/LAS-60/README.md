# LAS-60 — New Project action (bug: static "Untitled project" heading)

Jira: [LAS-60](https://genstek69.atlassian.net/browse/LAS-60) · Sprint 10 package · Mode: IMPLEMENT (bug fix; prerequisite of [LAS-69](../LAS-69/README.md))

Branch `delivery/LAS-40-sprint-10` · implementation commit `6793920` · tested application commit `TESTED_COMMIT`

Developer status: **READY_FOR_QA** (proposed) · Gennady manual retest: **NOT_RUN**

## Reproduction at the baseline
At `0296386` the transport's project area renders `<p class="eyebrow">SESSION 001</p><h2>Untitled project</h2>` (static markup in `src/main.jsx`); there is no button, menu or dialog for creating a project. Reproduced by source inspection and in the baseline screenshots; the user's report (screenshot 18.49.49) matches.

## Fix
The "SESSION 001" line of the project area now holds two compact buttons — **+ New** (accessible name "New project") and **Project ▾** (Open / Save / Save As, LAS-69) — and the heading shows the current project's name (ellipsis for long names, full name in the tooltip). The header shows the project's save state ("Not saved yet", "Unsaved changes", "Saved to …").

Flow:
1. **New project** (click, Enter or Space) opens a modal dialog with **Project name**, **Create** and **Cancel**.
2. An empty or whitespace-only name shows "Enter a project name." and nothing happens. Control characters are removed and the name is limited to 100 characters.
3. **Cancel** (or Escape) closes the dialog; the workspace is unchanged.
4. **Create** on a session with work in it (a track, stems, a missing-audio list or unsaved changes) asks **Save / Discard / Cancel** ("Save changes to “Untitled project”?"); Cancel keeps everything; Save saves first (LAS-69) and continues only if the save succeeded; Discard continues. A session without work goes straight on.
5. The new project has a new identity and the typed name, no audio (track and stems leave the session; files on the device are never touched), default processing (chain defaults, empty undo history), closed editor windows, Processed listening. Master Level (a listening preference, LAS-68) is kept.

The compact buttons were sized so the 761×450 desktop still fits without page scrolling (LAS-48/51 essentials suite).

## Validation
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| New Project visible and operable by mouse and keyboard | focus + Enter opens the dialog | PASS | `tests/e2e/project.spec.js` |
| Dialog with name, Create, Cancel | roles and names | PASS | same |
| Create initialises and shows the name | "Album master" (trimmed) in the project area; defaults; no audio; editors closed | PASS | same |
| Empty / whitespace names validated | alert "Enter a project name." twice | PASS | same |
| Cancel preserves the workspace | track still loaded | PASS | same |
| Nonempty session asks before discarding | Save/Discard/Cancel; Cancel keeps the track and name; Discard replaces; empty session not asked | PASS | same |
| Layout regressions | 761×450 … 1920×1080 matrix | PASS | `LAS51-layout.spec.js`, `LAS48-coverage.spec.js` |

Manual retest: [`manual-qa.md`](manual-qa.md) — **NOT_RUN**.
