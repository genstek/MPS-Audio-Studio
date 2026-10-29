# Claude Code — complete LoVerse OS delivery assignment

You are taking over implementation of Gennady Glukhov's existing MPS Audio Studio / LoVerse OS repository: https://github.com/genstek/MPS-Audio-Studio.

The owner requests all existing planned features and remaining sprints, followed by his manual testing. This authorizes substantive implementation of dependency-ready work in this package. Do the work, not just a new plan. Conversations/explanations to Gennady are in Russian; code, prompts, test names and technical handoff files are in English. Do not run a user-instruction-driven parallel team by default.

## Start here

1. Read repository `AGENTS.md` and its required docs, especially `docs/ADR-002-web-first.md`. Then read this package's `BASELINE_AUDIT.md`, `INVENTORY.md`, `REQUIREMENT_RECONCILIATION.md`, `DELIVERY_CONTRACT.md`, `QA_HANDOFF.md` and `manifest.json`.
2. Inspect actual git status/remotes/worktrees, installed tools, existing tests and current main. Audited baseline is `364d863de109d1e474bff0635bc0b451224e8860`; re-fetch and record changes if main advanced. Preserve dirty work. No reset/clean/force-push, stash application, deletion or unrequested architecture rewrite.
3. Establish a runnable baseline and record actual commands/results. Do not present the historical 13/13 Mac run as your new run. Check port 5173 ownership; `reuseExistingServer: true` can target another checkout. Do not kill unidentified processes.
4. Create a dedicated integration branch/worktree, e.g. `delivery/LAS-40-all-sprints`, from a known reviewed baseline. Keep small LAS-keyed feature branches and PRs/commits for each slice. Do not commit directly to or merge into main. An aggregate draft PR can expose the integration candidate for Gennady's later testing.

## Execute the whole queue

The package contains **36 work orders**, **27 assigned to future LAS Sprint 01–09**, plus current/unscheduled foundations and QA. Eight epics are rollups; LAS-40 is coordination; LAS-2/3/4 are undefined sample issues. Read each `tasks/LAS-*.md`, preserve its imported acceptance criteria and custom test fields, and use `sprints/*.md` for sequencing. Do not manufacture work for empty sample issues.

First verify/finish existing shell/import/transport/tests (LAS-7/8/9/10), implement Pause-toggle and Unload (LAS-11/12), reconcile responsive coverage/test plan (LAS-48/49) and TC-002 (LAS-57). Then work across all nine future sprint groups in dependency order. If a design review, provider credential, real reference audio, hardware or positive research gate blocks one item, prepare its concrete deliverable, record the exact blocker and continue independent ready work. Do not stop the entire assignment at the first missing credential or pending design choice.

Do not start/close Jira sprints or invent capacity/deadlines. Future sprint names are planning slices. Distinguish prerequisites implemented and developer-tested from later Gennady manual sign-off. Keep checkpoints so work can continue across sessions/compaction; context limits are not a reason to lose the queue.

## Critical product rules

- Active stack: React/Vite/JavaScript/Web Audio; Playwright JavaScript and Vitest. Auth/storage adds a documented backend/provider decision under LAS-19/20, preserving local/guest audio.
- Keep accepted responsive implementation PR #8 and original regression assertions. Do not cherry-pick the rejected Codex/Cursor variants. A new visual design needs the source Jira's real user approval; prepare reviewable proposals and continue independent audio/backend work while pending.
- Real DSP, measured meters, 24-band per-channel interactive EQ, versioned schemas, reproducible presets and preview/export parity. No pretend controls, fabricated measurements or claims that UI tests prove audio fidelity.
- Preserve source audio and accepted sonic baselines. Matching requires the actual authorized reference file/checksum; Lia v6 is a sonic target, not recovered coefficients. Local audio remains local unless the user explicitly chooses an external workflow.
- All research tasks produce evidence and go/no-go. LAS-38 is gated by LAS-37. Plugin hosting, separation and model training are not promised production features merely because they appear on a roadmap.
- Account/privacy work must enforce ownership at the backend/storage layer and be tested with two users. No browser flag as authentication, no secrets in repo/traces.

## Per-issue delivery, Jira and final testing

For each issue, produce code/design/research plus appropriate automated checks and `docs/delivery/LAS-N/` materials required by `DELIVERY_CONTRACT.md`. Record exact SHA/environment, commands and exit codes, criteria trace, evidence and limitations. Provide a candidate Gennady can run and a concise manual script. Never prefill his manual Pass/QA Done or reuse an old test execution for a new commit.

Update the corresponding Jira issue with branch/PR, immutable artifact links, actual results and blockers when authorized Jira access is available. Attach reports/files to the matching LAS key, keeping previous evidence. If unavailable, save a complete `jira-update.md` and mark SYNC_PENDING; do not claim synchronization. Do not impersonate a human assignee or mark everything In Progress before work starts.

Keep developer work states NOT_STARTED / IN_PROGRESS / BLOCKED / READY_FOR_QA separate from check results PASS / FAIL / NOT_RUN / NOT_APPLICABLE and human accepted/rejected verdicts. Jira status transitions must use actual available workflow names. No automatic Done/QA Done for owner acceptance, and no merge/deploy to main without a later explicit instruction.

Finish with a per-issue/sprint dashboard, exact integration SHA and runnable setup, all evidence indexed by Jira key, open defects/blockers, manual QA sequence and any remaining gates. If the environment cannot sustain the whole assignment in one session, commit a complete checkpoint with the next ready task and remaining queue; do not report the rest implemented.

Begin with repository/baseline verification now, then implement the next ready work order. Do not return another high-level plan as the only deliverable.
