# LAS-44 — Design system and approved high-fidelity studio screens

Jira: [LAS-44](https://genstek69.atlassian.net/browse/LAS-44) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-44.md` · Mode: DESIGN_REVIEW_REQUIRED · Prerequisite: LAS-43 (walkthrough pending), which builds on LAS-42 (visual direction pending)

Developer status: **BLOCKED** · Gennady design approval: **PENDING** (none recorded) · Jira sync: **SYNC_PENDING**

## Why it is blocked
The work order asks for tokens, components and high-fidelity screens "based on the chosen LAS-42/43 direction". Neither choice exists yet:
- **LAS-42:** two visual directions are prepared (`docs/design/LAS-42/direction-a-console.html`, `direction-b-workstation.html`); Gennady has not chosen one.
- **LAS-43:** the greyscale clickable wireframes (`docs/design/LAS-43/wireframes.html`) await his walkthrough and feedback.

Drawing high-fidelity screens before those decisions would mean inventing the approval the gate exists to collect, so no hi-fi screens or design system were produced. Nothing here is approved.

## What continues meanwhile (not blocked)
- Real controls keep using the current, provisional styling and the existing responsive rules (PR #8 and LAS-48/49 tests). The work order says approval gates the final reskin, not responsive maintenance.
- Direction-independent interaction rules needed by the code are specified where the code is written. Example: the LAS-28 EQ pointer mapping, keyboard steps and hit areas, documented in `docs/delivery/LAS-28/` when that slice is delivered. LAS-44 will adopt or restyle them once a direction is chosen.

## To unblock
1. Gennady chooses direction A or B (or asks for changes) in LAS-42.
2. Gennady walks through the LAS-43 wireframes and records feedback.
3. Then: tokens (colour/contrast, type, spacing, layout, icons), component states (default/hover/focus/disabled/error/loading, keyboard), and hi-fi screens (shell, account, mixer, analysis/EQ, reference, stems, export) at the agreed viewports. These go to Gennady for explicit approval.
