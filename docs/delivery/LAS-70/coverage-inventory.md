# LAS-70 — Contextual help coverage inventory

Source of every text: `src/help-content.js` (one central list). Each row: where the control is, the function name shown in the popover, the ⓘ button's accessible name, the short hint, and the anchor of the detailed help in the in-app **Studio help** view (opened by "More about …" or the Help button in the header). Every anchor is checked to exist by `tests/e2e/help.spec.js`.

## Covered: 62 functions, each with its own ⓘ
| Where | Function | ⓘ accessible name | Short hint (popover) | Detailed help anchor | Status |
| --- | --- | --- | --- | --- | --- |
| Transport → project area / header | New project | `Help for New project` | Starts a new, named project with no audio and default processing. If the session has work in it you are asked to save, discard or cancel first. | `#help-project-new` | COVERED |
| Transport → project area / header | Project menu | `Help for Project menu` | Open, Save and Save As for the whole project (Ctrl/⌘ O, Ctrl/⌘ S, Shift+Ctrl/⌘ S). | `#help-project-menu` | COVERED |
| Transport → project area / header | Project status | `Help for Project status` | Shows whether the project has unsaved changes, is saving, was saved, or failed to save. | `#help-project-status` | COVERED |
| Transport, Tracks footer and player display | Play | `Help for Play` | Starts playback from the current position. | `#help-transport-play` | COVERED |
| Transport, Tracks footer and player display | Pause | `Help for Pause` | Pauses and keeps the position; press again to resume. | `#help-transport-pause` | COVERED |
| Transport, Tracks footer and player display | Stop | `Help for Stop` | Stops playback and returns to the start. | `#help-transport-stop` | COVERED |
| Transport, Tracks footer and player display | Rewind | `Help for Rewind` | Moves the playhead back 5 seconds; hold to keep going (25 s per second). | `#help-transport-rewind` | COVERED |
| Transport, Tracks footer and player display | Fast forward | `Help for Fast forward` | Moves the playhead forward 5 seconds; hold to keep going (25 s per second). | `#help-transport-forward` | COVERED |
| Transport, Tracks footer and player display | Timeline | `Help for Timeline` | Shows and sets the playback position; drag it or use the arrow keys. | `#help-transport-timeline` | COVERED |
| Transport, Tracks footer and player display | Output level meters | `Help for Output level meters` | Left and right level of what you hear (after Master Level), with peak hold and a clip light. | `#help-transport-meters` | COVERED |
| Transport, Tracks footer and player display | Clip indicator | `Help for Clip indicator` | Lights when a sample at or above 0 dBFS reached the output; click to reset. | `#help-transport-clip` | COVERED |
| Transport, Tracks footer and player display | Needle meters | `Help for Needle meters` | Left/right RMS level with VU-like movement (about 300 ms), on a dBFS scale. | `#help-transport-needles` | COVERED |
| Transport, Tracks footer and player display | Output spectrum | `Help for Output spectrum` | The frequency content of what you hear, from 20 Hz to 20 kHz. | `#help-transport-spectrum` | COVERED |
| Tracks panel | Import or replace WAV | `Help for Import or replace WAV` | Loads a WAV file (up to 250 MiB) from this device; it is not uploaded. | `#help-tracks-import` | COVERED |
| Tracks panel | Remove track | `Help for Remove track` | Takes the track out of the session; the file on your device is not touched. | `#help-tracks-remove` | COVERED |
| Tracks panel | Analyze | `Help for Analyze` | Measures loudness, peaks, spectrum and stereo of the imported file. | `#help-tracks-analyze` | COVERED |
| Tracks panel | Compare with a reference | `Help for Compare with a reference` | Compares your mix with a reference track and can propose settings. | `#help-tracks-compare` | COVERED |
| Master panel | Listen to (Processed / Original) | `Help for Listen to (Processed / Original)` | Switches between the processed and the original sound without changing the position. | `#help-master-listen` | COVERED |
| Master panel | Match loudness | `Help for Match loudness` | Plays the louder version quieter so the comparison is fair. | `#help-master-match` | COVERED |
| Master panel | Master level | `Help for Master level` | Your listening volume, from mute to 0 dB. It is not part of the exported WAV. | `#help-master-level` | COVERED |
| Master panel | Export WAV | `Help for Export WAV` | Renders the processed track to a new WAV file; the source is not changed. | `#help-master-export` | COVERED |
| Mixer heading, strips and editor title bars | Undo / Redo | `Help for Undo / Redo` | Steps back or forward through processing changes (Ctrl/⌘ Z, Shift+Ctrl/⌘ Z). | `#help-mixer-undo` | COVERED |
| Mixer heading, strips and editor title bars | Reset window layout | `Help for Reset window layout` | Puts every editor window back to its first place. | `#help-mixer-reset-layout` | COVERED |
| Mixer heading, strips and editor title bars | Settings | `Help for Settings` | Snapshots, whole-chain settings files and your account presets. | `#help-mixer-settings` | COVERED |
| Mixer heading, strips and editor title bars | Stems | `Help for Stems` | Plays several stems together through the master chain, each on its own strip. | `#help-mixer-stems` | COVERED |
| Mixer heading, strips and editor title bars | EQ module | `Help for EQ module` | 24-band parametric EQ per channel; opens the EQ editor. | `#help-mixer-eq` | COVERED |
| Mixer heading, strips and editor title bars | Dynamics module | `Help for Dynamics module` | Compressor; opens the Dynamics editor. | `#help-mixer-dynamics` | COVERED |
| Mixer heading, strips and editor title bars | Limiter module | `Help for Limiter module` | True-peak limiter; opens the Limiter editor. | `#help-mixer-limiter` | COVERED |
| Mixer heading, strips and editor title bars | Space module | `Help for Space module` | Stereo reverb; opens the Space editor. | `#help-mixer-space` | COVERED |
| Mixer heading, strips and editor title bars | Move window | `Help for Move window` | Drag the title bar to move the editor; with the keyboard use the arrow keys here (Home resets). | `#help-mixer-window` | COVERED |
| EQ editor | EQ edit mode (Link / Left / Right) | `Help for EQ edit mode (Link / Left / Right)` | Link edits both channels together; Left or Right edits one channel. | `#help-eq-channels` | COVERED |
| EQ editor | EQ on | `Help for EQ on` | Switches the whole EQ on or off (bypass). | `#help-eq-on` | COVERED |
| EQ editor | EQ curve | `Help for EQ curve` | Drag a point to change a band; double-click to add one; the shaded area is the live spectrum. | `#help-eq-curve` | COVERED |
| EQ editor | Band selector | `Help for Band selector` | Chooses which of the 24 bands the fields below edit. | `#help-eq-bands` | COVERED |
| EQ editor | Band on | `Help for Band on` | Switches the selected band on or off. | `#help-eq-band-on` | COVERED |
| EQ editor | Band type | `Help for Band type` | Bell, low/high shelf or low/high-pass for the selected band. | `#help-eq-type` | COVERED |
| EQ editor | Frequency | `Help for Frequency` | The centre or corner frequency of the band, 20 Hz–20 kHz. | `#help-eq-frequency` | COVERED |
| EQ editor | Gain | `Help for Gain` | Boost or cut of the band in dB (±18 dB). | `#help-eq-gain` | COVERED |
| EQ editor | Q | `Help for Q` | Width of the band: higher Q is narrower. | `#help-eq-q` | COVERED |
| Dynamics editor | Compressor on | `Help for Compressor on` | Switches the compressor on or off (bypass). | `#help-dynamics-on` | COVERED |
| Dynamics editor | Detector | `Help for Detector` | Peak follows every peak; RMS (10 ms) follows the average level. | `#help-dynamics-detector` | COVERED |
| Dynamics editor | Threshold | `Help for Threshold` | Level (dBFS) above which the compressor reduces gain. | `#help-dynamics-threshold` | COVERED |
| Dynamics editor | Ratio | `Help for Ratio` | How strongly levels above the threshold are reduced (e.g. 4:1). | `#help-dynamics-ratio` | COVERED |
| Dynamics editor | Attack | `Help for Attack` | How fast gain reduction starts (ms). | `#help-dynamics-attack` | COVERED |
| Dynamics editor | Release | `Help for Release` | How fast gain reduction recovers (ms). | `#help-dynamics-release` | COVERED |
| Dynamics editor | Knee | `Help for Knee` | Width of the soft transition around the threshold (dB). | `#help-dynamics-knee` | COVERED |
| Dynamics editor | Makeup gain | `Help for Makeup gain` | Gain added after compression (dB). | `#help-dynamics-makeup` | COVERED |
| Limiter editor | Limiter on | `Help for Limiter on` | Switches the true-peak limiter on or off. | `#help-limiter-on` | COVERED |
| Limiter editor | Limiter ceiling | `Help for Limiter ceiling` | Limits peaks above the chosen ceiling (dBTP). Excessive limiting can reduce dynamics. | `#help-limiter-ceiling` | COVERED |
| Limiter editor | Input gain | `Help for Input gain` | Raises the level into the limiter (dB) to make the result louder. | `#help-limiter-input` | COVERED |
| Limiter editor | Release | `Help for Release` | How fast the limiter recovers after a peak (ms). | `#help-limiter-release` | COVERED |
| Space editor | Space on | `Help for Space on` | Switches the reverb on or off; off by default. | `#help-space-on` | COVERED |
| Space editor | Space preset | `Help for Space preset` | Room, Hall or Plate starting points of the same reverb. | `#help-space-preset` | COVERED |
| Space editor | Mix (wet) | `Help for Mix (wet)` | How much reverb is heard (0 % dry … 100 % reverb only). | `#help-space-mix` | COVERED |
| Space editor | Pre-delay | `Help for Pre-delay` | Gap between the sound and the start of the reverb (ms). | `#help-space-predelay` | COVERED |
| Space editor | Decay (RT60) | `Help for Decay (RT60)` | Time for the reverb to fall by 60 dB at low frequencies (s). | `#help-space-decay` | COVERED |
| Space editor | Damping | `Help for Damping` | How much faster high frequencies fade than low ones. | `#help-space-damping` | COVERED |
| Every processor editor (section presets row) | Section presets | `Help for Section presets` | Save or load this module's settings only; loading is one undo step. | `#help-presets-section` | COVERED |
| Export dialog | Export format | `Help for Export format` | 24-bit PCM, or 16-bit PCM with TPDF dither. | `#help-export-format` | COVERED |
| Export dialog | Reverb tail | `Help for Reverb tail` | With Space on: include the reverb after the source ends, or cut it. | `#help-export-tail` | COVERED |
| Header (dialog-level) | References | `Help for References` | Measure and keep reference profiles (signed in) to compare against. | `#help-dialogs-references` | COVERED |
| Header (dialog-level) | Account | `Help for Account` | Sign in for private presets, references and a private library. | `#help-dialogs-account` | COVERED |

