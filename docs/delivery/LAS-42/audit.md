# Current studio UI audit (LAS-42)

Audited with `evidence/tools/ui-audit.mjs.txt` on Chromium 141 (Linux): empty and WAV-loaded states at 1280×720, loaded at 761×450, empty at 390×844. Raw numbers: `evidence/audit/measurements.json`. Numbered boxes in `evidence/audit/annotated-*.png` match the first seven rows.

| # | Area | Finding | Evidence | Severity |
| --- | --- | --- | --- | --- |
| 1 | Transport | Disabled Play keeps the gold primary colour (58 % opacity), so it can look available before a track is loaded | `annotated-empty-1280x720.png` #1 | Medium |
| 2 | Transport | One amber dot for every status; Playing, Paused and Stopped differ only by the word | `annotated-loaded-1280x720.png` #2 | Low |
| 3 | Header | Development label "SPRINT 0 / WEB MIXER" is shown to users | #3 | Low |
| 4 | Tracks | Large mostly empty area; no waveform, no seek; the time read-out is the only position cue | #4 | Medium (workflow) |
| 5 | Master | Decorative "L │ R" glyph could be read as a meter (non-negotiable: meters must measure real audio) | #5 | Medium |
| 6 | Mixer | Four placeholder strips with decorative knobs take a full row on every screen size | #6 | Medium |
| 7 | Footer | Roadmap sentence in product UI, 10 px | #7 | Low |
| 8 | Readability | 22 text items below 12 px at 1280×720, smallest 9 px (badges, track footer, eyebrow labels); contrast itself passes 4.5:1 for all enabled text | `measurements.json` | Medium |
| 9 | Target size | "Remove track" is 93×19 px; below the WCAG 2.2 24×24 px minimum, passing only through the spacing exception | `measurements.json` targets | Low |
| 10 | Accessibility | After import the visible "Replace WAV" keeps the accessible name "Import WAV" (label-in-name) | LAS-57 finding | Medium |
| 11 | Small screens | In the stacked layout (390×844) Transport scrolls away; while viewing the strips there is no visible Play/Stop | `current-empty-390x844.png` | Medium |
| 12 | Workflow | No keyboard shortcuts (Space for play/pause), no undo, no A/B, no reference switch — the main mastering loop is not supported yet | UX spec vs current app | High (future scope) |
| 13 | Feedback | No loading progress for large files; "Loading audio…" text only | LAS-8 limitation | Low |

Not problems: enabled text contrast (all ≥ 4.5:1), visible focus rings (LAS-48 TC-011), no page overflow at desktop sizes (LAS-51/48).
