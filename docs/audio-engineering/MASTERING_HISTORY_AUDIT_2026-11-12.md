# MPS Mastering history → product evidence audit (2026-11-12)

Status: **historical research, not an approved DSP preset or proof of full conversation access**.
Scope: accessible Mastering conversations, verified user evaluations, earlier technical reports, available Mayak WAV renders, existing repository docs. **Never commit private tracks or hearing characteristics to this repository.**

## Evidence types
- **LISTENED:** user's subjective verdict. Authoritative for the user's preference, not universal sound quality.
- **MEASURED:** independent computation on an available audio file, algorithm/method/limitations stated.
- **REPORTED:** earlier session/report values or processing settings, not remeasured now.
- **HYPOTHESIS:** possible cause requiring isolated testing.
- **UNKNOWN:** missing WAV, exact processing snapshot, or complete chat text.
An observed spectral dip is not necessarily an EQ failure. A full-program correlation does not prove phase safety in every band/time interval.

## Never conflate these version families
- `MAYAK-STEREO-*`: original Suno / stem-based stereo mastering versions.
- `MAYAK-SPATIAL-*`: experimental binaural / 7.1.4 prototypes. **Not** Dolby Atmos ADM.
- `MAYAK-MPS-EDIT-*`: exports saved by the user inside MPS Audio Studio.

| Version | Evidence | Listening verdict and transferable observation |
| --- | --- | --- |
| MAYAK-STEREO-V3 | LISTENED | User praised clean, natural vocals and minimal sibilance. Sound-quality reference, not parameter preset. |
| MAYAK-STEREO-V4B | MEASURED/REPORTED | Recovered clean baseline, stereo 96k/24-bit, 272.520s; prior reported approx −14.1 LUFS and −1.3 dBTP. Not established as the one final approved master. |
| MAYAK-STEREO-V5.1 | LISTENED/REPORTED | Instrument staging and movement liked; deficit near 3:08 remained. Keep intentional spatial travel. |
| MAYAK-STEREO-V5.2 Bridge Focus | LISTENED/REPORTED/UNKNOWN | Time-localized attempted repair; user confirmed the bridge dip still existed. **Do not classify as a successful definitive correction.** Exact rendered file missing. |
| MAYAK-SPATIAL-V1 | LISTENED | User praised enveloping voice, guitar tails and elevated strings **in headphones**, then reported serious original-Suno-like tonal/vocal artifacts. Approve the artistic spatial idea only. |
| MAYAK-SPATIAL-V2 | LISTENED | Vocal-only EQ/de-essing did not address full-track dips. Insufficient. |
| MAYAK-SPATIAL-V3 | LISTENED/REPORTED | Rejected as sounding much worse; broad static EQ and filtered parallel branches over already damaged spatial render. Do not reuse audio as a baseline. |
| MAYAK-SPATIAL-V4 | LISTENED/REPORTED | Tonal matching to V4B on sampled bands looked good; delayed vocal copies and long reverb produced metallic consonants and overlapping 'droplets'. Rejected as an acceptable vocal mix. |
| MAYAK-SPATIAL-V5 Clean | REPORTED/UNKNOWN | Dry V4B anchor; excluded lead/backing stems from wet sends; shorter instrument-only reflections, no subjective acceptance yet. Residual vocal bleed risk remains. |
| MAYAK-MPS-EDIT-V5.1 | LISTENED/MEASURED | User's first saved MPS track, positively evaluated on high-quality car system. Actual WAV 96k/24-bit stereo and 273.330s (despite '48k' in name). User's intentional moving guitar/pan must NOT be auto-centered. The ~3:08 issue persists but is less apparent to user. |

### Independent timeline test (not a causal diagnosis)
Comparing the available stereo Mayak V4B and MPS Edit, a research-only two-second, 8-frame sampled Hann FFT shows the **relative** 1.5–6 kHz share during approx 3:12–3:16 near −24 to −25 dB in both; near 3:10 it is near −14 dB. Values are relative to 80 Hz–16 kHz power, **not** absolute level, EQ gain, certified loudness or proof of a defect. Their lengths differ 0.81s; no full non-linear signal alignment was performed. See the private reproducible research package (not uploaded to this repository).

## Other real mastering cases
- **“Побудь ещё” V5 Studio Stage** (LISTENED): user-approved 11-stem mix. Stable vocal/bass center; controlled width via guitar/keys/ambience, not global Side boost; already wide anti-phase synth/strings handled cautiously. Reported approx −17.67 LUFS / −1.25 dBTP / LRA 6.0.
- **“Побудь ещё” V6** (REPORTED): per-stem M/S, low-band Side protection, controlled reflections, vocal-mask ducking ~480–3400 Hz; reported −16.4 LUFS, −1.6 dBTP, LRA 6.5, LR corr +0.793. Existing private JSON has specific per-stem settings, **not global defaults**.
- **“Долгое молчание”**: requested gentle, warm, supportive low end, explicitly **not punchy**; softer upper mids/highs.
- **“Ты удали мою печаль”**: user reported boomy bass and recessed vocal; outcome still requires independent before/after evidence.
- **“Лишь одна”**: requested more midrange warmth but no nasal voice, less extreme high air.
- **Lia Master v6 Reference Matched**: approved aesthetic of broad, meaningful, reference-guided differences over numerous barely perceptible speculative tweaks.

## Decision library extracted from failures and successes
1. Diagnose source, stem activity and arrangement **by timeline section** before EQ; stage and mix problems first at stem/bus level.
2. Preserve vocal intelligibility: inspect de-mixed vocal for sibilance, metallic residues, formant/phoneme artifacts; repair only in context and at affected times.
3. Treat **width, staging, motion, depth and height** as separate concepts; user-annotated movement is not a defect.
4. Keep low frequencies stable where appropriate; band-dependent M/S and mono checks on wide string/synth stems; never automatic whole-master widening.
5. Avoid multiple delayed copies of consonants (Spatial V4); dry-vocal preservation and wet-return/sidechain checks before adding spatial ambience.
6. Loudness-matched A/B on full track and critical snippets, plus mono, speaker/headphone and real exported-byte QC. Measurements assist but cannot replace listener approval.
7. Keep personal monitoring correction completely separate from creative/export EQ. Do not store private audiological details in public repo.
8. No claims that 96k upsampling restores information; no claims that Suno de-mixed stems are original multitracks; do not label 7.1.4 PCM as Atmos ADM.

## Related documentation and work
- [Pobud Eshche V5 case study](POBUD_ESHCHE_V5_CASE_STUDY.md)
- [DSP expansion plan](../MASTERING_DSP_EXPANSION.md)
- [DSP specification](../DSP_SPEC.md)
- Jira [LAS-159](https://genstek69.atlassian.net/browse/LAS-159) — stem-aware stereo stage; [LAS-153](https://genstek69.atlassian.net/browse/LAS-153) — AI advice; [LAS-118](https://genstek69.atlassian.net/browse/LAS-118) — AI Co-Producer.
- Apple Atmos eligibility: https://itunespartner.apple.com/music/support/5216-delivering-dolby-atmos-audio
- ITU-R BS.1770-5: https://www.itu.int/rec/R-REC-BS.1770-5-202311-I/en

### Open forensic gaps
Every verbatim legacy chat turn and every historical processing snapshot are not available. The stereo V5.2 WAV and some early reference renders remain unrecovered. Reported values must be independently remeasured before calibrating product thresholds or adding automatic presets.
