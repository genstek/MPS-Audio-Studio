# MPS Audio Studio — Codex operating instructions

## Mission
Build a reliable, installable **macOS desktop audio mastering application** with an analog-console-inspired UI, live processing, offline lossless export, calibrated reference matching, and reproducible presets. This repository is a product specification and legacy prototype, **not** an already working application.

## Autonomous behavior
When a new user request or task is given, read `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/UX_DESIGN.md`, `docs/DSP_SPEC.md`, `docs/QA_ACCEPTANCE.md`, and `docs/IMPLEMENTATION_PLAN.md` before editing. Infer the next smallest complete deliverable from the task; do not ask generic questions like “What do you want to build?” If requirements are ambiguous, choose the documented defaults, record assumptions, and proceed. Ask only when genuinely blocked (e.g., Apple signing credentials).

## Non-negotiables
1. Preserve originals. No in-place destructive edits. Processing is local by default.
2. No claim of identical Masterify internals or exact Lia v6 preset without source coefficients.
3. No fake controls: UI controls must affect the real DSP engine; meters must measure real audio.
4. Preview and export must use the same parameter model and equivalent DSP implementation; test parity.
5. Avoid runaway recursion, repeated audio graph creation, feedback loops, UI-thread DSP and synchronous long work.
6. Use explicit typed schemas and migrations for projects/presets.
7. Each feature includes automated tests, failure handling and user-visible status.
8. Maintain buildable, tested commits. Do not silently rewrite the architecture or replace working code with mockups.
9. Do not add third-party proprietary presets, logos, plugin binaries or reference audio to the repo without rights.
10. macOS deployment targets and signing constraints must be documented honestly. Do not bypass Gatekeeper.

## Development loop
- Inspect current repository and tests; identify baseline and blockers.
- Implement a vertical slice end-to-end (UI → DSP → measurement/export) with tests.
- Run formatting, lint, unit/integration tests, and package smoke tests.
- Report changed files, commands run, test evidence, remaining issues and next milestone.
- If local tools lack macOS, mark packaging as unverified and provide macOS CI steps.

## Priority
Stable open/load/play/stop → parameter automation → EQ → dynamics → meters → export → reference matching → channel-strip mixer → advanced vocal processing → plugin hosting.
