# LAS-45 approved concept component maps (1672×941 references)

Source of truth: `MPS-UI2-Concept-{A,B,C,D}.png` (SHA-256 in `SHA256SUMS.txt`, verified 2026-11-13).
These are design targets, not claims of implemented DSP. Regions are approximate pixel boxes (x,y,w,h) on the 1672×941 image.
Status key: REAL = bound to existing engine/state today; STAGE2 = needs shared stem session; STAGE3 = needs new analysis; PLANNED = no backing feature (render as inert, labelled).

## A — Console Focus (charcoal / cyan)
| Region | Box | Content | Status |
|---|---|---|---|
| Title/menu + mode tabs + transport + timecode + project | 0,0,1672,100 | Project/Mix/Process menus, Mix/Edit/Arrange/Master tabs, transport, BPM/time/key | Transport/project REAL; BPM/key/record/loop PLANNED |
| Scenes + Snapshots + Monitor rail | 10,105,165,830 | scene list, snapshots, A/B/C monitor, level knob, Dim/Mono/Talk | Monitor level REAL; scenes/snapshots/dim/mono/talk PLANNED |
| EQ view (large) | 183,108,730,252 | EQ spline over spectrum, tabs EQ/Spectrum/RTA/Stereo/Loudness/History, Pre/Post | EQ curve REAL (graph EQ params); spectrum REAL-time; others STAGE3 |
| Analyzer + scope | 930,108,185,252 | mini analyzer, vectorscope, width | spectrum REAL; vectorscope/width STAGE3 |
| Master (LUFS, peak, width, limiter) | 1120,108,380,252 | LUFS(I), peak, S/M, stereo width, limiter GR | peak/clip REAL; LUFS offline-only; limiter on/GR partly REAL |
| Output | 1512,108,150,252 | device, rate, depth, latency | PLANNED (no device routing) |
| 15 narrow strips | 183,375,1062,520 | name, icon, INS/SND, pan knob, R/S/M, vertical fader + meter, group bar | STAGE2 (real stems only; remaining inert) |
| Channel inspector | 1258,375,404,545 | Input/Filter/EQ knobs, Dynamics knobs, processing chain | EQ/Dyn/Limiter params REAL for master chain; per-channel STAGE2 |

## B — Analog Strip Wall (amber / hardware)
| Region | Box | Content | Status |
|---|---|---|---|
| Top bar + view bar | 0,0,1672,75 | menu tabs MIX/RECORD/..., session, SMPTE, view/layout/meter selects | transport/project REAL; rest PLANNED |
| 24 very narrow strips | 8,85,1470,645 | name header, INPUT knob + Ø/HPF, 4-band EQ knobs, DYN GR VU + 3 knobs, SENDS, M/S/R, fader + meter, dB readout + pan | STAGE2 for stems; EQ/Dyn knobs per-strip PLANNED |
| Master (tall) | 1488,85,180,645 | dual analog VU, bus routing, master EQ knobs, master DYN VU, TAPE/DRIVE/STEREO/LIMIT, fader + meter | Master fader=monitor level REAL; meters REAL; VU needles = REAL peak mapping only if labelled; TAPE/DRIVE/STEREO PLANNED |
| Lower dock | 8,740,1656,195 | Spectrum, Phase/Correlation (scope + bar), Loudness LUFS/LRA/TP + history | spectrum REAL-time; correlation/LUFS/TP offline from Analyze, rest STAGE3 |

## C — Mastering Hybrid
| Region | Box | Content | Status |
|---|---|---|---|
| Menu + project/format/transport/A-B/undo | 0,0,1672,90 | | REAL (project, transport, undo/redo, A/B) |
| Workflow nav | 8,98,100,230 | Mix/Master/Analysis/Routing/Scenes/Setup + bank | nav REAL as scroll/focus targets; Routing/Scenes/Setup PLANNED |
| 5 top panels | 115,98,1540,195 | Master EQ, Spectrum, Dynamics curve, Stereo vectorscope, Loudness | EQ REAL; Spectrum REAL-time; Dynamics curve derivable from real comp params; stereo/loudness offline or STAGE3 |
| Selected channel editor | 115,308,1228,185 | Input/EQ/Dynamics/Sat knobs | EQ/Dyn REAL (master chain); Sat/Gate PLANNED |
| Routing matrix | 1348,308,320,185 | bus grid | PLANNED (no routing) |
| 16-strip mixer + master | 8,510,1520,375 + 1537,510,128,375 | vertical faders/meters | STAGE2 |
| Status bar | 8,895,1656,40 | scene, automation, trim, DSP, I/O | PLANNED; DSP% not measured |

## D — Digital Console Suite
| Region | Box | Content | Status |
|---|---|---|---|
| Top bar | 0,0,1672,95 | project, rate/bit/ch, transport, timecode, tempo, A-B, scene | transport/project/A-B REAL; scene/tempo PLANNED |
| Left nav + Workspace + Quick View | 8,100,198,835 | Edit/Mix/Master/Analyze, tree list, 8 mini meters | nav REAL as focus targets; tree PLANNED; quick view STAGE2 |
| Selected channel | 212,100,335,835 | input/trim/HPF/LPF, EQ curve + band table, compressor + GR VU, inserts list | EQ REAL; comp REAL (master chain); inserts list = real chain modules |
| 8 full-height strips | 555,108,712,822 | icon, inserts, pan, S/M, fader, meter | STAGE2 |
| Master/Output rack | 1277,100,390,835 | insert rack, loudness, correlation, vectorscope, spectrum | chain REAL; LUFS/TP offline; correlation offline; vectorscope STAGE3; spectrum REAL-time |

## Differences in current merged Stage 1 (main @ 7d01377)
Panels are the four mastering modules rearranged by CSS: no dense narrow strip bank, no EQ curve over spectrum, no knob rows, no vertical faders per strip, no 5-panel analysis row. The owner rejected it as not matching these references.
