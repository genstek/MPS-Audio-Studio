# Intelligent Mastering — evidence register (2026-11-12)

**Status: research documentation only.** No DSP code change; no audio file committed. Preserve the listener's judgments, but do not equate subjective preference with a measurable defect. See existing [Audio Engineering KB](README.md), [Pobud case](POBUD_ESHCHE_V5_CASE_STUDY.md), [DSP expansion](../MASTERING_DSP_EXPANSION.md).

## Provenance classes
- **P:** explicit human listening feedback / artistic approval.
- **R:** historical report or parameter snapshot, not independently remeasured now.
- **M:** input file or measurement independently reproduced, including method and limitations.
- **H:** hypothesis, needs targeted test. **U:** exact audio/version unavailable.

Never collapse identical numeric versions from different workflows: `MAYAK-STEREO`, `MAYAK-SPATIAL`, `MAYAK-MPS-EDIT`.

## "Твои глаза — маяк в ночи" case chronology
| Artifact | Evidence | Relevant lesson / verdict |
|---|---|---|
| Original Suno / first stereo work | P/R | User reported sibilants, metallic vocal, central masking and tonal holes. Diagnose before EQ. |
| `MAYAK-STEREO-V3` | P | User praised clean natural vocal / minimal sibilance. Listening reference, not transferable filter preset. Exact full waveform unavailable here. |
| `MAYAK-STEREO-V4A/V4B` | P/R/M | V4B 96k/24-bit stereo, 272.520s actual file. User requested much wider, clearly separated instruments than V4A/B offered. V4B is a *source baseline*, not confirmed final approved master. |
| `MAYAK-STEREO-V5.1 Spatial Air` | P/R | User liked wider guitar/woodwind stage and artistic L→R travel; 3:08 tonal/arrangement issue persisted. |
| `MAYAK-STEREO-V5.2 Bridge Focus` | P/R/U | Local correction around 3:08–3:14 attempted, **did not fully solve** listener's deficit. Do NOT mark fully accepted. |
| `MAYAK-SPATIAL-V1` | P/R | Headphone preview inspired praise for enveloping voice, moving guitar tails and elevated strings, but vocal EQ/metallic artifacts persisted. Creative reference ONLY. 7.1.4 speaker WAV is **not** Dolby Atmos ADM. |
| `MAYAK-SPATIAL-V2/V3` | P/R | De-ess / broad static EQ on already rendered spatial material failed; V3 explicitly rejected. Avoid layer-on-layer global EQ and parallel undelayed filtered signals. |
| `MAYAK-SPATIAL-V4` | P/R | Clean V4B direct but 85–485ms vocal wet delays and late tails (~1.25s) produced audible “droplet” syllable repeats, metallic vocal and clutter. **Rejected as acceptable vocal mix**, even though aggregate spectrum looked stable. |
| `MAYAK-SPATIAL-V5 Clean Vocal` | R/U | Direct V4B, no vocal stems in wet path; controlled instrument reflections (~48–167ms), vocal-triggered wet ducking. Await explicit listener approval. |
| `MAYAK-MPS-EDIT-V5.1` | P/M | User's **first saved MPS song** and positive subjective car-system test. Actual WAV is **96 kHz/24-bit** despite `48k` in filename; 273.330s. Intentional moving panoramic instruments must NOT trigger auto-centering. Individual listening EQ preferences must not be auto-exported. |

## New independent cross-version observation
Re-measured user `MAYAK-MPS-EDIT-V5.1` WAV and actual V4B input in two-second windows, using 8 Hann-sampled FFT frames per window, 80–16k Hz normalized band energy. Both show relative 1.5–6k Hz energy fall near 3:12–3:16 (~−24 to −25 dB relative to sum of bands), versus ~−14 dB near 3:10. There is a **0.81s duration difference** and no full time-warp alignment. **Only a spectral observation.** Neither measured change implies EQ fault without checking arrangement/stem content. Independent source report available in private research package; do not publish raw audio.

## "Побудь ещё" and additional cases
- 11 x 48k/16-bit synchronized stems. V2 adjusted relative lead/backing, V3/V4 investigated late song muddiness, V5 Studio Stage **user-approved** with center lead/bass and selective staging/early reflections. Historic ~−17.67 LUFS, −1.25 dBTP, 6.0 LU LRA.
- V6 Spatial Stage case JSON exists: e.g. Guitar left (~−0.28 pan), Keys right (+0.26), side filtering around 160–165Hz; vocal-activity masking relief in 480–3400Hz, low centered. These are **track-specific** values, never recommended defaults.
- “Долгое молчание” / “Лишь одна”: warm gentle depth without excessive bright top or punch; “Ты удали мою печаль”: bass hum and vocal masking were user concerns; final detailed DSP provenance for these older tracks remains incomplete.
- Lia Master v6 Reference Matched: user approved reference-driven, substantial A/B improvement instead of unverified micro-tweaks; no universal LUFS target.

## Rules adopted from failures
1. Local spectrum change may be arrangement, not EQ. Compare aligned windows/stems/active sources before recommending a fix.
2. Stereo width, panning movement and depth/reverb are different concepts; only measurable mono loss/clipping are hard warnings.
3. Isolated AI stems can contain spill or regenerated content. Avoid repeated wet vocal consonants and long cluttered phrase tails.
4. Preserve clean dry reference and make every step reversible; A/B at matched perceived loudness.
5. 96k export from 48k source cannot restore information.
6. Record each conclusion as Observation → Alternative hypotheses → Proposed action → Risk → A/B verification → User verdict.
7. Personal listening correction is a **monitor-only** feature unless explicitly requested as creative processing.

## Scope limitation
This is a review of accessible conversations, prior reports, currently available WAVs and repository code, **not an exhaustive verbatim download of every historical chat**. Missing exact historical V5.2 WAV/scripts must remain unverified. No private audio, listener medical details, local paths or identity data should enter a public repository.

## Professional references
[ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770) · [EBU R128](https://tech.ebu.ch/publications/r128) · [EBU Tech 3342](https://tech.ebu.ch/publications/tech3342/) · [Suno separation](https://help.suno.com/en/articles/13925185) · [Apple Atmos policy](https://itunespartner.apple.com/music/support/5216-delivering-dolby-atmos-audio).
