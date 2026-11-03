# Sprint group 02 — Recovery, private files, isolation, deletion/consent, security tests, wireframes

Native sprint: LAS Sprint 02 (ID 3, **future** — not started, closed or re-dated by this work).

**Tested integration commit:** `ebf7f8b0b31acdcf6b25a7cdaa934aecdbad321b` on `delivery/LAS-40-all-sprints` — `npm run check` exit 0 (2026-10-29 22:02–22:06 UTC): ESLint clean, Vitest 84/84 (engine 18, server 66), Vite build, Playwright 47/47 on Linux Chromium 141; `npm run scan:artifacts`: 113 pieces, 0 findings — `evidence/`.

## Per-issue outcome
| Issue | Mode | Branch → PR | Tested SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-22 recovery, expiry, limits | IMPLEMENT | `feat/LAS-22-recovery-limits` → [#24](https://github.com/genstek/MPS-Audio-Studio/pull/24) | dd27705 | READY_FOR_QA | NOT_RUN |
| LAS-23 private storage, ownership, uploads | IMPLEMENT | `feat/LAS-23-private-storage` → [#25](https://github.com/genstek/MPS-Audio-Studio/pull/25) | d8292b3 | READY_FOR_QA (2 defects found and fixed in-slice) | NOT_RUN |
| LAS-24 deletion and consent | IMPLEMENT | `feat/LAS-24-deletion-consent` → [#26](https://github.com/genstek/MPS-Audio-Studio/pull/26) | 8cf7084 | READY_FOR_QA | NOT_RUN |
| LAS-43 wireframes | DESIGN_REVIEW_REQUIRED | `design/LAS-43-wireframes` → [#27](https://github.com/genstek/MPS-Audio-Studio/pull/27) | — (design artifact) | **BLOCKED** — walkthrough pending (LAS-42 direction also pending) | PENDING |
| LAS-25 security validation | VALIDATE_IMPLEMENTATION | `test/LAS-25-security-baseline` → [#28](https://github.com/genstek/MPS-Audio-Studio/pull/28) | d2d415d | READY_FOR_QA (fixed F-01 timing enumeration, F-02 tokens in query strings) | NOT_RUN |

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach ebf7f8b0b31acdcf6b25a7cdaa934aecdbad321b
npm ci
npm run server                       # account server :8787 (add MPS_TEST_RECIPIENT=1 to see the consent flow)
npm run dev -- --port 5174           # studio
npm run check && npm run scan:artifacts
```
Migrations: SQLite schema v3 is applied automatically on start (users/sessions/tokens/outbox/audit → projects/assets/jobs → consents/transmissions); a database from sprint 01 (v1) upgrades in place. Rollback: stop the server and delete `.data/dev`; the studio works without it. No secrets or seeded accounts; create throwaway accounts and read mail in `/api/dev/outbox?to=…`.

## Regressions
None: all foundation and sprint 01 tests pass unchanged. Behaviour change to note: emailed links now carry their token after `#` (LAS-25 F-02); old `?verify=` links from before this change no longer work.

## Blockers and decisions for Gennady
1. LAS-43 walkthrough and LAS-42 direction (design gates; LAS-44 waits on both).
2. Approve ADR-003 and the privacy policy (from sprint 01).
3. Production release gates in LAS-25 (HTTPS + Secure cookie, CSP/HSTS, dev endpoints off, mail provider, shared limits, backups) — not part of this delivery.

## Suggested manual QA order
LAS-22-QA-01..04 → LAS-23-QA-01..04 → LAS-24-QA-01..04 (with `MPS_TEST_RECIPIENT=1`) → LAS-25-QA-01/02 → LAS-43 walkthrough. All **Not Run**.
