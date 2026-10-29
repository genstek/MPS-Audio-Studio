# LAS-18 — Research and prototype native VST3/AU plugin hosting

Jira: https://genstek69.atlassian.net/browse/LAS-18

## Goal

Evaluate an optional native audio host and a controlled application interface for suitable installed plugins.

## Source

Product planning with Gennady, 20 October 2026 (Asia/Jerusalem). Repository: https://github.com/genstek/MPS-Audio-Studio

## Planned delivery

Proposed sprints 08–09. This is an initial roadmap, not a time or capacity commitment. Research outcomes determine whether later prototypes proceed.

## Success criteria

* An architecture decision compares native hosting, browser DSP and offline rendering with measured evidence.
* A gated prototype loads a permitted test plugin and verifies processing, parameter recall and failure recovery.
* No claim of universal plugin support; supported formats, platform limits and licenses are recorded.

## Definition of done

Linked GitHub PR or research report; acceptance criteria checked; appropriate automated checks and manual evidence recorded; limitations documented. Existing mixer work is tracked under LAS-5; do not duplicate LAS-8 through LAS-12.

## Child work orders

- [LAS-37 — Design and evaluate a native VST3/AU host bridge for the web studio](../tasks/LAS-37.md)
- [LAS-38 — Prototype application-controlled plugin processing after host feasibility passes](../tasks/LAS-38.md)

Roll up actual child evidence. Do not implement this epic a second time or mark it Done until its acceptance and Gennady's required reviews are met. Related existing closed records remain in INVENTORY.md and sources/jira-issues.json.
