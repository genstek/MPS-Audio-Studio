# LAS-5 — MPS Audio Studio — Web Mixer & QA Automation

Jira: https://genstek69.atlassian.net/browse/LAS-5

## Goal

Build a functional, browser-based audio mixing and mastering application inspired by classic multitrack consoles, and use it as a real, reproducible QA Automation learning and portfolio project.

## Repository and source of truth

* GitHub: https://github.com/genstek/MPS-Audio-Studio
* Review CODEX_HANDOFF.md when available.
* Existing README/AGENTS.md and docs currently describe a JUCE/C++ macOS-native implementation. This web-first scope is a new approved direction; audit and document the architecture decision before modifying code.
* Preserve existing source, historical documents and prototypes. No destructive rewrite without inspection.

## Initial technical direction (subject to repository audit)

* React + Vite + JavaScript for the web UI.
* Web Audio API for audio preview and control.
* Playwright + JavaScript for browser UI and end-to-end tests.
* Vitest and deterministic audio fixtures for logic/DSP verification.
* GitHub Actions to run automated checks on pull requests.

## MVP user journey

Open mixer → import valid WAV → see track/channel strip → Play/Pause → control audio → save settings (later) → export processed WAV (later).

## Quality principles

* Playwright assertions must verify actual UI behavior, not just existence of visual controls.
* Audio quality and true DSP effects require separate deterministic signal-processing tests.
* Clear test evidence, reproducible bugs, branch/PR workflow.
* User is learning JavaScript and Playwright: deliver small, understandable, reviewed tests, explaining selectors/assertions/fixtures.
* Mark unimplemented functions and unexecuted tests explicitly.

## Initial outcomes

1. Audit repository and align documentation.
2. Start working web-mixer shell.
3. Provide functional WAV import and transport.
4. Establish Playwright baseline and first smoke/E2E tests.
5. Automate tests in CI with evidence.

## Definition of done

Demo is runnable; commits and PR link to Jira; key flows backed by passing automated tests; remaining limitations recorded.

## Child work orders

- [LAS-7 — Build runnable web mixer shell with Fostex-inspired channel strips](../tasks/LAS-7.md)
- [LAS-8 — Import WAV audio and display a track in the mixer](../tasks/LAS-8.md)
- [LAS-9 — Implement real Play/Pause transport for imported WAV](../tasks/LAS-9.md)
- [LAS-10 — Set up Playwright JS and first browser smoke tests](../tasks/LAS-10.md)
- [LAS-11 — Resume paused audio with either Pause or Play](../tasks/LAS-11.md)
- [LAS-12 — Unload the imported track and return the mixer to its empty state](../tasks/LAS-12.md)
- [LAS-57 — LAS-10-TC-002: Verify that a valid WAV file is imported successfully](../tasks/LAS-57.md)

Roll up actual child evidence. Do not implement this epic a second time or mark it Done until its acceptance and Gennady's required reviews are met. Related existing closed records remain in INVENTORY.md and sources/jira-issues.json.
