# Intelligent Mastering Analysis & Recommendations — v0.1 design
**Status: proposed architecture and test contract, NOT deployed features.** Use small issue-linked PRs, preserve audio originals, and reuse the existing DSP graph.

## Current app baseline (read from default branch)
- `src/dsp/analysis.js`: offline integrated loudness, LRA, peak/true peak, RMS/crest, clipping, full-file L/R correlation, M/S energy and octave spectrum. Version `mps-analysis-1`.
- `src/dsp/analysis.worker.js`: accepts optional one `start/end` segment but no automatic time-series diagnosis. Currently mono/stereo only.
- `src/reference-comparison.js`: compares two measured reports; handles some rate and duration uncertainties.
- `src/ai/eq-proposal.js`, `src/ai/proposal-session.js`: **master-EQ-only** validated proposal with preview, explicit Apply, Undo one transaction. Provider names do not imply a connected live AI service.
- `src/stem-session.js`: synchronized stem starts, per-stem chain, gain, pan, mute/solo.
- `docs/MASTERING_DSP_EXPANSION.md`: de-esser, dynamic EQ, frequency-dependent M/S and more are **proposed**; don't mark shipped without tests.

## Scope of target experience
On WAV or stems import, perform source-header/provenance check, show a **time-indexed** visual analysis of tone/dynamics/stereo, optionally show candidate artifacts and masking, and offer explanations + non-destructive proposals for concrete sections. User can preview, compare, accept, reject or mark a finding 'intentional'. No silent mastering edits; keep original immutable and maintain Undo/Redo/Save/Export.

## Measurement engine — incremental slices
| Slice | Deterministic result | Important non-claim |
| --- | --- | --- |
| 1 | Input SHA, source rate/bit depth, actual context rate, output rate; exact sample count/duration | 96k export does not add lost source detail |
| 2 | Sliding timeline: 400ms loudness, 3s short-term, overlapping 2s/5s FFT and stereo windows, time markers | Statistical shifts are *observations*, not necessarily audible faults |
| 3 | Band-limited M/S, stereo correlation, mono fold-down and L/R balance trajectories | Moving guitar panorama is **artistic motion**, not automatically an error |
| 4 | Stem alignment / drift / source-vs-sum residual; per-stem masking candidate and vocal-activity estimates | Header metadata does not prove stems are original sources |
| 5 | Vocal sibilance, metallic resonance, phrase-tail/echo risk candidates | Stereo spectrogram cannot uniquely attribute an artifact to lead vocal |
| 6 | Schema-validated recommendations, timed A/B and approval log, safe rendering pipeline | AI advice must not directly mutate DSP or invent plugins |

### Minimal timeline evidence schema (proposal only)
```json
{
  "schema": "mps-analysis-timeline",
  "version": 1,
  "source": {"sha256": "...", "rateHz": 96000, "channels": 2},
  "windows": {"shortMs": 400, "mediumMs": 2000, "longMs": 5000, "hopMs": 250},
  "events": [
    {
      "timeRangeSeconds": [192, 198],
      "kind": "spectral-change",
      "measurements": {"bandHz": [1500, 6000], "relativeChangeDb": -10},
      "explanations": ["arrangement change", "vocal pause", "EQ automation", "stem variation"],
      "status": "review-needed",
      "confidence": "low",
      "origin": "deterministic-dsp"
    }
  ]
}
```
Actual numeric values must be computed from audio, never hard-coded as a diagnosis.

### Recommendation contract (proposal only)
```json
{
  "schema": "mps-mastering-recommendation", "version": 1,
  "category": "stereo-stage", "scope": "guitar-stem",
  "timeRangeSeconds": [65, 109],
  "observation": "less Side energy than chosen reference",
  "alternatives": ["intentionally centered guitar"],
  "action": {"status": "preview-only", "processor": "ms-width", "params": {"sideHighPassHz": 160}},
  "risks": ["mono cancellation", "excessive room/tail coloration"],
  "checks": ["level-matched A/B", "time-varying stereo", "mono fold-down", "phrase tails"],
  "requiresUserApproval": true
}
```
Only offer an action when its actual processor exists. Unknown, invalid or stale model fields must be rejected before rendering. Never make a missing DSP module look functional in the UI.

## Decision hierarchy
1. Hard signal/data failures: clipped output, NaN/Inf, channel swaps, incorrect render, obvious defect of source persistence.
2. Measured observations needing investigation: frequency drops, transient or stereo changes, de-mixed stem leakage.
3. Artistic choices: intentional pan automation, vocal spatial envelopment, instrument width and air, preferred tonal balance.

**Case-derived guardrail:** Both historical Mayak V4B and the user's MPS Edit V5.1 show similar relative 1.5–6k energy drops around 3:12–3:16. A spectrogram must say “review arrangement and stems”, not “apply +6 dB at 4kHz”. Mayak Spatial V4 returned delayed sibilant syllables (85–485ms, ~1.25s reverb tail). Bypass/add isolation before de-essing a defective binaural result.

## Audio path
```
WAV/stems -> immutable sources + provenance -> analysis worker -> findings/rules
                                                    |
                                          user & optional AI explanation
                                                    |
                                   validated candidate -> matched A/B preview
                                                    |
                                  user Apply -> existing DSP -> saved project
                                                    |
                                   independent export QC & verdict log
```
Monitoring/headphone compensation is a **separate monitor-bus setting**, not inserted into master export unless explicitly chosen as creative audio processing.

## Integration plan / gates
- **Phase 0:** accurate history and failure knowledge base, no DSP mutation (this document).
- **Phase 1:** time-series measurements in existing worker, UX timeline with click-to-audition, synthetic fixtures; no automatic fixes.
- **Phase 2:** candidate ranking, user annotations ('intentional', 'artifact', 'ignore'), confidence labels and revisioned event reports.
- **Phase 3:** reuse existing EQ/ref-preview/proposal with safe scoped recommendations and undo/save checks.
- **Phase 4:** separate test-first PRs for dynamic EQ, de-esser, frequency-specific M/S, instrument reflection sends, vocal-aware masking.
- **Phase 5:** cross-device listening evidence, stereo/multichannel output handoff, explicit Atmos source eligibility audit. Binaural stereo and 7.1.4 PCM are NOT ADM BWF.

## Quality policy
ITU-R BS.1770-5 describes loudness and true peak; EBU R128 broadcasting −23 LUFS is **not** a universal music-master target. Verify on real rendered PCM with an independent meter, preserve original file and channel ordering, test at 44.1/48/96k, and compare at matched loudness. A passed spectrum/correlation test does not prove human vocal clarity.

References: [ITU BS.1770](https://www.itu.int/rec/R-REC-BS.1770), [EBU Tech3342](https://tech.ebu.ch/publications/tech3342/), [FabFilter Pro-DS concepts](https://www.fabfilter.com/help/pro-ds/using/advancedcontrols), [Suno stems](https://help.suno.com/en/articles/13925185), [Apple Atmos requirements](https://itunespartner.apple.com/music/support/5216-delivering-dolby-atmos-audio), [Dolby music workflow](https://professionalsupport.dolby.com/s/article/Getting-Started-with-Dolby-Atmos-Music).
