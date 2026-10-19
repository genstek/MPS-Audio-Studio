# MPS Audio Studio — Web Mixer & QA Automation

Approved direction: **React + Vite + JavaScript + Web Audio API**, with JavaScript Playwright browser tests and Vitest logic/audio tests. Tracking: [SCRUM-6](https://genstek69.atlassian.net/browse/SCRUM-6), under [SCRUM-5](https://genstek69.atlassian.net/browse/SCRUM-5).

This branch contains documentation and a legacy prototype, not the modern web application. There is no package.json here: `npm ci`, `npm run dev` and `npm run check` are not available on this branch yet. The unpublished playback implementation described in the audit is separate work and must be reviewed in its own PR.

Read [ADR-002](docs/ADR-002-web-first.md) for the architecture decision, [the repository audit](docs/SCRUM-6_AUDIT.md) for verified status and [AGENTS.md](AGENTS.md) for current development instructions. Preserve the native handoff below as historical context; its stack and bootstrap instructions are superseded for current web work.

## Historical native handoff

This package contains the product and engineering documentation for a **new native-installable macOS application**. It also includes a legacy HTML prototype for behavioral reference, **not production code**.

## Start here
1. Read `AGENTS.md` and all `docs/` files.
2. Start with `docs/IMPLEMENTATION_PLAN.md` Milestone 0 and 1.
3. Follow `docs/QA_ACCEPTANCE.md` for release gates.
4. Use `schemas/preset.example.json` as a first version of preset interchange.
5. Use `reference/REFERENCE_BASELINE.md` to understand the approved Lia v6 sonic target.

## Recommended stack
**JUCE 8 / C++20 + CMake** for macOS standalone DSP app, real-time audio, AU/VST3 hosting later, and installer packaging. Create an original UI with custom JUCE components; keep audio DSP and UI independent. Optional future Rust/TypeScript service or UI is a separate architectural decision, not a default dependency. Validate JUCE licensing and third-party component licenses before distribution.

## Constraints
macOS first; Apple Silicon and Intel if toolchain supports both; offline/local by default; WAV 16/24/32-bit input; WAV 24-bit export; 44.1/48/96 kHz. Prefer non-destructive project saves. No external service required to play or master audio.

## Historical inputs
`legacy/` contains the old HTML; it had stack overflow and page hangs. It is not a certified reference implementation. `reference/` records prior listening conclusions; actual audio files must be supplied by the owner locally.
