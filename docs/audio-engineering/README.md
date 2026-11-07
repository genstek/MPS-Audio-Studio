# MPS Audio Studio — Audio Engineering Knowledge Base

Status: living engineering guidance, **not implemented-feature claims**.
Owner: MPS Audio Studio. First case study approved by listener on 2026-11-07.

This directory captures practical lessons from track/stem mixing, mastering, export and listening sessions. It is meant to inform implementation, manual reviews and DSP regression testing. Never copy a processing chain blindly to another recording.

## Read first
- [Pobud Eshche V1–V5 case study](POBUD_ESHCHE_V5_CASE_STUDY.md) — verified-by-user listening observations, processing hypotheses and cautions.
- [Sample rate and resampling](SAMPLE_RATE_RESAMPLING_SPEC.md) — exact product requirements and QA coverage.
- Existing project specifications: [DSP_SPEC](../DSP_SPEC.md), [MASTERING_DSP_EXPANSION](../MASTERING_DSP_EXPANSION.md), [QA_ACCEPTANCE](../QA_ACCEPTANCE.md).
- Project operating rules: [AGENTS.md](../../AGENTS.md).

## Core engineering policies
1. Analyze **each file and each song section** first: levels, loudness, spectrum, true peak, transient behavior, LR correlation and band-limited M/S. Distinguish measurements from listening judgments.
2. Separate **mixing problems** from **mastering problems**. With accessible stems, fix a masked vocal/instrument at the stem or bus level before broad master-EQ.
3. Preserve a stable center (lead vocal, bass and essential kick energy). Shape stereo image with appropriately selected sources; avoid one-click whole-master widening and watch individual stems that already have negative LR correlation.
4. Stereo width (Side/Mid ratio), staging (instrument placement) and depth (distance/early reflections) are distinct. More width does not automatically mean better imaging.
5. Avoid excessive limiting and excessive brightness. Compare original and processed audio at matched loudness, check short sections and full-track integrated metrics, and audit mono compatibility.
6. Preserve raw sources; processing choices are versioned, reversible, and make no unapproved destructive changes.
7. For AI vocals, evaluate actual artifacts (metallic resonances, syllable transitions, sibilance, unnatural dynamics) instead of applying a generic 'humanizer'. No claim of recovering authentic human performance from DSP alone.
8. Playback and offline export must share a consistent parameter model and equivalent DSP. Meter outputs and controls must be real, not illustrative.
9. Preserve sample-rate provenance and avoid unnecessary conversion; 48→96 kHz conversion does **not** add missing acoustic information. Treat 96 kHz as an optional workflow choice and compare against native-rate processing with matched levels.
10. Treat approved reference versions as **musical direction**, not technical proof or universal presets. Store reference notes and version IDs; do not commit user recordings without explicit redistribution rights.

## How to add a new session
Add a dated case-study file: source format and stem count; time-aligned before/after observations; measured evidence and uncertainty; tested decisions; listener verdict; final version; transferable rules; missing objective verification. Use a source/observation/hypothesis/action/validation structure. Mark assumptions as assumptions.

## Implementation governance
This documentation does not establish that stereo width, 96 kHz export, advanced de-essing or dynamic EQ are implemented. See current code and tests. Each DSP addition needs a scoped Jira/GitHub issue, tests, review and an independently measured exported-audio result before being described as shipped.
