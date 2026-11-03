# Design brief (LAS-42) — draft for Gennady to confirm

**Audience.** Gennady first: a musician/QA engineer preparing his own songs for release, working alone on a Mac laptop or desktop. Later, other independent artists with their own accounts.

**Core tasks (in order of frequency).** Import a mix → listen → compare with the original and a reference (level-matched A/B) → adjust EQ (24 bands per channel, linked or L/R), dynamics, limiter → check loudness and true peak → export WAV. Secondary: save presets, manage private library, stems (later).

**Targets.** Desktop first. Comfortable at 1440×900 and 1280×720; must stay fully usable from 761×450 (LAS-51 boundary); below 761 px a stacked, scrolling layout. Owner-approved comfortable size 776×888 must not regress. Chrome on macOS first, then Safari/Firefox.

**Visual references available.** Historical `docs/UX_DESIGN.md` ("Analog Console meets Digital Precision": graphite chassis, amber VU, cyan EQ). Fostex-inspired strips are named in LAS-7. No external images were supplied. Do not copy brand marks, panel labels or trade dress of real hardware or software.

**Brand assets.** None in the repository: only the text mark "MPS" and the name "MPS Audio Studio". A logo, colours or typeface from Gennady are needed before high-fidelity work; otherwise the system font stack stays.

**Non-negotiables carried into design.** Controls must do something real or be clearly unavailable; meters must show measured audio; local-only by default with upload stated explicitly; text ≥ 12 px for labels and ≥ 14 px for body; 24×24 px minimum targets; visible focus; no colour-only state.

**Checkpoints before UI implementation.**
1. Gennady picks A, B, a hybrid, or supplies references (this issue).
2. LAS-43: greyscale clickable wireframes of the core journeys reviewed by Gennady.
3. LAS-44: design system and high-fidelity screens approved.
4. Only then: restyle the app (LAS-45), each step behind its own PR with the LAS-51/48 layout tests.

**Open questions for Gennady.** Light or dark by default? How many modules must be visible at once while editing? Is the console look important to you, or is precision/readability more important? Any logo or colour you already use?
