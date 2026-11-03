# LAS-17 — Stem mixing, stem mastering and AI separation research

Jira: https://genstek69.atlassian.net/browse/LAS-17

## Goal

Import synchronized original stems, process them separately and evaluate separation of stereo mixes as an optional workflow.

## Source

Product planning with Gennady, 20 October 2026 (Asia/Jerusalem). Repository: https://github.com/genstek/MPS-Audio-Studio

## Planned delivery

Proposed sprints 07–08. This is an initial roadmap, not a time or capacity commitment. Research outcomes determine whether later prototypes proceed.

## Success criteria

* Original stems play in sample-aligned synchronization with working gain, pan, mute and solo.
* Per-stem processing and combined export preserve timing and retain original inputs.
* AI separation is benchmarked for artifacts, runtime, cost and licensing before integration is approved.

## Definition of done

Linked GitHub PR or research report; acceptance criteria checked; appropriate automated checks and manual evidence recorded; limitations documented. Existing mixer work is tracked under LAS-5; do not duplicate LAS-8 through LAS-12.

## Child work orders

- [LAS-34 — Import original stems and play them through synchronized mixer channels](../tasks/LAS-34.md)
- [LAS-35 — Process individual stems and render a synchronized stem master](../tasks/LAS-35.md)
- [LAS-36 — Evaluate AI stem separation quality, runtime and deployment options](../tasks/LAS-36.md)

Roll up actual child evidence. Do not implement this epic a second time or mark it Done until its acceptance and Gennady's required reviews are met. Related existing closed records remain in INVENTORY.md and sources/jira-issues.json.
