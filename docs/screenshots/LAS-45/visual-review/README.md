# LAS-45 visual review: approved concept (left) vs app (right)

`compare-{a,b,c,d}-{1672x941,1920x1080}.png`: left = `docs/design/approved-references/MPS-UI2-Concept-*.png`
(owner-supplied mockups, unchanged, SHA-256 in `SHA256SUMS.txt`); right = the app's **first screen**
(the viewport, not a tall page) in headless Chromium on Linux. `app-*-viewport.png` are the raw captures.

Reproduce with the app running: `node scripts/las45-visual-review.js` (other sizes: `LAS45_SIZES=1280x720`).
The script loads an original synthetic signal as the track and three synthetic stems, runs Analyze and
plays. These are review captures, not a pixel-diff baseline, and they prove nothing about audio fidelity.

## Viewport fit (measured by the script and asserted in `tests/e2e/studio-layout.spec.js`)

| Viewport | Page height A / B / C / D | Before this pass |
|---|---|---|
| 1672×941 | 941 / 941 / 941 / 941 px (no page scroll) | about 1450–1500 px, A and C banks below the fold |
| 1920×1080 | 1080 / 1080 / 1080 / 1080 px | taller than the screen |
| 1440×900, 1280×720 | equal to the viewport | taller than the screen |

From 1200×700 up, layouts A–D fill exactly one screen. Only the strip bank (sideways), the processing
rack, the rails, the inspector and the Master details scroll, each inside its own panel. Below 1200 px
wide or 700 px high the layouts stack in one column and the page scrolls (as Classic does on small screens).
Classic is unchanged.

## Region geometry at 1672×941 (x, y, w, h in px; app values measured with `getBoundingClientRect`)

Reference boxes are the approximate regions from `COMPONENT_MAP.md`.

| Concept | Region | Reference | App |
|---|---|---|---|
| all | Top bars (brand, transport, track bar) | 0, 0, 1672, 95–100 | 0, 0, 1672, 95 |
| A | Left rail | 10, 105, 165, 830 | 8, 101, 167, 820 |
| A | EQ view + analyzer | 183, 108, 932, 252 | 181, 101, 1067, 240 |
| A | 15-position bank | 183, 375, 1062, 520 | 181, 347, 1067, 574 |
| A | Master | 1120, 108, 542, 252 (Master + Output) | 1255, 101, 410, 240 |
| A | Inspector + processing rack | 1258, 375, 404, 545 | 1255, 347, 410, 426 + 1255, 779, 410, 142 |
| B | 24-position wall | 8, 85, 1470, 645 | 8, 101, 1448, 607 |
| B | Master column | 1488, 85, 180, 645 | 1462, 101, 202, 607 |
| B | Analysis dock | 8, 740, 1656, 195 | 8, 714, 1275, 207 + rack 1289, 714, 375, 207 |
| C | Workflow rail | 8, 98, 100, 390 | 8, 101, 115, 410 |
| C | Five analysis panels | 115, 98, 1540, 195 | 129, 101, 1535, 218 |
| C | Selected processor row | 115, 308, 1228, 185 | 129, 326, 1033, 186 + rack 1168, 326, 323, 186 |
| C | 16-position bank / master | 8, 510, 1520, 375 / 1537, 510, 128, 375 | 8, 517, 1396, 404 / 1410, 517, 254, 404 |
| D | Navigation rail | 8, 100, 198, 835 | 8, 101, 202, 820 |
| D | Selected processor | 212, 100, 335, 835 | 216, 101, 323, 820 |
| D | Eight positions | 555, 108, 712, 822 | 545, 101, 704, 820 |
| D | Master / output rack | 1277, 100, 390, 835 | 1255, 101, 410, 820 (rack 142, master 440, analysis 226 high) |

## Discrepancy matrix (what still differs, and why)

| Concept | Now matches | Still differs |
|---|---|---|
| A | One-screen console: Scenes/Monitor rail, large EQ view over the real-time spectrum with the analyzer beside it, 15 narrow positions below, master top right, selected-processor inspector with EQ curve, compressor curve, live gain-reduction meter and knobs, processing rack | The reference Master and Output are two panels; the app has one Master panel (Output device/rate/latency: PLANNED). Only real stems or the loaded track are strips; the other positions are faint inert outlines. No INS/SND rows, record arm, icons, group bars, per-strip meters (Stage 2). No menu/tab row, BPM, key, record, loop. Stereo width/vectorscope: Stage 3. EQ curve and spectrum use separate axes |
| B | 24 narrow tall positions with EQ/DYN/pan/S-M/fader hierarchy on real strips, tall master column with VU needles and upright fader, bottom dock with spectrum, phase/correlation and loudness | Strip knobs are read-only values of each stem's own chain; INPUT, Ø/HPF, sends, record, per-strip GR VU and meters do not exist (Stage 2). Master EQ/DYN/TAPE/DRIVE/STEREO sections are replaced by the real processing rack in the dock. Phase scope and LUFS history: Stage 3. A bank with few stems is mostly outlines |
| C | Five analysis panels in one row, workflow rail, selected-processor row, 16-position bank with the master at the right, all on one screen | Vectorscope PLANNED (offline correlation only); loudness is offline plus live sample peak; routing matrix is an inert panel (hidden below 1500 px wide); SAT/DRIVE and gate absent; no status bar (scene, automation, DSP %) |
| D | Navigation rail with workspace and quick view, selected-processor column (EQ curve, compressor curve, live GR, knobs, chain), eight full-height positions, master/output rack (processing rack, master, spectrum, stereo, loudness) | Rack lists the four real modules only (no stereo imager/exciter). Strips have no insert lists, icons or meters (Stage 2). Quick View shows master L/R only. Vectorscope PLANNED. Band table and comp VU are replaced by knobs and a bar meter |

All four: strip faders, pan, mute and solo are read-only depictions of the real stem session; editing
stays in the Stems dialog until Stage 2 shares that state. Real-time LUFS, true peak, M/S and
vectorscope need Stage 3. Intel macOS Ventura 13 WKWebView: NOT RUN.
