# LAS-40 delivery index

Integration branch: `delivery/LAS-40-all-sprints` (from `origin/main` 364d863; never merged into `main`). Handoff: `docs/claude-code/2026-10-29/` on `docs/LAS-40-claude-code-handoff-2026-10-29` (commit 078c0a0). Developer environment: [`ENVIRONMENT.md`](ENVIRONMENT.md). Baseline: [`baseline/`](baseline/).

Developer outcome uses NOT_STARTED / IN_PROGRESS / BLOCKED / READY_FOR_QA. Gennady's manual status stays **NOT_RUN** until he tests. Every Jira update is **SYNC_PENDING** (no authorized Jira connection in this session); the text to post is in each issue's `jira-update.md`.

**Checkpoint status (in progress).** This table is updated as work proceeds; rows marked NOT_STARTED have not been worked on yet.

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
| LAS-26 | 03 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-27 | 03 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-28 | 04 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-29 | 04 | VALIDATE_IMPLEMENTATION | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-30 | 05 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-31 | 05 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-32 | 06 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-33 | 06 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-34 | 07 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-35 | 07 | IMPLEMENT | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-36 | 08 | RESEARCH | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-37 | 08 | RESEARCH | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-38 | 09 | GATED_PROTOTYPE | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-39 | 09 | RESEARCH | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-42 | 01 | DESIGN_REVIEW_REQUIRED | `design/LAS-42-ui-audit` → [#22](https://github.com/genstek/MPS-Audio-Studio/pull/22) | c7a705b (audited) | [docs/delivery/LAS-42](LAS-42/) | BLOCKED — direction choice pending | PENDING decision |
| LAS-43 | 02 | DESIGN_REVIEW_REQUIRED | `design/LAS-43-wireframes` → [#27](https://github.com/genstek/MPS-Audio-Studio/pull/27) | — (design) | [docs/delivery/LAS-43](LAS-43/) | BLOCKED — walkthrough pending | PENDING walkthrough |
| LAS-44 | 03 | DESIGN_REVIEW_REQUIRED | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-45 | 04 | GATED_IMPLEMENTATION | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-46 | 07 | GATED_IMPLEMENTATION | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-47 | 07 | QA_REVIEW_REQUIRED | — → — | — | — | NOT_STARTED | NOT_RUN |
| LAS-48 | 00 | VERIFY_AND_CLOSE_COVERAGE_GAPS | `test/LAS-48-coverage-gaps` → [#17](https://github.com/genstek/MPS-Audio-Studio/pull/17) | b06590b | [docs/delivery/LAS-48](LAS-48/) | READY_FOR_QA (AC-03/06, cross-browser BLOCKED) | NOT_RUN |
| LAS-49 | 00 (unscheduled) | TEST_PLAN_RECONCILIATION | `docs/LAS-49-test-plan-reconciliation` → [#18](https://github.com/genstek/MPS-Audio-Studio/pull/18) | b06590b | [docs/delivery/LAS-49](LAS-49/) | READY_FOR_QA (24 cases reconciled) | NOT_RUN (24) |
| LAS-57 | 00 | AUTOMATION_AND_QA_HANDOFF | `test/LAS-57-tc002-valid-wav` → [#12](https://github.com/genstek/MPS-Audio-Studio/pull/12) | f90adfc | [docs/delivery/LAS-57](LAS-57/) | READY_FOR_QA | NOT_RUN |

Sprint boundaries: [00 foundation](sprints/00-foundation/README.md) · [01](sprints/01/README.md) · [02](sprints/02/README.md).

## Next ready task and queue (checkpoint)
1. **LAS-26** analysis (sprint 03) — next; then LAS-27 EQ/compressor/limiter, LAS-28 controls/A-B/export, LAS-29 fixtures/protocol. LAS-44/45 are design-gated (LAS-42/43 pending).
2. Sprint 05–09: LAS-30..39, LAS-46/47 in dependency order; research items deliver go/no-go reports.
3. Final: INDEX completion, aggregate draft PR delivery → main (not merged), report.

## Package notes
- Handoff `CHECKSUMS.sha256`: `coverage.csv` **failed** its checksum when verified at the start of this session; all other listed files matched. The file was read for context only.
- Placeholder issues LAS-2/3/4 and the eight epics have no work orders; nothing was manufactured for them.
