# Sprint group 01 — Accounts, privacy rules and UI/UX direction

Native sprint: LAS Sprint 01 (ID 1, **future** — not started, closed or re-dated by this work). Goal (Jira): accounts, privacy rules and agreed UI/UX direction.

**Tested integration commit:** `2aab4a3acf5711c89fa0a0baca53de96cd28baab` on `delivery/LAS-40-all-sprints` — `npm run check` exit 0 (2026-10-29 18:29–18:32 UTC): ESLint clean, Vitest 26/26 (17 engine + 9 server), Vite build, Playwright 39/39 on Linux Chromium 141 — `evidence/`.

## Per-issue outcome
| Issue | Mode | Branch → PR | Tested SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-19 auth architecture | ARCHITECTURE | `docs/LAS-19-auth-architecture` → [#19](https://github.com/genstek/MPS-Audio-Studio/pull/19) | docs | READY_FOR_QA — ADR-003 **proposed** | approve ADR: NOT_RUN |
| LAS-20 privacy/threat model | ARCHITECTURE | `docs/LAS-20-privacy-threat-model` → [#21](https://github.com/genstek/MPS-Audio-Studio/pull/21) | 11a3058 | READY_FOR_QA — policy **proposed**, local-only test | NOT_RUN |
| LAS-42 UI audit/direction | DESIGN_REVIEW_REQUIRED | `design/LAS-42-ui-audit` → [#22](https://github.com/genstek/MPS-Audio-Studio/pull/22) | c7a705b (audited) | **BLOCKED** — choose direction A/B/hybrid | PENDING |
| LAS-21 accounts | IMPLEMENT | `feat/LAS-21-accounts` → [#23](https://github.com/genstek/MPS-Audio-Studio/pull/23) | ac9ab7c | READY_FOR_QA | NOT_RUN |

Also in this group's window: LAS-8 defect fix [#20](https://github.com/genstek/MPS-Audio-Studio/pull/20) (valid WAVs rejected when size bytes look like UTF-8; ~9.3 % of sizes) — found while writing the LAS-20 test.

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach 2aab4a3acf5711c89fa0a0baca53de96cd28baab
npm ci
npm run server                 # terminal 1 — account server :8787, data .data/dev (needs Node 22.13+)
npm run dev -- --port 5174     # terminal 2 — studio http://127.0.0.1:5174/
npm run check                  # tests: app :5173 + own account server :8788 with fresh data
```
Test accounts: create your own throwaway addresses (e.g. `you+1@example.test`); verification links are in `http://127.0.0.1:5174/api/dev/outbox?to=<address>`. No secrets or seeded accounts are in the repository. Migration: the SQLite schema is created on first start (`PRAGMA user_version` 1). Rollback: stop the server and delete `.data/dev`; the studio keeps working without it.

## Regressions
None: all 36 earlier E2E tests and 17 engine tests pass unchanged; the local-only and console-error smoke tests stay clean because the studio does not call the server unless the Account dialog is opened.

## Blockers / decisions waiting for Gennady
1. LAS-42: choose a visual direction (A Console, B Focused workstation, hybrid, or new references).
2. LAS-19/20: approve or change ADR-003 and the privacy policy (both "proposed").
3. External (production only): mail provider credentials, HTTPS hosting, backups.

## Suggested manual QA order
LAS-19-QA-01/02 → LAS-20-QA-01/02 → LAS-21-QA-01..04 → LAS-42-QA-01/02 (decision). All **Not Run**.
