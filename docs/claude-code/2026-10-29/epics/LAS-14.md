# LAS-14 — Protect user projects, audio files and personal data

Jira: https://genstek69.atlassian.net/browse/LAS-14

## Goal

Define and implement privacy and server-side access controls for source tracks, stems, references and exports.

## Source

Product planning with Gennady, 20 October 2026 (Asia/Jerusalem). Repository: https://github.com/genstek/MPS-Audio-Studio

## Planned delivery

Proposed sprints 01–02. This is an initial roadmap, not a time or capacity commitment. Research outcomes determine whether later prototypes proceed.

## Success criteria

* Two-account tests demonstrate isolation for every file and processing endpoint.
* Uploads are validated and processed with explicit size and resource limits.
* Retention, deletion, backup handling and external-service consent are documented and tested.

## Definition of done

Linked GitHub PR or research report; acceptance criteria checked; appropriate automated checks and manual evidence recorded; limitations documented. Existing mixer work is tracked under LAS-5; do not duplicate LAS-8 through LAS-12.

## Child work orders

- [LAS-20 — Define privacy rules, data lifecycle and threat model for studio assets](../tasks/LAS-20.md)
- [LAS-23 — Enforce private audio storage, ownership checks and safe uploads](../tasks/LAS-23.md)
- [LAS-24 — Add project/account deletion and explicit external-processing consent](../tasks/LAS-24.md)
- [LAS-25 — Verify authentication, cross-user isolation and sensitive-data handling](../tasks/LAS-25.md)

Roll up actual child evidence. Do not implement this epic a second time or mark it Done until its acceptance and Gennady's required reviews are met. Related existing closed records remain in INVENTORY.md and sources/jira-issues.json.
