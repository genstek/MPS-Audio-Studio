# LAS-66 — Gennady's Sprint 10 manual checklist (all NOT_RUN)

Use the branch build (`npm run dev`, then open http://127.0.0.1:5173 in Chrome on macOS) unless a row says otherwise. Record the build (commit), macOS and Chrome versions, window size or zoom, and the audio you used.

Results are kept in three separate groups:
- web manual checks;
- design selection;
- listening.

The macOS/iOS wrapper (PR #43, LAS-58) is not part of this build, and its rows stay NOT_RUN until that wrapper is delivered.

## 1. Per-feature checklists
Each feature's own steps are in its folder:

| Feature | Checklist | Cases |
| --- | --- | --- |
| LAS-71 250 MiB limit | [`../LAS-71/manual-qa.md`](../LAS-71/manual-qa.md) | all NOT_RUN |
| LAS-68 Master Level | [`../LAS-68/manual-qa.md`](../LAS-68/manual-qa.md) | all NOT_RUN |
| LAS-61 / LAS-62 editor windows | [`../LAS-61/manual-qa.md`](../LAS-61/manual-qa.md), [`../LAS-62/manual-qa.md`](../LAS-62/manual-qa.md) | all NOT_RUN |
| LAS-63 configured previews | [`../LAS-63/manual-qa.md`](../LAS-63/manual-qa.md) | all NOT_RUN |
| LAS-64 Space | [`../LAS-64/manual-qa.md`](../LAS-64/manual-qa.md) | all NOT_RUN |
| LAS-67 player | [`../LAS-67/manual-qa.md`](../LAS-67/manual-qa.md) | all NOT_RUN |
| LAS-60 / LAS-69 project | [`../LAS-60/manual-qa.md`](../LAS-60/manual-qa.md), [`../LAS-69/manual-qa.md`](../LAS-69/manual-qa.md) | all NOT_RUN |
| LAS-70 ⓘ help | [`../LAS-70/manual-qa.md`](../LAS-70/manual-qa.md) | all NOT_RUN |
| LAS-65 / LAS-44 design review | [`../LAS-65/manual-qa.md`](../LAS-65/manual-qa.md), [`../LAS-44/manual-qa.md`](../LAS-44/manual-qa.md) | all NOT_RUN |
| LAS-45 reskin | [`../LAS-45/manual-qa.md`](../LAS-45/manual-qa.md) | blocked until a design is selected |

## 2. Cross-feature cases (web)
| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-66-01 | New project "Session A"; import a song; open EQ, Dynamics, Limiter and Space at once; move them apart; edit one value in each; play. | Every window stays where you put it; each edit changes only its processor; playback never stops. | NOT_RUN |
| QA-66-02 | With music playing, switch Original/Processed, move Master Level, use FF/RWD and the timeline. | The meters, needles and spectrum follow what you hear; Master Level changes only your listening volume. | NOT_RUN |
| QA-66-03 | Save the project; reload the page; open the project; relink the song if asked. | Settings, Space, window positions and the track come back exactly as saved. | NOT_RUN |
| QA-66-04 | Export a WAV with Space on (tail included), then with the tail cut; change Master Level between the two exports. | The files differ only in the tail; Master Level does not change either file. | NOT_RUN |
| QA-66-05 | Stop playback; switch Dynamics and Space on and off; edit thresholds and decay. | The cards show the configured shape and on/bypassed/edited state; the real meters stay still. | NOT_RUN |
| QA-66-06 | Open several ⓘ hints over open editor windows; follow "More about…" while playing. | Hints appear above the windows; help opens at the right entry; playback continues. | NOT_RUN |
| QA-66-07 | Repeat QA-66-01 and QA-66-02 at 1440×900, 1280×720, 761×450, a 390 px phone and 125 % browser zoom. | Nothing important is hidden or overlapping; no sideways page scroll. | NOT_RUN |
| QA-66-08 | Import a WAV between 240 and 250 MiB; play, analyse and export it. Note the times and any memory warning. | It loads and exports; a file just over 250 MiB is refused with a clear message. | NOT_RUN |

## 3. Design selection (separate from web QA)
| ID | Decision | Result |
| --- | --- | --- |
| QA-66-D1 | LAS-65 processor proposal A, B, hybrid or changes | PENDING |
| QA-66-D2 | LAS-44 studio Proposal 1, 2, a mix or changes; player A or B; viewport matrix confirmed | PENDING |

## 4. Listening (separate; build/test results do not establish sound quality)
| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-66-L1 | Room, Hall and Plate on a vocal and a full mix, mix 10–30 %. | Natural tails; no metallic ringing, clicks or level jumps when changing values while playing. | NOT_RUN |
| QA-66-L2 | Compare the exported WAV with the live preview, Space on. | They sound the same. | NOT_RUN |
| QA-66-L3 | Move Master Level slowly and quickly while playing. | Smooth, no zipper noise or clicks. | NOT_RUN |

## 5. macOS / iOS wrapper (separate)
| ID | Steps | Result |
| --- | --- | --- |
| QA-66-W1 | Repeat sections 1–2 inside the Apple wrapper (PR #43 / LAS-58), including native Save/Open dialogs. | NOT_RUN — the wrapper is not part of this build |
