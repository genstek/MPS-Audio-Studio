# LAS-65 — Processor card and editor presentations: research and proposals

Jira: [LAS-65](https://genstek69.atlassian.net/browse/LAS-65) · Sprint 10 package · Mode: RESEARCH + DESIGN_REVIEW_REQUIRED · next in chain: LAS-44 → LAS-45

Branch `delivery/LAS-40-sprint-10` · commit `849ba64` (research and proposals)

Developer status: **READY FOR GENNADY'S REVIEW** — nothing is approved · Gennady's choice: **PENDING** · Manual review: **NOT_RUN**

## Deliverables
| Item | Where |
| --- | --- |
| Research with cited official sources and the interaction principle borrowed from each (FabFilter Pro-Q 4 / Pro-C 2 / Pro-L 2 / Pro-R 2 help, Apple Logic Pro Channel EQ and ChromaVerb guides, VU ballistics, W3C APG / WCAG 1.4.13, Fostex 820/812 manuals) | [`docs/design/LAS-65/research.md`](../../design/LAS-65/research.md) |
| Two concrete proposals side by side — A "Console module" (hardware-first) and B "Graph-first pro" — with compact mixer cards and expanded editors for EQ, Dynamics, Limiter and Space; states (active, bypassed, edited, no audio, hover, focus, silent); several movable windows; a 390 px phone | [`docs/design/LAS-65/processor-proposals.html`](../../design/LAS-65/processor-proposals.html) (open locally); screenshots in [`evidence/`](evidence/) |
| Recommendation (developer note, not a decision) | Hybrid "B inside A": graph-first editors in console modules |
| Graphic EQ vs graphical parametric EQ clarified | research § S8: the 24-band parametric engine stays; a fixed-band slider view would be a separate UI mode on the same engine |

## Acceptance mapping
| Criterion | Status | Evidence |
| --- | --- | --- |
| Review official docs, cite sources, explain each borrowed principle | DONE | research.md §2 (11 sources) |
| ≥ 2 proposals side by side, cards and editors, recommendation | DONE | processor-proposals.html, research.md §3 |
| EQ axes, curve, spectrum, draggable bands, numeric control; engine preserved | DONE (proposed); parts already working (LAS-28, LAS-63) | proposals, LAS-63 |
| Dynamics transfer curve, threshold/knee, in/out/GR meters; Limiter ceiling + level/GR; Space decay | DONE (proposed); configured curves already working in the studio (LAS-63/64) | proposals |
| States, hover/focus, multiple windows, smaller viewports | DONE | proposals §3–4 |
| Fostex Model 820 photo as the console reference | **LIMITED** — the photo could not be downloaded (Atlassian media host blocked by the session's network policy, HTTP 403); proposals use the documented 820/812 strip grammar; Gennady to compare with his photo | research.md §2 |
| Gennady's choice recorded before any reskin | **PENDING** | decision table below |

## Decision record
| Date | Decision | By |
| --- | --- | --- |
| — | Pending: A, B, hybrid, or changes | Gennady |

Records: [`acceptance.md`](acceptance.md) · [`manual-qa.md`](manual-qa.md) (review steps, **NOT_RUN**) · [`results.json`](results.json) · [`jira-update.md`](jira-update.md) · screenshot [`evidence/processor-proposals-1440.png`](evidence/processor-proposals-1440.png) (Chromium 153, 1440 px wide, full page, rendered from the committed HTML).

Limitations: fabfilter.com could not be fetched directly from this session (network policy); quotes come from the search index of the official pages and should be re-checked in a browser. Mockup numbers are placeholders.
