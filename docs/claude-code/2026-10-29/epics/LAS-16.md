# LAS-16 — Reference-guided mastering and reusable sound profiles

Jira: https://genstek69.atlassian.net/browse/LAS-16

## Goal

Use uploaded reference tracks to derive sound profiles and propose constrained processing for the user's own music.

## Source

Product planning with Gennady, 20 October 2026 (Asia/Jerusalem). Repository: https://github.com/genstek/MPS-Audio-Studio

## Planned delivery

Proposed sprints 05–06, 09. This is an initial roadmap, not a time or capacity commitment. Research outcomes determine whether later prototypes proceed.

## Success criteria

* Profiles record the exact source/version and selected audio segment; different styles stay separate.
* The studio explains each proposed processing step and supports strength adjustment and undo.
* Preference feedback is saved explicitly; reference analysis is distinguished from training a separate model.

## Definition of done

Linked GitHub PR or research report; acceptance criteria checked; appropriate automated checks and manual evidence recorded; limitations documented. Existing mixer work is tracked under LAS-5; do not duplicate LAS-8 through LAS-12.

## Child work orders

- [LAS-30 — Import reference audio and save versioned sound profiles](../tasks/LAS-30.md)
- [LAS-31 — Compare a mix with its reference at matched loudness](../tasks/LAS-31.md)
- [LAS-32 — Generate and apply an explainable reference-guided mastering proposal](../tasks/LAS-32.md)
- [LAS-33 — Save mastering preferences and reusable reference-based presets](../tasks/LAS-33.md)
- [LAS-39 — Assess training a separate audio model from references and user feedback](../tasks/LAS-39.md)

Roll up actual child evidence. Do not implement this epic a second time or mark it Done until its acceptance and Gennady's required reviews are met. Related existing closed records remain in INVENTORY.md and sources/jira-issues.json.
