# MPS Intelligent Diagnostics → Recommendation Engine: architecture v0.1

Status: **proposal**, no claim of implemented functionality. Based on audited mastering cases, the existing MPS JavaScript/AudioWorklet code, and ITU/EBU audio measurement standards.

## 1. Verified existing foundation (current main at audit)
- `src/dsp/analysis.js` = `mps-analysis-1`: full-file loudness, true peak, RMS, crest, clipping, 10 octave band spectral shares, stereo correlation/Side-to-Mid and mono level change.
- `src/dsp/analysis.worker.js` and `src/analysis-client.js`: optional explicit `segment.start/end` analysis, but **no automatic full-track time-series with change markers**; worker rejects channels >2.
- `src/reference-comparison.js`: compares two analysis reports, warns on duration/rate differences; supports matched-level comparison.
- `src/ai/eq-proposal.js` and `src/ai/proposal-session.js`: master EQ-only validation, stale-result protection, temporary Preview, explicit Apply as one Undo step. Provider names are adapter contracts, not proof of live model connectivity.
- `src/stem-session.js`: synchronized shared start, per-stem chain, gain, equal-power pan, mute/solo. Does not imply time-resolved automation or multichannel Atmos render.
- `docs/MASTERING_DSP_EXPANSION.md` lists **planned** dynamic EQ, de-esser, frequency-selective width, timeline; do not present these as shipped.
- Existing related Jira: LAS-159 per-stem spatial staging; LAS-153/LAS-118 AI measurement/advice; LAS-172 report export; avoid duplicating these features.

## 2. Product-level contract
Import a song or stems → **measure** reliably in time → **explain** observed change with competing hypotheses → **suggest** supported processor adjustment only where appropriate → **Preview + loudness match** → **QC** → **explicit Apply** → **Undo/Redo and save**.

Every item includes `sourceHash`, `projectRevision`, `algorithmVersion`, exact timestamp, technique and evidence limitations. A new source/project/parameter revision invalidates stale suggestions and pending previews. No raw audio or private filenames sent to external AI by default.

### Separate technical faults from artistic choices
Hard faults: NaN, clipping beyond agreed ceiling, corrupt export, unintended phase cancellation or wet echo due to a processing error, playback engine reset. Ambiguous: band-energy fall in bridge, intentionally unequal L/R channels, dramatic contrast, very wide but mono-compatible strings. Do not equate high correlation with a 'bad' narrow mix, or low correlation with 'bad' processing.

**Example:** Mayak shows nearly identical 1.5–6 kHz relative spectral trough in V4B and MPS Edit near 3:12–3:16; the first recommendation must be 'inspect instrument activity / arrangement / vocal presence', NOT 'boost global EQ at 4 kHz'.

## 3. Proposed processing stages (non-destructive)
```text
immutable imported PCM + provenance
  -> shared analysis worker, channel/sample clock metadata
  -> short-time time/spectral/stereo metrics, silence gate
  -> possible event markers + alternative explanations
  -> per-stem alignment/bleed/masking probes IF stems exist
  -> severity & evidence provenance (no fabricated confidence scores)
  -> user-annotated intentional changes + manual listening decisions
  -> rules-driven candidate proposals constrained to *implemented* DSP
  -> optional AI explanation, validated against versioned schema
  -> Preview / A-B matched / Validate export bytes
  -> explicit Apply / Undo / project save / reproducible report
```

### Analysis MVP: minimum time series
- `400ms` momentary, `3s` short-term measures consistent with actual loudness algorithm.
- `2s` overlapping power-spectrum / M/S / LR-balance windows and `5s` trend with configurable hop (suggest 250ms; performance benchmark first).
- Adaptive noise/silence gating; segment start/end exact in seconds; signal power per **specified bands**; compare local/neighbor intervals after level normalization and estimate changes in instrumentation.
- M/S by band and time; L/R correlation by band and time; mono fold loss and RMS/TP deltas; identify intentional pan sweeps rather than classifying non-centered instruments as faults.
- For stems: estimate fixed offset and time drift before mixing, calculate possible cross-stem bleed and vocal-band masking using voice-activity estimates; describe attribution as uncertain.
- Spectral/resonance/sibilance and vocal-tail analysis only **candidates**; extracted vocals are imperfect, and automated probes cannot by themselves prove a listener will hear a metallic effect.

