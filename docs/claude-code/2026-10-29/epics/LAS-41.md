# LAS-41 — UI/UX redesign — define and build the intended LoVerse OS studio experience

Jira: https://genstek69.atlassian.net/browse/LAS-41

## Product problem

The user explicitly rejects the current prototype's visual appearance as the intended final product. Treat it as a functional prototype, not an approved design baseline.

## Goal

Define with Gennady how MPS Audio Studio / LoVerse OS should look and feel, validate the core workflows, and implement a consistent usable interface across the mixer, mastering, reference, stem and account/privacy screens.

## Source

User request, 20 October 2026: include the large UI/UX workstream in the backlog. Repository: https://github.com/genstek/MPS-Audio-Studio

## Scope and proposed delivery

* Sprint 01: audit, user vision, reference collection and design brief.
* Sprint 02: navigation, user journeys and interactive wireframes.
* Sprint 03: design system and user-reviewed high-fidelity screen designs.
* Sprint 04: studio shell, transport, mixer controls, account components and responsive workspace behavior.
* Sprint 07: mastering/reference/stem workflows and usability/accessibility regression review.      
  This workstream starts early and runs alongside functional delivery. The seven UI/UX tasks are assigned to native future LAS Sprint 01–04 and 07; dates and capacity remain to be refined.

## Success criteria

* The chosen visual direction and key mockups are explicitly reviewed by Gennady before implementation; no unconfirmed theme or branding is imposed.
* Import → edit/process → A/B → export and sign-in/privacy flows are understandable, consistent and covered in the prototypes.
* Sliders, knobs, faders and transport have usable keyboard/focus behavior, clear units and complete states.
* Implemented layouts match approved designs on documented viewport sizes; UI changes preserve verified audio behavior.
* Visual regression, accessibility and manual task-based review evidence is recorded; unresolved findings are visible.

## Delivery rules

Do not replace the existing mixer during this planning task. Preserve LAS-10 learning, LAS-11 Pause/Resume and LAS-12 Unload. New code is reviewed through LAS-keyed PRs. Research/design acceptance is separate from shipped implementation.

## Responsive workspace

[LAS-48](https://genstek69.atlassian.net/browse/LAS-48) explicitly tracks adaptation to browser-window/screen width and height, readable controls, panel reflow, resize-safe playback and multi-viewport QA. Treat this as a separate delivery item coordinated with LAS-44/LAS-45, not an additional redesign theme.

## Child work orders

- [LAS-42 — Audit the prototype UI and agree the studio's visual direction with Gennady](../tasks/LAS-42.md)
- [LAS-43 — Design studio navigation and interactive wireframes for the core user journeys](../tasks/LAS-43.md)
- [LAS-44 — Create a design system and approved high-fidelity studio screen designs](../tasks/LAS-44.md)
- [LAS-45 — Implement the approved studio shell, mixer controls and shared account components](../tasks/LAS-45.md)
- [LAS-46 — Implement the approved mastering, reference, stem and export workflows](../tasks/LAS-46.md)
- [LAS-47 — Review usability, accessibility and visual consistency across the redesigned studio](../tasks/LAS-47.md)
- [LAS-48 — Make the studio workspace responsive to window and screen resizing](../tasks/LAS-48.md)
- [LAS-49 — Test plan — LAS-48 responsive workspace (24 test cases)](../tasks/LAS-49.md)

Roll up actual child evidence. Do not implement this epic a second time or mark it Done until its acceptance and Gennady's required reviews are met. Related existing closed records remain in INVENTORY.md and sources/jira-issues.json.
