# LAS-69 — Save / Save As / Open project and section presets

Jira: [LAS-69](https://genstek69.atlassian.net/browse/LAS-69) · Sprint 10 package · Mode: IMPLEMENT (enhancement; depends on [LAS-60](../LAS-60/README.md))

Branch `delivery/LAS-40-sprint-10` · implementation commit `6793920`, review fix `e42b2ff` · tested application commit `2c5d0ce`

Developer status: **READY_FOR_QA** (proposed) for the browser flows · Apple native save/share (LAS-58): **NOT_RUN** · Gennady manual QA: **NOT_RUN**

## What was reused (audit)
- **LAS-28 settings files** (`mps-chain`, Settings… dialog) and **session snapshots**: kept as they are; the project embeds the same `mps-chain` (now v2 with Space) and uses its validation and migration.
- **LAS-33 account presets** (`mps-preset`, signed-in owner): kept; still whole-chain.
- **LAS-35 stem session files** (`mps-stem-session`, SHA-256 matching): the project uses the same per-stem identity (SHA-256) and strip fields.
None of these was a project: none stored the track identity, the window layout, the listening choice or a project name, and none could reopen a session.

## Three kinds of saving, three different words
| Action | Where | What it contains | File |
| --- | --- | --- | --- |
| **Save project / Save project as / Open project** | Project ▾ menu, Ctrl/⌘ S, ⇧ Ctrl/⌘ S, Ctrl/⌘ O | the whole session: name and id, chain (all modules incl. Space), stems with strip settings and their chains, Processed/Original, editor window layout, and the identity of each audio file | `<name>.mps-project.json` (`mps-project` v1) |
| **Save <module> preset / Load <module> preset…** | top of each editor (EQ, Dynamics, Limiter, Space) | one module's settings only; loading changes only that module, as one undo step | `<module>-preset.mps-module.json` (`mps-module-preset` v1) |
| **Export WAV** | Master panel | rendered audio | `<track>-master.wav` |

## Media policy: manifest with relink (decided before implementation)
A project file is a **manifest**, not a bundle: it stores each file's **name, size, SHA-256** and decoded duration/rate/channels, never the audio. A browser cannot silently reopen arbitrary local paths, and copying hundreds of MiB of audio into a settings file would be slow and fragile, so:
- **Open** restores every setting immediately and lists the audio as **Missing audio** with a **Relink…** button per file. Only a file with the saved SHA-256 is accepted ("…is not the saved mix.wav (its SHA-256 differs). Choose the original file."). Relinked stems get their saved offset, gain, pan, mute, solo and chain.
- Skipping relink keeps the project **incomplete and visible**: the header shows "N audio files missing — Relink…"; saving keeps the missing entries in the manifest, so nothing is dropped.
- Nothing is uploaded; there is no cloud saving in this slice (local save needs no account).
- A self-contained bundle (audio inside) would be a separate decision; it is not promised.

## Saving behaviour
- **Where the browser supports file handles** (File System Access API: Chrome/Edge on macOS, Windows, Linux): the first **Save** asks for a destination; later Saves **update that file**; **Save As** asks for a new file and gives the copy a **new project id**, so the original is never overwritten. Writes go through `createWritable()`, which replaces the file only when the write closes successfully.
- **Elsewhere** (Safari, Firefox, iOS WebKit): Save and Save As **download** a new `.mps-project.json`; the status says "Saved as a download (…)" and nothing claims to overwrite a file. Open uses the browser's file picker. Native macOS/iOS save panels belong to the Apple wrapper (LAS-58, PR #43): its WKWebView turns downloads into a save panel; **not run here** (no macOS).
- **States** in the header: Not saved yet → Unsaved changes → Saving… → Saved to … / Saved as a download (…); "Save failed: <reason> Your work is still here."; a cancelled picker changes nothing.
- "Unsaved changes" compares the session with what was last saved, opened or created. It is cleared **only after the write succeeded**, and **only for what that write contained**: an edit made while a save is in progress stays unsaved.
- **Ctrl/⌘ S** saves the project (the browser's Save Page is prevented); **⇧ Ctrl/⌘ S** Save As; **Ctrl/⌘ O** Open.
- **New / Open** with work in the session ask **Save / Discard / Cancel**; Save continues only if the save succeeded. **Leaving the page** with unsaved changes triggers the browser's leave-page question.

## Opening behaviour
- The whole file is validated first (schema, version, size ≤ 5 MiB, every setting and checksum); corrupt, foreign, newer or oversized files are refused with the reason and **nothing changes**.
- Older chain settings inside a project are migrated (`mps-chain` v1 → v2 with Space off). `mps-project` v1 is the first version; future versions add step-by-step migrations like the chain schema.
- **Playback never starts** on Open. Temporary states are not saved: playback position, analysis/comparison results, proposals in progress (a proposal *preview* is not the saved chain), undo history, Master Level (a per-browser listening preference).

## Validation
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| Visible menu with clear names; Ctrl/⌘ S without Save Page | menu items "Open project", "Save project", "Save project as"; synthetic Ctrl+S `defaultPrevented` | PASS | `tests/e2e/project.spec.js` |
| First Save asks; Save updates; Save As isolates | picker once; same file updated; copy has a new id; original unchanged after the copy is edited and saved | PASS | same |
| Versioned format restores identity, track/stems and alignment, gain/pan/mute/solo, chain incl. bypass/order, listening, layout | saved JSON compared value by value; after a reload and Open the chain equals the saved one (Settings download), Original restored, Limiter window open at its saved x, stem gain −6 and Mute restored after relink | PASS | same |
| No auto-play on Open | status "No audio loaded", then "Ready" after relink | PASS | same |
| Missing media listed with relink; never dropped | 2 files missing; wrong file refused; right files accepted; header button while incomplete | PASS | same |
| Unsaved / Saving / Saved / failure; dirty only cleared after a durable write; edits during save stay unsaved | cancel, failing write ("The disk is full."), held write with an edit in between | PASS | same |
| Protect work on New / Open / close | Save/Discard/Cancel (LAS-60 test); beforeunload dialog | PASS | same |
| Corrupt / newer files rejected without changes | broken JSON, version 9 | PASS | same + `tests/unit/project.test.js` |
| Local save without login; download fallback | API removed: download named `Untitled project.mps-project.json`, Open via file chooser, relink listed | PASS | same |
| Section presets: scope, undo, refusal | Space preset changes only Space; undo; Space preset refused in Limiter; whole-chain files refused | PASS | same + `tests/unit/module-presets.test.js` |
| Project includes closed editors' settings | Space set and its editor closed before saving | PASS | same |
| The same WAV on two strips relinks as two strips | two strips (−3 and −9 dB) from one file: saved, reopened, relinked one at a time ("(1 of 2)"), both restored with their own gain | PASS | `project.spec.js` |
| A same-name, same-size replacement is unsaved | revised mix with the same byte size → "Unsaved changes"; a SHA-verified relink stays clean | PASS | `project.spec.js`, `project.test.js` |

## Found after the first delivery (PR #45 review)
- **Duplicate stems collapsed on relink** (Codex P1, Cursor Bugbot): relinking one stem removed every missing entry with that SHA-256, so the second strip and its settings were lost on the next Save. Each missing stem now keeps its saved slot; rows show gain, pan and offset — `e42b2ff`.
- **Same-name, same-size replacement looked saved** (Codex P2): the unsaved-changes key compared name and size only. It now includes a media identity (a token per loaded file, or the saved SHA-256 after a verified relink) — `e42b2ff`.

## Not done / limitations
- **Reference associations are not stored.** The Compare dialog keeps its chosen reference only while it is open (LAS-31); there is no session-level reference selection to save yet. Listed for LAS-66 and a follow-up.
- Loudness-match on/off is not stored (it lives inside the Master panel control); the project restores Processed/Original.
- The File System Access flows were tested with an in-memory stand-in for the browser's pickers (headless browsers cannot drive native dialogs); the download fallback ran for real. Real Chrome on macOS: **NOT_RUN**.
- Apple wrapper native save/share (LAS-58): **NOT_RUN**; PR #43 was inspected, not merged.

Manual QA: [`manual-qa.md`](manual-qa.md) — **NOT_RUN**.

## Evidence on the tested commit `2c5d0ce`
- Test results: [`evidence/test-log-2c5d0ce.txt`](evidence/test-log-2c5d0ce.txt), an extract of [`../sprints/10/final/`](../sprints/10/final/). The full `npm run check` exited 0: Playwright 119/119 and Vitest 313/313.
- Screenshots (Chromium 153, headless, synthetic tone; the viewport is in each file name): [`project-menu-1280x720.png`](evidence/project-menu-1280x720.png), [`section-presets-limiter-1280x720.png`](evidence/section-presets-limiter-1280x720.png)
- Records: [`results.json`](results.json) · [`jira-update.md`](jira-update.md) · [`manual-qa.md`](manual-qa.md) (**NOT_RUN**)
