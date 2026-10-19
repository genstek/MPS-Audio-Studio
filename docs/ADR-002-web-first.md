# ADR-002: browser-first mixer and JavaScript QA

Date: 2026-10-19. Status: approved direction, documented for review in SCRUM-6 under SCRUM-5.

## Context and decision

The approved product direction is a browser-based audio mixer and a practical JavaScript/Playwright QA learning project. ADR-001 selected JUCE/C++20 and macOS packaging. That implementation target no longer matches the current scope.

Use React + Vite + JavaScript for accessible UI; Web Audio API for local decoding and playback; Playwright Test in JavaScript for browser workflows; Vitest for validation, state and audio lifecycle tests. Add deterministic signal tests as DSP is implemented. Keep audio ownership/lifecycle in a small engine module separate from React UI state. Do not introduce a backend, native wrapper, WASM or a framework migration without a concrete requirement and separate decision.

## Preservation and migration

ADR-002 supersedes ADR-001's native implementation choice for active browser work. Preserve ADR-001, the native PRD/roadmap, UX/DSP specifications, QA gates, references, schema examples and legacy HTML unchanged. They document historical intent and future targets, not completed features. No native project currently exists to migrate; this is a staged web implementation rather than a native-code rewrite.

The legacy prototype is behavioral/UX reference, not a certified DSP engine. Introduce capabilities in independently tested slices rather than copying its global state and audio graph. Preserve the existing unpublished web implementation on its own branch; review/reuse it in a separate application PR after this documentation change.

## First implementation slice and limits

Scope the next application PR to shell → valid WAV import → decoded metadata → real play/pause/resume/stop → invalid-input recovery. Accessible labels, original synthetic WAV fixtures and readable tests belong to that slice. One managed audio engine owns context/source cleanup; original media is never overwritten or uploaded.

An initial 100 MiB limit is proposed, subject to memory/performance verification. AudioContext may resample: label decoded sample rate accurately. Chromium is the first automated browser; other browsers, WAV formats, long files and hardware listening require separate evidence.

Waveform/seek, multitrack mixing, EQ, dynamics, LUFS/true peak, export, persistence and desktop delivery remain later slices. UI success does not establish audio quality. Future preview/export must share an explicit parameter model and have measured parity.

## Review and delivery

Keep SCRUM-6 documentation-only. Use issue-linked commits and PRs referencing SCRUM-6 and SCRUM-5; do not merge application code or mark unverified work Done. Re-run the existing playback checks when that separate implementation is proposed. Remote CI configuration and actual remote CI execution are different evidence.
