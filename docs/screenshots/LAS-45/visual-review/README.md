# LAS-45 visual review: approved concept (left) vs app (right)

`compare-{a,b,c,d}-{1672x941,1920x1080}.png`: target = `docs/design/approved-references/MPS-UI2-Concept-*.png` (owner-supplied mockups, not app screenshots); actual = headless Chromium capture of the first screen with a synthetic stereo tone as the track plus three synthetic-tone stems, playing. `app-*` files are the raw captures. They come from a throwaway script, not a pixel-diff regression baseline.

## Discrepancy matrix (what visibly still differs)
| Concept | Matches | Does not match |
|---|---|---|
| A | Left Scenes/Snapshots/Monitor rail, EQ view + analyzer above a narrow-strip bank, master over channel inspector at right, charcoal/cyan | Strip bank starts near/below the bottom of the first screen (Tracks bar sits above it); EQ curve is flat until bands are enabled, separate axis from spectrum; Scenes/Snapshots/Output/stereo scope are inert PLANNED; only real stems are strips, rest PLANNED with no meters; no top menu/tab row, BPM/key/record/loop; strips lack icons, INS/SND rows, group bar |
| B | Amber tone, very narrow tall strips with read-only EQ/DYN knobs from each stem's own chain, upright master fader, VU needles, bottom analysis dock | Real stems only, other positions PLANNED; no HPF/Ø/sends/R buttons, no per-strip VU/meters; master VUs are RMS needles of the real monitor bus; master EQ/DYN/TAPE/DRIVE/STEREO absent; phase scope and LUFS history unavailable; bank is sparse with few stems |
| C | Five-panel analysis row, workflow rail, selected-chain editor, routing matrix (PLANNED), bank + master lower | Bank and master below the first 941 px; vectorscope PLANNED; routing inert; no status bar; loudness is offline values only |
| D | Left nav + workspace + quick view, selected-channel inspector, tall strips, right master rack with needles and fader, analysis row | Inspector shows knobs of the real master chain, no band table/insert rack/comp VU; 8 positions, rest PLANNED; Quick View shows master L/R only; vectorscope PLANNED |

Strip faders, pan, mute and solo are read-only depictions of the real stem session; editing stays in the Stems dialog (Stage 2). Ventura 13 WKWebView: NOT RUN.
