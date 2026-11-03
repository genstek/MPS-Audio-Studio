# LAS-45 — Approved studio shell, mixer controls and shared account components

Jira: [LAS-45](https://genstek69.atlassian.net/browse/LAS-45) · Sprint 10 package · Mode: GATED_IMPLEMENTATION · Prerequisites: LAS-44 approval (**PENDING**), LAS-21 (READY_FOR_QA)

Developer status: **BLOCKED** — no reskin started · Gennady design approval: **PENDING** (none recorded) · Jira: left in To Do (not started); label `blocked`

## Status (Sprint 10)
The package states LAS-45 "is documented as no reskin started, blocked on approved designs. It is not a finished hidden redesign awaiting merge." That remains true:
- LAS-65 and LAS-44 now offer concrete proposals (processor cards/editors, two whole-studio directions, two player variants, design tokens and component states), all **pending Gennady's selection**.
- Without a selection, applying any of them would invent the approval the gate exists to collect, so the studio keeps its provisional styling.

## What is ready for LAS-45 once a design is chosen
- Working behaviour to restyle, not rebuild: LAS-28 editors, LAS-61/62 windows, LAS-63 configured graphs, LAS-64 Space, LAS-67 player and meters, LAS-68 Master Level, LAS-60/69 project area, LAS-70 ⓘ help.
- Tokens prepared as CSS custom properties (`docs/design/LAS-44/tokens.css`) that can replace the hard-coded colours in `src/styles.css` without changing component behaviour.
- Accessible names and test selectors are stable (role/name based, now exact where needed), and the LAS-48/51 layout matrix includes the Sprint 10 essentials (RWD, FF, timeline), so a reskin is checked against the same rules.

## To unblock
Gennady selects a LAS-44 proposal (and a LAS-67 player variant) or requests changes; then LAS-45 restyles the shell, mixer controls and account dialogs to that selection and compares them at the agreed viewports.

Records: [`acceptance.md`](acceptance.md) · [`manual-qa.md`](manual-qa.md) (**NOT_RUN**, starts after a design is selected) · [`results.json`](results.json) · [`jira-update.md`](jira-update.md).
