# Complete Jira inventory

Retrieved 29 October 2026. Query: `project = LAS ORDER BY key ASC`; one complete page, 56 issues, no next page. Native board/sprint operations independently returned board 1 and all 10 sprints. Missing key LAS-54 is not synthesized.

There are 56 issues: 8 closed baseline records, 48 not closed. The latter comprise 36 actionable work orders, 8 epic rollups, LAS-40 coordination and 3 empty sample placeholders. Twenty-seven work orders are assigned to the nine future LAS sprints; nine cover current/unscheduled foundations and QA.

| Issue | Type | Jira status | Handling | Sprint field | Summary |
| --- | --- | --- | --- | --- | --- |
| [LAS-1](https://genstek69.atlassian.net/browse/LAS-1) | Task | Done | CLOSED_BASELINE | SCRUM Sprint 0 | Task 1 |
| [LAS-2](https://genstek69.atlassian.net/browse/LAS-2) | Story | In Progress | UNSPECIFIED_PLACEHOLDER | SCRUM Sprint 0 | Task 2 |
| [LAS-3](https://genstek69.atlassian.net/browse/LAS-3) | Task | In Progress | UNSPECIFIED_PLACEHOLDER | Unscheduled | Task 3 |
| [LAS-4](https://genstek69.atlassian.net/browse/LAS-4) | Subtask | To Do | UNSPECIFIED_PLACEHOLDER | Unscheduled | Subtask 2.1 |
| [LAS-5](https://genstek69.atlassian.net/browse/LAS-5) | Epic | To Do | EPIC_ROLLUP | Unscheduled | MPS Audio Studio — Web Mixer & QA Automation |
| [LAS-6](https://genstek69.atlassian.net/browse/LAS-6) | Task | QA Done | CLOSED_BASELINE | Unscheduled | Audit MPS repository and align web-first architecture |
| [LAS-7](https://genstek69.atlassian.net/browse/LAS-7) | Story | In Progress | WORK_ORDER | SCRUM Sprint 0 | Build runnable web mixer shell with Fostex-inspired channel strips |
| [LAS-8](https://genstek69.atlassian.net/browse/LAS-8) | Story | To Do | WORK_ORDER | Unscheduled | Import WAV audio and display a track in the mixer |
| [LAS-9](https://genstek69.atlassian.net/browse/LAS-9) | Story | To Do | WORK_ORDER | Unscheduled | Implement real Play/Pause transport for imported WAV |
| [LAS-10](https://genstek69.atlassian.net/browse/LAS-10) | Task | In Progress | WORK_ORDER | SCRUM Sprint 0 | Set up Playwright JS and first browser smoke tests |
| [LAS-11](https://genstek69.atlassian.net/browse/LAS-11) | Story | To Do | WORK_ORDER | Unscheduled | Resume paused audio with either Pause or Play |
| [LAS-12](https://genstek69.atlassian.net/browse/LAS-12) | Story | To Do | WORK_ORDER | Unscheduled | Unload the imported track and return the mixer to its empty state |
| [LAS-13](https://genstek69.atlassian.net/browse/LAS-13) | Epic | To Do | EPIC_ROLLUP | Unscheduled | User accounts — registration, login and account recovery |
| [LAS-14](https://genstek69.atlassian.net/browse/LAS-14) | Epic | To Do | EPIC_ROLLUP | Unscheduled | Protect user projects, audio files and personal data |
| [LAS-15](https://genstek69.atlassian.net/browse/LAS-15) | Epic | To Do | EPIC_ROLLUP | Unscheduled | Build a measurable mastering engine with preview and WAV export |
| [LAS-16](https://genstek69.atlassian.net/browse/LAS-16) | Epic | To Do | EPIC_ROLLUP | Unscheduled | Reference-guided mastering and reusable sound profiles |
| [LAS-17](https://genstek69.atlassian.net/browse/LAS-17) | Epic | To Do | EPIC_ROLLUP | Unscheduled | Stem mixing, stem mastering and AI separation research |
| [LAS-18](https://genstek69.atlassian.net/browse/LAS-18) | Epic | To Do | EPIC_ROLLUP | Unscheduled | Research and prototype native VST3/AU plugin hosting |
| [LAS-19](https://genstek69.atlassian.net/browse/LAS-19) | Task | To Do | WORK_ORDER | LAS Sprint 01 | Choose authentication architecture and define account/session flows |
| [LAS-20](https://genstek69.atlassian.net/browse/LAS-20) | Task | To Do | WORK_ORDER | LAS Sprint 01 | Define privacy rules, data lifecycle and threat model for studio assets |
| [LAS-21](https://genstek69.atlassian.net/browse/LAS-21) | Story | To Do | WORK_ORDER | LAS Sprint 01 | Add registration, verified login and logout to the studio |
| [LAS-22](https://genstek69.atlassian.net/browse/LAS-22) | Story | To Do | WORK_ORDER | LAS Sprint 02 | Add password recovery, session expiry and authentication abuse controls |
| [LAS-23](https://genstek69.atlassian.net/browse/LAS-23) | Story | To Do | WORK_ORDER | LAS Sprint 02 | Enforce private audio storage, ownership checks and safe uploads |
| [LAS-24](https://genstek69.atlassian.net/browse/LAS-24) | Story | To Do | WORK_ORDER | LAS Sprint 02 | Add project/account deletion and explicit external-processing consent |
| [LAS-25](https://genstek69.atlassian.net/browse/LAS-25) | Task | To Do | WORK_ORDER | LAS Sprint 02 | Verify authentication, cross-user isolation and sensitive-data handling |
| [LAS-26](https://genstek69.atlassian.net/browse/LAS-26) | Story | To Do | WORK_ORDER | LAS Sprint 03 | Analyze WAV loudness, true peaks, spectrum, dynamics and stereo behavior |
| [LAS-27](https://genstek69.atlassian.net/browse/LAS-27) | Task | To Do | WORK_ORDER | LAS Sprint 03 | Implement a reproducible EQ, compressor and limiter processing chain |
| [LAS-28](https://genstek69.atlassian.net/browse/LAS-28) | Story | To Do | WORK_ORDER | LAS Sprint 04 | Add editable mastering controls, level-matched A/B and processed WAV export |
| [LAS-29](https://genstek69.atlassian.net/browse/LAS-29) | Task | To Do | WORK_ORDER | LAS Sprint 04 | Establish DSP regression fixtures and a mastering listening-review protocol |
| [LAS-30](https://genstek69.atlassian.net/browse/LAS-30) | Story | To Do | WORK_ORDER | LAS Sprint 05 | Import reference audio and save versioned sound profiles |
| [LAS-31](https://genstek69.atlassian.net/browse/LAS-31) | Story | To Do | WORK_ORDER | LAS Sprint 05 | Compare a mix with its reference at matched loudness |
| [LAS-32](https://genstek69.atlassian.net/browse/LAS-32) | Story | To Do | WORK_ORDER | LAS Sprint 06 | Generate and apply an explainable reference-guided mastering proposal |
| [LAS-33](https://genstek69.atlassian.net/browse/LAS-33) | Story | To Do | WORK_ORDER | LAS Sprint 06 | Save mastering preferences and reusable reference-based presets |
| [LAS-34](https://genstek69.atlassian.net/browse/LAS-34) | Story | To Do | WORK_ORDER | LAS Sprint 07 | Import original stems and play them through synchronized mixer channels |
| [LAS-35](https://genstek69.atlassian.net/browse/LAS-35) | Story | To Do | WORK_ORDER | LAS Sprint 07 | Process individual stems and render a synchronized stem master |
| [LAS-36](https://genstek69.atlassian.net/browse/LAS-36) | Task | To Do | WORK_ORDER | LAS Sprint 08 | Evaluate AI stem separation quality, runtime and deployment options |
| [LAS-37](https://genstek69.atlassian.net/browse/LAS-37) | Task | To Do | WORK_ORDER | LAS Sprint 08 | Design and evaluate a native VST3/AU host bridge for the web studio |
| [LAS-38](https://genstek69.atlassian.net/browse/LAS-38) | Task | To Do | WORK_ORDER | LAS Sprint 09 | Prototype application-controlled plugin processing after host feasibility passes |
| [LAS-39](https://genstek69.atlassian.net/browse/LAS-39) | Task | To Do | WORK_ORDER | LAS Sprint 09 | Assess training a separate audio model from references and user feedback |
| [LAS-40](https://genstek69.atlassian.net/browse/LAS-40) | Task | To Do | COORDINATION | Unscheduled | Product roadmap — 7 feature epics and LAS Sprints 01–09 |
| [LAS-41](https://genstek69.atlassian.net/browse/LAS-41) | Epic | To Do | EPIC_ROLLUP | Unscheduled | UI/UX redesign — define and build the intended LoVerse OS studio experience |
| [LAS-42](https://genstek69.atlassian.net/browse/LAS-42) | Task | To Do | WORK_ORDER | LAS Sprint 01 | Audit the prototype UI and agree the studio's visual direction with Gennady |
| [LAS-43](https://genstek69.atlassian.net/browse/LAS-43) | Task | To Do | WORK_ORDER | LAS Sprint 02 | Design studio navigation and interactive wireframes for the core user journeys |
| [LAS-44](https://genstek69.atlassian.net/browse/LAS-44) | Task | To Do | WORK_ORDER | LAS Sprint 03 | Create a design system and approved high-fidelity studio screen designs |
| [LAS-45](https://genstek69.atlassian.net/browse/LAS-45) | Story | To Do | WORK_ORDER | LAS Sprint 04 | Implement the approved studio shell, mixer controls and shared account components |
| [LAS-46](https://genstek69.atlassian.net/browse/LAS-46) | Story | To Do | WORK_ORDER | LAS Sprint 07 | Implement the approved mastering, reference, stem and export workflows |
| [LAS-47](https://genstek69.atlassian.net/browse/LAS-47) | Task | To Do | WORK_ORDER | LAS Sprint 07 | Review usability, accessibility and visual consistency across the redesigned studio |
| [LAS-48](https://genstek69.atlassian.net/browse/LAS-48) | Story | In Progress | WORK_ORDER | SCRUM Sprint 0 | Make the studio workspace responsive to window and screen resizing |
| [LAS-49](https://genstek69.atlassian.net/browse/LAS-49) | Task | In Progress | WORK_ORDER | Unscheduled | Test plan — LAS-48 responsive workspace (24 test cases) |
| [LAS-50](https://genstek69.atlassian.net/browse/LAS-50) | Bug | Done | CLOSED_BASELINE | SCRUM Sprint 0 | Mixer is partially outside the viewport at 1280×720 in an empty workspace |
| [LAS-51](https://genstek69.atlassian.net/browse/LAS-51) | Bug | Done | CLOSED_BASELINE | SCRUM Sprint 0 | MPS Audio Studio - Tracks content is clipped, and Export WAV overlaps Master content at smaller viewport sizes |
| [LAS-52](https://genstek69.atlassian.net/browse/LAS-52) | Test Plan | Done | CLOSED_BASELINE | SCRUM Sprint 0 | LAS-10 — Playwright JS Setup & Browser Smoke Tests — Test Plan |
| [LAS-53](https://genstek69.atlassian.net/browse/LAS-53) | Test Case | Done | CLOSED_BASELINE | SCRUM Sprint 0 | LAS-10-TC-001: Verify that the mixer application loads correctly |
| [LAS-55](https://genstek69.atlassian.net/browse/LAS-55) | Test Execution | Done | CLOSED_BASELINE | SCRUM Sprint 0 | TC-001 — Manual Smoke Execution — 2026-10-25 |
| [LAS-56](https://genstek69.atlassian.net/browse/LAS-56) | Test Execution | Done | CLOSED_BASELINE | SCRUM Sprint 0 | TC-001 — Playwright Chromium Execution — 2026-10-25 |
| [LAS-57](https://genstek69.atlassian.net/browse/LAS-57) | Test Case | To Do | WORK_ORDER | SCRUM Sprint 0 | LAS-10-TC-002: Verify that a valid WAV file is imported successfully |

LAS-1 is a completed empty sample. LAS-2/3/4 have no requirements and remain UNDEFINED; do not infer product work from their titles or delete them. LAS-55 is currently a **completed Test Execution**, not a WAV-import bug. LAS-57 is the open valid-WAV TC-002. Eight epic records are rollups, not additional implementations to duplicate.
