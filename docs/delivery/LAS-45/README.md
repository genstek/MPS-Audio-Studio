# LAS-45 — Approved studio shell, mixer controls and shared account components

Jira: [LAS-45](https://genstek69.atlassian.net/browse/LAS-45) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-45.md` · Mode: GATED_IMPLEMENTATION · Prerequisites: LAS-44 (BLOCKED), LAS-21 (READY_FOR_QA)

Developer status: **BLOCKED** · Gennady design approval: **PENDING** (none recorded) · Jira sync: **SYNC_PENDING**

## Why it is blocked
LAS-45 implements the **approved** shell and components. No approved design exists:
- LAS-44 (design system and hi-fi screens) is itself blocked on the LAS-42 visual direction and the LAS-43 wireframe walkthrough.

The work order says not to treat the existing prototype, or any agent-made mockup, as approved. So no reskin was started.

## What continues meanwhile
Functional, non-visual controls proceed under their own tickets, as the work order allows:
- **LAS-28** added working EQ, dynamics, limiter, A/B and export controls in the current, provisional styling.
- Those controls keep their accessible names and the LAS-48/LAS-51 responsive layout and tests.

When a design is approved, LAS-45 restyles them; it does not rebuild their behaviour.

## To unblock
Gennady chooses a LAS-42 direction, walks through LAS-43, and approves LAS-44. Then: reskin the shell, mixer controls and account dialogs to the approved specification, keeping accessible names, engine behaviour and the LAS-48 responsive rules, and compare against the approved designs at the agreed viewports.
