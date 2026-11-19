# LAS-174 — Suggestions ignored the processed EQ

## Diagnosis (before)
- `SuggestionsPanel.measure()` called `startAnalysis(file)`, which analyses the **original file only**. The committed chain (EQ, compressor, space, limiter) never entered the measurement, so a linked Graphic EQ boost of about +7 dB at 31.5 Hz and +8.5 dB at 63 Hz was invisible.
- `buildSuggestions` had three fixed rules (250 Hz, 500 Hz, 4 kHz), each comparing one octave with its two neighbours. 31.5 / 63 / 125 Hz had no rule (31.5 Hz also has no lower neighbour).
- When no rule matched, the only item was `Tonal balance` with the text "No octave band stands out…" and the status label `unavailable`, which is wrong for a successful measurement. A silent file with enough frames also fell into this "balanced" state because null band levels were treated as "no excess".

## Measurement path (after)
- The render worker has a new `mode: 'suggest'` (`src/dsp/render.worker.js`). It decodes the file, renders it through `renderChain` (the same chain code as playback and export, one pass) and returns `analyze()` of the original and of the processed audio. No audio leaves the device; the worker is terminated on cancel.
- The panel sends the committed chain at the start of measuring and records its revision. If the chain changes before the result arrives, the result is discarded. Afterwards a changed chain revision or project id marks the whole result "out of date" (individual proposals keep their own session freshness checks).
- Mid rules (250 / 500 / 4k) judge the **processed** spectrum, with the original shown beside it. The existing "no second cut near an existing cut" guard stays.
- Low end (31.5 / 63 / 125 Hz): never an automatic cut. A before/after change of at least 3 dB in a band's share of the total (bands within 40 dB of the total) is shown as an **observation / optional check**. Levels are relative to the total, so a boost lowers the share of unboosted bands; this is a tonal-share comparison, not an absolute level.
- Items now carry `kind` (`proposal`, `observation`, `none`, `unavailable`) and `provenance` (original/processed, sample rate, duration, chain revision, project, media).
- UI states: zero defensible suggestions is "No evidence-based EQ change suggested for the measured signal." with what was assessed and the limits. `unavailable` is only for a bypassed EQ, a silent/too quiet (RMS below −70 dBFS) or too short signal, invalid reports, or a proposal that cannot be applied.

## Synthetic evidence (equal tones at the ten octave centres, 44.1 kHz, linked graphic EQ +7 dB at 31.5 Hz, +8.5 dB at 63 Hz, limiter off)
Band level relative to the total, original → processed: 31.5 Hz −10.00 → −5.44 dB (+4.57), 63 Hz −10.00 → −4.26 dB (+5.74), 125 Hz −10.00 → −12.13 dB (−2.13, below the reporting threshold).

## Limits
Whole-file average spectrum only; no time-resolved or perceptual analysis; fixed thresholds are heuristics, not a target curve; the Space tail and limiter are measured as rendered. Native macOS Ventura QA: NOT_RUN.