### Draft report shape (not yet implemented)
```json
{
  "schema": "mps-timeline-analysis",
  "version": 1,
  "source": {"sha256":"...", "rateHz":96000, "channels":2, "seconds":273.33},
  "algorithm": {"id":"mps-timeline-v1", "hopMs":250, "spectralWindowMs":2000},
  "events": [{
    "id":"event-0001", "startSeconds":192, "endSeconds":198,
    "kind":"relative-spectral-change",
    "measurement":{"bandHz":[1500,6000], "relativeDb":-24.5},
    "baseline":{"startSeconds":188, "endSeconds":191, "relativeDb":-14.4},
    "evidenceType":"measured", "assessment":"review-needed",
    "alternatives":["arrangement-change","vocal-pause","eq-automation","stem-mismatch"],
    "confidence":"low"
  }]
}
```
Example values above describe a research observation, not a default event threshold.

### Draft recommendation (only if corresponding processor actually exists)
```json
{
  "schema":"mps-audio-recommendation","version":1,
  "sourceHash":"...", "projectRevision":17,
  "timeRange":[65,109], "scope":"guitar-stem",
  "observation":"low side energy relative to user-selected reference",
  "alternatives":["intentional centered guitar"],
  "proposal":{"module":"ms-width","parameters":{"amount":1.10,"sideHighPassHz":160}},
  "risks":["mono-loss","over-wide-stereo","pan-disruption"],
  "checks":["matched A/B","band-limited mono","phrase endings"],
  "previewOnly":true, "requiresExplicitApply":true
}
```
**Do not surface this sample as a runnable M/S feature until the DSP actually supports it**; schema validation must fail safely for unavailable module and parameter types.

## 4. Safety and engineering invariants
- Preserve immutable source bytes; live path and offline WAV export share equivalent DSP/latency compensation.
- Record source/project/output sample rates separately; 48→96k and 16→24bit cannot restore recording detail.
- Static EQ/limiter cannot recreate lost Suno stem data. Stem separation requires provenance and bleed-risk warnings.
- Never delay/duplicate dry lead vocal by default; audition any wet returns at consonant endings. Spatial V4 wet vocal echoes (up to ~485ms and late reverb) were listener-rejected.
- Separate monitor-only EQ (device/listener correction) from export/creative DSP. Personal listening conditions stay private.
- No hard coded tonal target by genre. No global EQ correction based on static spectral shares alone.
- QC final encoded bytes with independent analyzer, not just UI graph. Quality listening is separate from machine PASS.

## 5. Development roadmap (small PRs, no automatic merge)
1. **Measurement-only timeline** with deterministic 44.1/48/96k tests and sample-rate/segment semantics. Reuse existing analysis worker and algorithms; no DSP output changes.
2. **Event triage + annotations**: no silent 'EQ fix', mark intentional stage movement and arrangement drops, store per-event reasons in project and analysis JSON.
3. **Supported EQ proposal integration**: attach timeline events and confidence to existing validated Preview/Apply/Undo; no unapproved state mutation.
4. **Stem-aware staging & phase measurement**: coordinate LAS-159; only then add per-stem M/S width, dry/wet reflection sends with true bypass.
5. **Vocal repair DSP**: de-esser, dynamic EQ, masking ducking with measured detector and per-stem monitoring; protect clean dry anchor and consonant tails.
6. **Personal monitor EQ isolation**; save separate local profile and never imprint it on export.
7. **Distinct Atmos program**: 7.1.4 PCM is not an object-based ADM BWF; Apple's official Atmos delivery forbids upmixing from finished stereo and de-mixing stereo stems.

## 6. References
- [ITU BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770-5-202311-I/en) — current recommendation for loudness/true peak; includes advanced/object-based annexes. Check implementation's claimed `-4` variant before upgrading its label.
- [EBU Tech 3342](https://tech.ebu.ch/publications/tech3342/) — LRA.
- [Apple Atmos rules](https://itunespartner.apple.com/music/support/5216-delivering-dolby-atmos-audio) — multitrack-origin ADM restriction.
- Internal: [historical audit](MASTERING_HISTORY_AUDIT_2026-11-12.md), [DSP expansion](../MASTERING_DSP_EXPANSION.md), [Pobud case study](POBUD_ESHCHE_V5_CASE_STUDY.md).
