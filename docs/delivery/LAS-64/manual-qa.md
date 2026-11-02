# LAS-64 — Manual and listening QA (Gennady) — all NOT_RUN

Use headphones or monitors at a fixed volume. Record macOS, Chrome version, output device, test material (name, sample rate) and commit.

| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-64-01 | Open a project made before Sprint 10 (or load an old settings file). | Space is Off; the track sounds exactly as before. | NOT_RUN |
| QA-64-02 | Edit space → Space on → Room, Hall, Plate while playing. | Each preset is audibly different; no clicks when switching. | NOT_RUN |
| QA-64-03 | Move Mix, Pre-delay, Decay, Damping while playing (mouse and arrow keys). | Smooth changes, no clicks or zipper noise. | NOT_RUN |
| QA-64-04 | Toggle Space on/off while playing. | Reverb fades in/out quickly without a click. | NOT_RUN |
| QA-64-05 | Play a track with a hard ending (or Pause in the middle). | The reverb tail rings out after the music stops. | NOT_RUN |
| QA-64-06 | With a long Hall tail ringing, press Remove track or Replace WAV. | No old tail is heard afterwards. | NOT_RUN |
| QA-64-07 | Export with "Include the tail" and with "Cut at the end of the source"; open both in another player. | Tail export is longer by about pre-delay + decay and fades naturally; cut export has the source length. Both sound like the preview. | NOT_RUN |
| QA-64-08 | Mono WAV with Space on. | Reverb stays centred (mono). | NOT_RUN |
| QA-64-09 | Undo/Redo after Space edits; save and reload a settings file and a preset. | Values come back exactly. | NOT_RUN |
| QA-64-10 (listening) | On two or three reference tracks, judge whether Room/Hall/Plate are usable starting points for mastering (subtle mix 5–20 %). Note metallic ringing, flutter or graininess. | Gennady's verdict recorded here. | NOT_RUN |
