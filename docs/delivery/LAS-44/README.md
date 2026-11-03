# LAS-44 — Design system and high-fidelity studio designs (Sprint 10)

Jira: [LAS-44](https://genstek69.atlassian.net/browse/LAS-44) · Sprint 10 package (supersedes the Sprint 03 assignment) · Mode: DESIGN_REVIEW_REQUIRED · input: LAS-42/43 (reused, not restarted), LAS-65, Fostex Model 820 direction

Branch `delivery/LAS-40-sprint-10` · commit `849ba64` (design system proposal and studio mockups)

Developer status: **READY FOR GENNADY'S REVIEW** — **no approval exists**; mockups are proposals · Gennady's selection: **PENDING** · LAS-45 stays blocked until a selection is recorded

## Deliverables
| Item | Where |
| --- | --- |
| Design tokens (colour with computed WCAG contrast, type, spacing, shape, motion with reduced-motion rule) | [`docs/design/LAS-44/tokens.css`](../../design/LAS-44/tokens.css), [`design-system.md`](../../design/LAS-44/design-system.md) §2 |
| Component states (default/hover/focus/pressed/disabled/error/loading) and keyboard behaviour for buttons, keys, fields, faders, knobs, meters, needle meters, tabs, dialogs, editor windows, ⓘ help, status | design-system.md §3 |
| Responsive behaviour and the proposed QA viewport matrix (to be confirmed with Gennady), many-channel strategy | design-system.md §4 |
| Two whole-studio proposals — 1 "Model 820 console" (hardware-first) and 2 "Hybrid console workstation" — desktop 1440×900 loaded/playing, movable editors, Space editor, ⓘ popover, empty state, 390 px phone, New project / unsaved / missing-audio flows | [`docs/design/LAS-44/studio-proposals.html`](../../design/LAS-44/studio-proposals.html); screenshots in [`evidence/`](evidence/) |
| Two player proposals for LAS-67 — A classic tape deck with dual needles; B compact professional hybrid with electronic meters | same page, bottom section |

## Acceptance mapping
| Criterion | Status |
| --- | --- |
| Colour/contrast, typography, spacing, layout, icons, responsive behaviour | DONE (proposal) — icons: text glyphs and the ⓘ only; an icon set is part of the selection |
| Component states and keyboard behaviour | DONE (proposal) |
| Hi-fi designs: shell, mixer, analysis/EQ, export, project flows, Space, player, narrow | DONE (proposal); account forms, reference comparison and stems are shown as frames using the same components — their detailed hi-fi screens follow the chosen direction |
| Gennady's explicit approval or requested changes recorded | **PENDING** |

## Decision record
| Date | Decision | By |
| --- | --- | --- |
| — | Pending: Proposal 1, 2, a mix, or changes; player A or B; confirm the QA viewport matrix | Gennady |

Records: [`acceptance.md`](acceptance.md) · [`manual-qa.md`](manual-qa.md) (review steps, **NOT_RUN**) · [`results.json`](results.json) · [`jira-update.md`](jira-update.md) · screenshots in [`evidence/`](evidence/) (Chromium 153, 1440 px wide, full page and a crop of Proposal 2, rendered from the committed HTML).

The Fostex photo attached to LAS-44 could not be downloaded in this session (network policy); please compare the proposals with it.
