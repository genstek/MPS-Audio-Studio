# LAS-46 — Implement the approved mastering, reference, stem and export workflows

Jira: [LAS-46](https://genstek69.atlassian.net/browse/LAS-46) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-46.md` · Mode: GATED_IMPLEMENTATION · Prerequisites: LAS-45 (BLOCKED), LAS-28, LAS-33, LAS-35 (READY_FOR_QA)

Developer status: **BLOCKED** · Gennady design approval: **PENDING** (none recorded) · Jira sync: **SYNC_PENDING**

## Why it is blocked
LAS-46 moves the working workflows into the **approved** navigation and shared components:
- analysis, EQ/dynamics, references, proposals, stems and export.

That design does not exist yet:
- LAS-45 (approved shell and components) is blocked on LAS-44;
- LAS-44 waits for the LAS-42 visual direction and the LAS-43 wireframe walkthrough.

The work order keeps Gennady's design/review gate and forbids inventing approval. So no redesign or re-navigation was started.

## What exists meanwhile (functional, provisional styling)
| Workflow | Where it lives today | Delivered by |
| --- | --- | --- |
| Import, play, pause, stop, remove | Tracks and Transport panels | LAS-7 to LAS-12, LAS-57 |
| Analysis report | Tracks → Analyze | LAS-26 |
| EQ, dynamics, limiter, undo/redo, Processed/Original, loudness matching, export | Mixer and Master panels | LAS-27, LAS-28 |
| References and profiles | masthead → References | LAS-30 |
| Comparison, level-matched monitor, proposal with strength/preview/apply/undo | Tracks → Compare | LAS-31, LAS-32 |
| Presets, preferences, remembered decisions | Mixer → Settings…, proposal panel | LAS-33 |
| Stems with per-stem chains, session recall, stem master render | Mixer → Stems… | LAS-34, LAS-35 |

Each workflow already shows its identity (original, processed or reference), level matching, undo, progress and errors, with browser tests. LAS-46 will place them in the approved navigation without changing their engine behaviour.

## To unblock
1. Gennady chooses the LAS-42 direction, walks through LAS-43 and approves LAS-44.
2. LAS-45 restyles the shell and components.
3. Then LAS-46 integrates the workflows above into the approved navigation, with task-based tests for new and returning users and screenshots that match real behaviour.
