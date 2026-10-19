# SCRUM-6 repository audit

Date: 2026-10-19. Task: [SCRUM-6](https://genstek69.atlassian.net/browse/SCRUM-6). Parent: [SCRUM-5](https://genstek69.atlassian.net/browse/SCRUM-5).

## Baselines and inventory

Remote default branch: main, 6ec9af44f05616a82c5f734f8a8c0420eeb61036. Verified using git fetch and git ls-remote. This docs/SCRUM-6-web-first-audit branch starts from that baseline. Separate local feat/web-mixer-foundation ends at e3f9d1a, with three unpublished commits; it is preserved and is not included here.

Main has AGENTS.md, README.md, nine docs files, two reference documents, schemas/preset.example.json and legacy/MPS_Audio_Studio_v0.5_STACK_FIXED.html. It has no package.json, src/, automated test suite, modern build system, CI workflow or native CMake/JUCE implementation. Specifications are not executable application features.

The uploaded CODEX_HANDOFF.md was read from the session attachment outside the repository. Its baseline description predates the unpublished local implementation. Its embedded task list was treated as reference; the current user request controls scope.

Read: AGENTS/README, PRD, architecture, UX, DSP, QA acceptance, implementation plan, handoff and local source/tests/configuration. Main's native stack conflicts with the approved browser direction; ADR-002 and minimal root instructions address this while keeping historical files intact.

## Actual code versus plans

| Area | Observed state |
|---|---|
| Main legacy HTML | Experimental Web Audio graph, media transport/seek, EQ, compressor, synthetic reverb, width and JSON presets. Not executed in this audit; not certified or part of the React application. |
| Legacy concerns from inspection | Global graph/state coupling; perpetual animation loop; approximate EQ display; frequency-bin maximum used as a meter, not validated sample/true peak; no validated export/loudness matching. |
| Local React branch | Vite shell; basic WAV name/header/size validation; real decode; decoded metadata; actual source playback with pause/resume/stop/end; error recovery. Drop handler exists but drag/drop is not automated. |
| Local test tooling | JavaScript Playwright, Vitest, ESLint, original generated PCM16 tone, GitHub Actions configuration. |
| Later product work | Waveform/seek in React, channel mixer, gain/pan, EQ/dynamics, measured loudness/true peak, reference matching, export and persistence are not implemented in the modern app. |
| Delivery | Local implementation is unpublished; remote CI has not been established by this audit. Jira is now accessible, so older local notes describing it as disconnected are stale. |

## Reproduction and evidence

Repository inspection:

```sh
git status --short --branch
git log -5 --oneline
git branch -avv
git ls-tree -r --name-only 6ec9af4
git ls-remote --symref origin HEAD refs/heads/main refs/heads/feat/web-mixer-foundation
git diff --stat 6ec9af4..feat/web-mixer-foundation
```

The remote query returned main at 6ec9af4 and no feat/web-mixer-foundation ref. This documentation change adds no runnable application; do not run npm commands against main/docs branches.

On the separate local implementation branch, this command was actually rerun during the audit:

```sh
PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run check
```

Environment: Linux, Node 24.19.0, npm 11.9.0, system Chromium 154.0.8037.57. Result: ESLint passed; Vitest 5/5 passed; Vite build passed (24 modules); Playwright 5/5 passed covering TC-001–006. These are local implementation results, not main-branch or remote CI results. /usr/bin/chromium is an environment-specific path, not a macOS setup instruction.

Previously observed failures: initial managed Chromium download blocked by network policy; original startup smoke test found a favicon 404, fixed before the passing rerun. GitHub CLI reports invalid GH_TOKEN; connected GitHub access is a separate capability.

Unit source lifecycle tests use mocked AudioContext. Browser tests perform actual short WAV decoding/playback but assert visible state; they do not measure emitted audio or establish hardware output. Fixtures cover mono PCM16, 44.1 kHz. The corrupt-file browser test rejects an invalid header, not a valid header with an undecodable payload. Resume offsets/routing/disposal are checked with unit mocks.

Not verified: other browsers, manual listening, all WAV encodings/rates, large-file responsiveness, drag/drop, full keyboard/accessibility coverage, real-output DSP fidelity, packaging and remote CI. No modern-app mastering or production-readiness claims are supported.

## Smallest safe next step

Review/merge this documentation-only architecture alignment first. Then propose the preserved playback implementation in a separate small issue-linked PR, resolve document overlap, rerun checks and add a browser regression for decode failure after a valid track is loaded. That regression should establish that the prior track remains playable and the error clears on successful replacement. Avoid expanding the application to waveform/EQ/export before the playback foundation is reviewed.

This PR changes only README.md, AGENTS.md and the two new documents. Existing historical assets remain unchanged. Acceptance is checked with git diff --check, a four-file allowlist, local Markdown link checks and historical-file diff verification; application tests are not rerun for prose-only edits.