## Not yet covered at parameter level (honest gaps)
These controls are inside dialogs that existed before Sprint 10. They are reachable and labelled, and the dialog itself has an ⓘ where listed, but the individual fields have no ⓘ yet. They are the next content batch; nothing here claims coverage.

| Where | Controls without their own ⓘ | Dialog-level ⓘ | Status |
| --- | --- | --- | --- |
| Stems… dialog (LAS-34/35) | Add stem WAVs, stem Play/Pause/Stop/Position, per-stem Gain, Pan, Offset, Mute, Solo, Remove, Use master settings, Load settings…, Bypass, Save/Load session file, Bit depth, Render stem master | Stems (mixer heading) | NOT YET |
| Compare with a reference (LAS-31/32) | Reference source, profile, Choose reference WAV, section fields, monitor buttons, proposal strength and actions | Compare with a reference | NOT YET |
| References (LAS-30) | Choose reference WAV, Start/End, Name, Style, Source version, Measure, Save, profile actions | References | NOT YET |
| Account (LAS-21–24) | Sign-in/registration fields, recovery, library actions, consent and deletion | Account | NOT YET |
| Settings… (LAS-28/33) | Save snapshot, Restore/Delete, Download/Load settings file, preset save/import/apply/rename/export/delete, decisions | Settings | NOT YET |
| Analyze (LAS-26) | Analyse/Cancel | Analyze | NOT YET |
| Export dialog | Export / Export again / Cancel / Save file | Export WAV, Export format, Reverb tail | PARTIAL |
| New project, Save/Discard/Cancel, Missing audio dialogs (LAS-60/69) | Project name, Create/Cancel, Save/Discard/Cancel, Relink… | New project, Project menu | PARTIAL |
| Stem session transport in the Stems dialog | Master level (compact copy) | Master level (main panel) | PARTIAL |

Text rules followed: describes current behaviour only; units and ranges where useful; "Master level" says it is not in the exported WAV; the Limiter ceiling text follows Gennady's example. Language: English (the studio UI language).
