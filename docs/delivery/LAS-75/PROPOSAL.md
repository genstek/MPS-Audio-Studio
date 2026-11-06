# LAS-75 — graphic EQ + retained parametric EQ + presets (PROPOSAL, nothing implemented)

> Update, 6 November 2026: a draft functional preview is now available in [LAS-75/76 preview](../LAS-75-76/PREVIEW.md). The text below is the earlier proposal; the new document records implemented behavior, remaining scope and validation limits. No final design selection is implied.


Status: proposal for Gennady's review. No code changed for LAS-75. Design/listening acceptance: **Not Run / pending**.
Terminology: "band" = one EQ filter section (up to 24 per channel). "Channel" = Left/Right. They are never mixed up in UI text.

## Open investigation
The "Approve" friction is not established by the handoff. Before changing flow, record the exact reproduction (which control, which step). Until then, the proposal below only removes per-band enabling for presets and graphic use.

## Modes
1. **Graphic** (new): fixed-frequency faders, all visible at once.
   - Proposed 10 bands, ISO octave centres 31.5, 63, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz. Alternative: 15 bands at 2/3 octave. **Band count is not decided; Gennady to choose.**
   - Range ±12 dB, 0.5 dB steps, Hz and dB scales, reset per band and for all, Link (L=R) or per-channel groups.
2. **Parametric** (kept): existing response graph, draggable points, frequency/gain/Q/type and up to 24 bands per channel.

## Mode semantics
- One stored curve model per channel (the existing band array). Graphic mode is a **view/editor over reserved bands**: it owns bands 1..N (peaking, fixed freq, fixed Q) and leaves the rest alone.
- Parametric → graphic: if the parametric curve is not representable, show a confirm dialog ("N bands will be kept but are not editable in Graphic") rather than dropping or approximating silently.
- Graphic → parametric: lossless; bands become ordinary editable bands.
- Both modes feed the same DSP, so the curve is never applied twice.
- Module-level **enable/bypass** and Link live outside the per-band controls. Presets set bands enabled; the user does not enable each band.

## Persistence / DSP plan
- Add `eq.mode` ('graphic' | 'parametric') and `eq.graphic` metadata to the project schema with a migration. Missing = parametric, so old projects load unchanged.
- No DSP change: `buildChain`-equivalent preview and export both use the same band array. Parity tests extend the existing DSP regression and parity tests.
- Edits preview directly; undo/redo through the existing history. Destructive actions (reset all, replace by preset) confirm.

## Presets
- User presets: save/load JSON through the existing module-preset serializer with a schema and range validation; malformed or unsupported files are rejected with no state change.
- Factory starting points (original, authored here): Flat, Low cut, Presence, Air, Warmth, De-mud. Preset name plus a "modified" marker, audition (A/B against the saved state) and reset.
- Third-party formats: **not imported.** A research step on freely available formats and licences (provenance, attribution, unit and filter mapping) must come first. Public availability is not permission to redistribute.

## Test plan
Graphic fader change, parametric curve edit, Link/L/R, direct preview, bypass, mode switch both ways with a warning, preset load/undo/save/reopen, malformed preset rejection, render-versus-preview parity, project migration.
