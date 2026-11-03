# LAS-15 — Build a measurable mastering engine with preview and WAV export

Jira: https://genstek69.atlassian.net/browse/LAS-15

## Goal

Analyze real audio and apply reproducible, reversible DSP processing rather than visual-only controls.

## Source

Product planning with Gennady, 20 October 2026 (Asia/Jerusalem). Repository: https://github.com/genstek/MPS-Audio-Studio

## Planned delivery

Proposed sprints 03–04. This is an initial roadmap, not a time or capacity commitment. Research outcomes determine whether later prototypes proceed.

## Success criteria

* Loudness, peak, spectral and stereo measurements are checked against known fixtures.
* The processing chain supports bypass and saved parameters, with the original preserved.
* Level-matched A/B and exported audio pass numerical checks and documented listening review.

## Definition of done

Linked GitHub PR or research report; acceptance criteria checked; appropriate automated checks and manual evidence recorded; limitations documented. Existing mixer work is tracked under LAS-5; do not duplicate LAS-8 through LAS-12.

## Child work orders

- [LAS-26 — Analyze WAV loudness, true peaks, spectrum, dynamics and stereo behavior](../tasks/LAS-26.md)
- [LAS-27 — Implement a reproducible EQ, compressor and limiter processing chain](../tasks/LAS-27.md)
- [LAS-28 — Add editable mastering controls, level-matched A/B and processed WAV export](../tasks/LAS-28.md)
- [LAS-29 — Establish DSP regression fixtures and a mastering listening-review protocol](../tasks/LAS-29.md)

Roll up actual child evidence. Do not implement this epic a second time or mark it Done until its acceptance and Gennady's required reviews are met. Related existing closed records remain in INVENTORY.md and sources/jira-issues.json.
