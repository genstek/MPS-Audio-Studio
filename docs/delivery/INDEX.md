# LAS-40 delivery index

Integration branch: `delivery/LAS-40-all-sprints` (from `origin/main` 364d863; never merged into `main`). Aggregate review PR into `main`: [#42](https://github.com/genstek/MPS-Audio-Studio/pull/42) (draft, not merged). Handoff: `docs/claude-code/2026-10-29/` on `docs/LAS-40-claude-code-handoff-2026-10-29` (commit 078c0a0). Developer environment: [`ENVIRONMENT.md`](ENVIRONMENT.md). Baseline: [`baseline/`](baseline/).

Developer outcome uses NOT_STARTED / IN_PROGRESS / BLOCKED / READY_FOR_QA. Gennady's manual status stays **NOT_RUN** until he tests. Every Jira update is **SYNC_PENDING** (no authorized Jira connection in this session); the text to post is in each issue's `jira-update.md`.

**Sprint 10 (2026-11-02):**
- 14 work orders on `delivery/LAS-40-sprint-10` → [PR #45](https://github.com/genstek/MPS-Audio-Studio/pull/45), not merged.
- 10 are READY_FOR_QA, LAS-65 and LAS-44 are proposals awaiting Gennady's selection, LAS-45 is BLOCKED, and LAS-66 is IN_PROGRESS.
- Jira was updated directly for Sprint 10; see each issue's `jira-update.md`.
- Summary: [sprints/10](sprints/10/README.md).

**Final delivery state (2026-10-30).** All 36 work orders have a delivery record: **29 READY_FOR_QA**, **7 BLOCKED** on decisions only Gennady can make (no NOT_STARTED or IN_PROGRESS rows remain).
- READY_FOR_QA means developer checks passed for the stated scope. It is not QA Done, Jira Done, owner acceptance or a merge into `main`.
- Final integration check on `b16c0ba`: `npm run check` exit 0 (Vitest 275/275, Playwright 81/81) and the artifact scan with 0 findings. See [`final-check/`](final-check/).

| Issue | Sprint group | Mode | Branch → PR | Candidate SHA | Evidence | Developer outcome | Gennady manual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LAS-7 | 00 | VERIFY_EXISTING | `test/LAS-7-shell-smoke` → [#11](https://github.com/genstek/MPS-Audio-Studio/pull/11) | 655a959 | [docs/delivery/LAS-7](LAS-7/) | READY_FOR_QA | NOT_RUN |
| LAS-8 | 00 (unscheduled) | VERIFY_AND_CLOSE_GAPS | `feat/LAS-8-import-lifecycle`, `fix/LAS-8-riff-header-bytes` → [#13](https://github.com/genstek/MPS-Audio-Studio/pull/13), [#20](https://github.com/genstek/MPS-Audio-Studio/pull/20) | fa48f34 | [docs/delivery/LAS-8](LAS-8/) | READY_FOR_QA (header defect fixed) | NOT_RUN |
| LAS-9 | 00 (unscheduled) | VERIFY_AND_CLOSE_GAPS | `feat/LAS-9-elapsed-position` → [#14](https://github.com/genstek/MPS-Audio-Studio/pull/14) | 9e9d817 | [docs/delivery/LAS-9](LAS-9/) | READY_FOR_QA | NOT_RUN |
| LAS-10 | 00 | VERIFY_AND_COMPLETE_TEST_COVERAGE | `feat/LAS-10-playwright-ownership` → [#10](https://github.com/genstek/MPS-Audio-Studio/pull/10) | 8b2068f | [docs/delivery/LAS-10](LAS-10/) | READY_FOR_QA | NOT_RUN |
| LAS-11 | 00 (unscheduled) | IMPLEMENT | `feat/LAS-11-pause-toggle` → [#15](https://github.com/genstek/MPS-Audio-Studio/pull/15) | 760dc13 | [docs/delivery/LAS-11](LAS-11/) | READY_FOR_QA | NOT_RUN |
| LAS-12 | 00 (unscheduled) | IMPLEMENT | `feat/LAS-12-unload-track` → [#16](https://github.com/genstek/MPS-Audio-Studio/pull/16) | 4e8a903 | [docs/delivery/LAS-12](LAS-12/) | READY_FOR_QA | NOT_RUN |
| LAS-19 | 01 | ARCHITECTURE | `docs/LAS-19-auth-architecture` → [#19](https://github.com/genstek/MPS-Audio-Studio/pull/19) | — (docs) | [docs/delivery/LAS-19](LAS-19/) | READY_FOR_QA (ADR-003 proposed) | NOT_RUN |
| LAS-20 | 01 | ARCHITECTURE | `docs/LAS-20-privacy-threat-model` → [#21](https://github.com/genstek/MPS-Audio-Studio/pull/21) | 11a3058 | [docs/delivery/LAS-20](LAS-20/) | READY_FOR_QA (policy proposed) | NOT_RUN |
| LAS-21 | 01 | IMPLEMENT | `feat/LAS-21-accounts` → [#23](https://github.com/genstek/MPS-Audio-Studio/pull/23) | ac9ab7c | [docs/delivery/LAS-21](LAS-21/) | READY_FOR_QA | NOT_RUN |
| LAS-22 | 02 | IMPLEMENT | `feat/LAS-22-recovery-limits` → [#24](https://github.com/genstek/MPS-Audio-Studio/pull/24) | dd27705 | [docs/delivery/LAS-22](LAS-22/) | READY_FOR_QA | NOT_RUN |
| LAS-23 | 02 | IMPLEMENT | `feat/LAS-23-private-storage` → [#25](https://github.com/genstek/MPS-Audio-Studio/pull/25) | d8292b3 | [docs/delivery/LAS-23](LAS-23/) | READY_FOR_QA (2 defects fixed in-slice) | NOT_RUN |
| LAS-24 | 02 | IMPLEMENT | `feat/LAS-24-deletion-consent` → [#26](https://github.com/genstek/MPS-Audio-Studio/pull/26) | 8cf7084 | [docs/delivery/LAS-24](LAS-24/) | READY_FOR_QA | NOT_RUN |
| LAS-25 | 02 | VALIDATE_IMPLEMENTATION | `test/LAS-25-security-baseline` → [#28](https://github.com/genstek/MPS-Audio-Studio/pull/28) | d2d415d | [docs/delivery/LAS-25](LAS-25/) | READY_FOR_QA (F-01, F-02 fixed) | NOT_RUN |
| LAS-26 | 03 | IMPLEMENT | `feat/LAS-26-analysis` → [#29](https://github.com/genstek/MPS-Audio-Studio/pull/29) | a21e687 | [docs/delivery/LAS-26](LAS-26/) | READY_FOR_QA | NOT_RUN |
| LAS-27 | 03 | IMPLEMENT | `feat/LAS-27-processing-chain` → [#30](https://github.com/genstek/MPS-Audio-Studio/pull/30) | 23865e4 | [docs/delivery/LAS-27](LAS-27/) | READY_FOR_QA (engine; UI in LAS-28) | NOT_RUN |
| LAS-28 | 04 | IMPLEMENT | `feat/LAS-28-controls-ab-export` → [#31](https://github.com/genstek/MPS-Audio-Studio/pull/31) | c43345d | [docs/delivery/LAS-28](LAS-28/) | READY_FOR_QA (limiter 8x detection fix included) | NOT_RUN |
| LAS-29 | 04 | VALIDATE_IMPLEMENTATION | `test/LAS-29-dsp-fixtures` → [#32](https://github.com/genstek/MPS-Audio-Studio/pull/32) | 0c961b9 | [docs/delivery/LAS-29](LAS-29/) | READY_FOR_QA (benchmark + protocol; listening NOT_RUN; Lia v6 reference blocked on authorized file) | NOT_RUN |
| LAS-30 | 05 | IMPLEMENT | `feat/LAS-30-reference-profiles` → [#33](https://github.com/genstek/MPS-Audio-Studio/pull/33) | ad800ea | [docs/delivery/LAS-30](LAS-30/) | READY_FOR_QA | NOT_RUN |
| LAS-31 | 05 | IMPLEMENT | `feat/LAS-31-reference-comparison` → [#34](https://github.com/genstek/MPS-Audio-Studio/pull/34) | 5ff67e9 | [docs/delivery/LAS-31](LAS-31/) | READY_FOR_QA | NOT_RUN |
| LAS-32 | 06 | IMPLEMENT | `feat/LAS-32-reference-proposal` → [#35](https://github.com/genstek/MPS-Audio-Studio/pull/35) | 20323db | [docs/delivery/LAS-32](LAS-32/) | READY_FOR_QA (numerical + workflow; listening evaluation NOT_RUN) | NOT_RUN |
| LAS-33 | 06 | IMPLEMENT | `feat/LAS-33-presets-preferences` → [#36](https://github.com/genstek/MPS-Audio-Studio/pull/36) | d490a50 | [docs/delivery/LAS-33](LAS-33/) | READY_FOR_QA | NOT_RUN |
| LAS-34 | 07 | IMPLEMENT | `feat/LAS-34-stems` → [#37](https://github.com/genstek/MPS-Audio-Studio/pull/37) | 98bf1c6 | [docs/delivery/LAS-34](LAS-34/) | READY_FOR_QA | NOT_RUN |
| LAS-35 | 07 | IMPLEMENT | `feat/LAS-35-stem-processing` → [#38](https://github.com/genstek/MPS-Audio-Studio/pull/38) | 7fc3a59 | [docs/delivery/LAS-35](LAS-35/) | READY_FOR_QA | NOT_RUN |
| LAS-36 | 08 | RESEARCH | `research/LAS-36-stem-separation` → [#39](https://github.com/genstek/MPS-Audio-Studio/pull/39) | 8a4b6d7 (report) | [docs/delivery/LAS-36](LAS-36/) | READY_FOR_QA (classical NO-GO; ML candidates blocked by network policy; listening NOT_RUN) | NOT_RUN |
| LAS-37 | 08 | RESEARCH | `research/LAS-37-plugin-host-bridge` → [#40](https://github.com/genstek/MPS-Audio-Studio/pull/40) | 624df6c (report + prototype) | [docs/delivery/LAS-37](LAS-37/) | READY_FOR_QA (design + bridge prototype 7/7; real plugin NOT_RUN: not permitted here; no macOS) | NOT_RUN |
| LAS-38 | 09 | GATED_PROTOTYPE | — (status documents) → — | — | [docs/delivery/LAS-38](LAS-38/) | BLOCKED (needs a real-plugin LAS-37 pass, Gennady's approval and a permitted host/plugin) | PENDING |
| LAS-39 | 09 | RESEARCH | `research/LAS-39-model-training-assessment` → [#41](https://github.com/genstek/MPS-Audio-Studio/pull/41) | aa46bd5 (report + experiment) | [docs/delivery/LAS-39](LAS-39/) | READY_FOR_QA (protocol + synthetic experiment; production training NO-GO; real data and listening NOT_RUN) | NOT_RUN |
| LAS-42 | 01 | DESIGN_REVIEW_REQUIRED | `design/LAS-42-ui-audit` → [#22](https://github.com/genstek/MPS-Audio-Studio/pull/22) | c7a705b (audited) | [docs/delivery/LAS-42](LAS-42/) | BLOCKED — direction choice pending | PENDING decision |
| LAS-43 | 02 | DESIGN_REVIEW_REQUIRED | `design/LAS-43-wireframes` → [#27](https://github.com/genstek/MPS-Audio-Studio/pull/27) | — (design) | [docs/delivery/LAS-43](LAS-43/) | BLOCKED — walkthrough pending | PENDING walkthrough |
| LAS-44 | 10 (was 03) | DESIGN_REVIEW_REQUIRED | `delivery/LAS-40-sprint-10` → [#45](https://github.com/genstek/MPS-Audio-Studio/pull/45) | 849ba64 (design) | [docs/delivery/LAS-44](LAS-44/) | Proposals ready for review; nothing approved | PENDING selection |
| LAS-45 | 10 (was 04) | GATED_IMPLEMENTATION | — (status documents) → [#45](https://github.com/genstek/MPS-Audio-Studio/pull/45) | — | [docs/delivery/LAS-45](LAS-45/) | BLOCKED (needs the LAS-44 selection; no reskin started) | PENDING |
| LAS-46 | 07 | GATED_IMPLEMENTATION | — (status documents) → — | — | [docs/delivery/LAS-46](LAS-46/) | BLOCKED (approved design: LAS-42 → 43 → 44 → 45) | PENDING |
| LAS-47 | 07 | QA_REVIEW_REQUIRED | — (status documents) → — | — | [docs/delivery/LAS-47](LAS-47/) | BLOCKED (needs LAS-46; Gennady's review not prefilled) | PENDING |
| LAS-48 | 00 | VERIFY_AND_CLOSE_COVERAGE_GAPS | `test/LAS-48-coverage-gaps` → [#17](https://github.com/genstek/MPS-Audio-Studio/pull/17) | b06590b | [docs/delivery/LAS-48](LAS-48/) | READY_FOR_QA (AC-03/06, cross-browser BLOCKED) | NOT_RUN |
| LAS-49 | 00 (unscheduled) | TEST_PLAN_RECONCILIATION | `docs/LAS-49-test-plan-reconciliation` → [#18](https://github.com/genstek/MPS-Audio-Studio/pull/18) | b06590b | [docs/delivery/LAS-49](LAS-49/) | READY_FOR_QA (24 cases reconciled) | NOT_RUN (24) |
| LAS-57 | 00 | AUTOMATION_AND_QA_HANDOFF | `test/LAS-57-tc002-valid-wav` → [#12](https://github.com/genstek/MPS-Audio-Studio/pull/12) | f90adfc | [docs/delivery/LAS-57](LAS-57/) | READY_FOR_QA | NOT_RUN |
| LAS-60 | 10 | IMPLEMENT | `delivery/LAS-40-sprint-10` → [#45](https://github.com/genstek/MPS-Audio-Studio/pull/45) | 6793920 | [docs/delivery/LAS-60](LAS-60/) | READY_FOR_QA | NOT_RUN |
| LAS-61 | 10 | IMPLEMENT | same | ce72cd4 | [docs/delivery/LAS-61](LAS-61/) | READY_FOR_QA | NOT_RUN |
| LAS-62 | 10 | IMPLEMENT | same | ce72cd4, bef9308 | [docs/delivery/LAS-62](LAS-62/) | READY_FOR_QA | NOT_RUN |
| LAS-63 | 10 | IMPLEMENT | same | 569eb45, f9d5ccb | [docs/delivery/LAS-63](LAS-63/) | READY_FOR_QA | NOT_RUN |
| LAS-64 | 10 | IMPLEMENT | same | bef9308, d65775b, 159e902 | [docs/delivery/LAS-64](LAS-64/) | READY_FOR_QA (listening NOT_RUN) | NOT_RUN |
| LAS-65 | 10 | RESEARCH + DESIGN_REVIEW_REQUIRED | same | 849ba64 (design) | [docs/delivery/LAS-65](LAS-65/) | Proposals ready for review; nothing approved | PENDING selection |
| LAS-66 | 10 | QA | same | docs | [docs/delivery/LAS-66](LAS-66/) | IN_PROGRESS (automated regression executed; design acceptance waits for the selection) | NOT_RUN |
| LAS-67 | 10 | IMPLEMENT | same | a915a54, 2c5d0ce | [docs/delivery/LAS-67](LAS-67/) | READY_FOR_QA (look waits for LAS-44) | NOT_RUN |
| LAS-68 | 10 | IMPLEMENT | same | 8e74cc1 | [docs/delivery/LAS-68](LAS-68/) | READY_FOR_QA (listening NOT_RUN) | NOT_RUN |
| LAS-69 | 10 | IMPLEMENT | same | 6793920, e42b2ff | [docs/delivery/LAS-69](LAS-69/) | READY_FOR_QA | NOT_RUN |
| LAS-70 | 10 | IMPLEMENT | same | 1146068 | [docs/delivery/LAS-70](LAS-70/) | READY_FOR_QA (older dialogs partial, see inventory) | NOT_RUN |
| LAS-71 | 10 | IMPLEMENT | same | aa8251d | [docs/delivery/LAS-71](LAS-71/) | READY_FOR_QA | NOT_RUN |

Sprint boundaries: [00 foundation](sprints/00-foundation/README.md) · [01](sprints/01/README.md) · [02](sprints/02/README.md) · [03](sprints/03/README.md) · [04](sprints/04/README.md) · [05](sprints/05/README.md) · [06](sprints/06/README.md) · [07](sprints/07/README.md) · [08](sprints/08/README.md) · [09](sprints/09/README.md) · [10 Pro Mixer](sprints/10/README.md). Final check: [final-check](final-check/README.md) (sprints 00–09); Sprint 10: [sprints/10/final](sprints/10/final/).

## Blockers and decisions for Gennady
| Decision or input | Unblocks |
| --- | --- |
| Choose the LAS-42 visual direction → walk through the LAS-43 wireframes → approve LAS-44 | LAS-44 → LAS-45 → LAS-46 → LAS-47 (the redesign chain) |
| Review ADR-003 (accounts, private storage) and the privacy policy (LAS-19, LAS-20) | Their status moves from *proposed* to accepted |
| Provide the authorized Lia v6 file and its checksum | Lia v6 sonic-target benchmark (LAS-29). Matching needs the actual file; nothing is claimed without it |
| Listening reviews (LAS-29 protocol) | Listening evidence for LAS-29, LAS-32, LAS-36 and LAS-39. Measurements and UI tests do not prove audio quality |
| Permission or a machine with access to an ML model host | LAS-36 ML separator evaluation with the included scorer |
| Decide on the LAS-37 bridge architecture; allow (or run on your Mac) a permitted real plugin | LAS-37 real-plugin validation, then LAS-38 |
| Decide whether remembered decisions may be used for a local preference study (a new opt-in), and whether your projects can be a dataset | Any LAS-39 follow-up |
| Run the manual QA on your Mac in Chrome | Every **Not Run** manual case. macOS, Safari, Firefox and real Chrome were not available here |
| Restore Jira access for this tool, or post the prepared `jira-update.md` texts | Jira sync (all **SYNC_PENDING**) |

## Suggested manual QA order
Foundation (LAS-7 to LAS-12, LAS-57, LAS-48/49) → accounts and privacy (LAS-21 to LAS-25) → analysis, chain, controls and export (LAS-26 to LAS-29) → references and proposals (LAS-30 to LAS-33) → stems (LAS-34, LAS-35) → research reports (LAS-36, LAS-37, LAS-39). Each sprint README lists its cases; all are **Not Run**.

## Package notes
- Handoff `CHECKSUMS.sha256`: `coverage.csv` **failed** its checksum when verified at the start of this session; all other listed files matched. The file was read for context only.
- Placeholder issues LAS-2/3/4 and the eight epics have no work orders; nothing was manufactured for them.
