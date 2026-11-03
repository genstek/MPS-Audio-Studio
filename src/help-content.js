// Contextual help (LAS-70), maintained in one place. Each entry belongs to one control:
//   id      → stable key used by the ⓘ icon next to the control and by the help view anchor
//   name    → the exact control/function name shown in the popover (and "Help for <name>")
//   short   → one or two plain sentences: what it does and when to use it
//   long    → the detailed help shown in the in-app Help view at #help-<id>
//   section → the Help view chapter
// Texts describe what is implemented now; unavailable functions say so.
export const HELP_SECTIONS = [
  ['project', 'Project'],
  ['transport', 'Transport and player'],
  ['tracks', 'Tracks and import'],
  ['master', 'Master and output'],
  ['mixer', 'Mixer and editor windows'],
  ['eq', 'EQ'],
  ['dynamics', 'Dynamics (compressor)'],
  ['limiter', 'Limiter'],
  ['space', 'Space (reverb)'],
  ['presets', 'Presets and settings files'],
  ['export', 'Export'],
  ['dialogs', 'Other dialogs'],
];

const entries = [
  // Project
  ['project.new', 'project', 'New project', 'Starts a new, named project with no audio and default processing. If the session has work in it you are asked to save, discard or cancel first.', 'New project opens a dialog for the project name (required). Creating it removes the track and stems from the session (your files are never changed), resets processing to the defaults, closes the editors and sets Processed listening. Master Level is kept because it is your listening volume. If the current session has a track, stems or unsaved changes, you choose Save, Discard or Cancel first.'],
  ['project.menu', 'project', 'Project menu', 'Open, Save and Save As for the whole project (Ctrl/⌘ O, Ctrl/⌘ S, Shift+Ctrl/⌘ S).', 'A project file (.mps-project.json) keeps every setting — all processors, stems and their strips, Processed/Original and the editor window layout — and the identity of each audio file (name, size, SHA-256), not the audio itself. Opening a project restores the settings and asks you to relink each audio file; a different file is refused. In Chrome the first Save asks where to save and later Saves update that file; Save As writes an independent copy. In browsers without file access (Safari, Firefox) Save downloads a new file. Playback never starts when a project opens.'],
  ['project.status', 'project', 'Project status', 'Shows whether the project has unsaved changes, is saving, was saved, or failed to save.', '"Unsaved changes" means the session differs from what was last saved or opened. It clears only after a save has been written; changes made while a save runs stay unsaved. "Save failed" keeps your session as it is. "Audio files missing — Relink…" means an opened project still needs its audio files.'],
  // Transport
  ['transport.play', 'Play', 'Starts playback from the current position.', 'Play starts the track from the playhead. Pressing it at the very end starts again from the beginning. While the reference comparison or stems play, single-track playback stops first.'],
  ['transport.pause', 'Pause', 'Pauses and keeps the position; press again to resume.', 'Pause is a toggle: while playing it pauses at the current position, while paused it resumes from there. Reverb tails ring out after pausing.'],
  ['transport.stop', 'Stop', 'Stops playback and returns to the start.', 'Stop ends playback and puts the playhead back at 0:00. A reverb tail rings out naturally.'],
  ['transport.rewind', 'Rewind', 'Moves the playhead back 5 seconds; hold to keep going (25 s per second).', 'A click (or Enter/Space) moves back 5 seconds. Holding the button repeats every 200 ms after 0.4 s. It stops at 0:00. It is navigation, not reverse playback; while playing, audio continues from the new place.'],
  ['transport.forward', 'Fast forward', 'Moves the playhead forward 5 seconds; hold to keep going (25 s per second).', 'A click moves forward 5 seconds; holding repeats every 200 ms after 0.4 s. At the end of the track playback ends as it does naturally.'],
  ['transport.timeline', 'Timeline', 'Shows and sets the playback position; drag it or use the arrow keys.', 'Drag the handle and release to jump there. With the keyboard: ←/→ 1 s, Page Down/Up 10 s, Home start, End end. The ruler shows minutes and seconds. Seeking keeps Playing or Paused as it was.'],
  ['transport.meters', 'Output level meters', 'Left and right level of what you hear (after Master Level), with peak hold and a clip light.', 'Bars show RMS level; the white line is the sample peak, held 1.5 s. Units are dBFS (0 = digital full scale). The meters read the output after the Original/Processed switch, loudness matching and Master Level.'],
  ['transport.clip', 'Clip indicator', 'Lights when a sample at or above 0 dBFS reached the output; click to reset.', 'Clipping at the output usually means the Original path or a high Master Level is too loud for the device. It stays lit until you click it. Exports have their own clipping report.'],
  ['transport.needles', 'Needle meters', 'Left/right RMS level with VU-like movement (about 300 ms), on a dBFS scale.', 'The needles show RMS of the last 46 ms smoothed so a step settles in about 300 ms, like a VU meter. The scale is dBFS (−40 to 0), not calibrated VU units. They measure what you hear.'],
  ['transport.spectrum', 'Output spectrum', 'The frequency content of what you hear, from 20 Hz to 20 kHz.', 'A live spectrum (4096-point FFT) of the output after Master Level. When nothing plays it shows no signal; nothing is simulated.'],
  // Tracks
  ['tracks.import', 'Import or replace WAV', 'Loads a WAV file (up to 250 MiB) from this device; it is not uploaded.', 'Choose a WAV of up to 250 MiB (262,144,000 bytes). The file is decoded in the browser and never changed. A replacement keeps the current track until the new one has loaded; larger files need more memory (about 7 GB of browser memory for 250 MiB while matching and exporting).'],
  ['tracks.remove', 'Remove track', 'Takes the track out of the session; the file on your device is not touched.', 'Removing stops playback, clears the reverb tail and leaves the processing settings as they are.'],
  ['tracks.analyze', 'Analyze', 'Measures loudness, peaks, spectrum and stereo of the imported file.', 'The analysis runs on this device in the background and reads the original file only.'],
  ['tracks.compare', 'Compare with a reference', 'Compares your mix with a reference track and can propose settings.', 'Choose a reference (a saved profile or a WAV on this device) and sections; the studio measures both and can play them level-matched. Proposals are shown before anything is applied.'],
  // Master
  ['master.listen', 'Listen to (Processed / Original)', 'Switches between the processed and the original sound without changing the position.', 'Both versions always run in step; the switch only changes which one you hear (a 20 ms crossfade). With Match loudness on, the louder version is turned down while comparing.'],
  ['master.match', 'Match loudness', 'Plays the louder version quieter so the comparison is fair.', 'The integrated loudness (ITU-R BS.1770) of both versions is measured and the louder one is turned down by the difference while comparing; nothing is turned up.'],
  ['master.level', 'Master level', 'Your listening volume, from mute to 0 dB. It is not part of the exported WAV.', 'Master Level changes what you hear and the output meters for the track and the stems, after the Original/Processed switch. Keyboard: arrows 0.5 dB, Page Up/Down 6 dB, Home mute, End 0 dB; double-click or "0 dB" resets. It is remembered in this browser, not saved in projects or exports.'],
  ['master.export', 'Export WAV', 'Renders the processed track to a new WAV file; the source is not changed.', 'The export uses the same processing as the preview at the file\'s own sample rate, in 24-bit or 16-bit with dither. With Space on you can include or cut the reverb tail. Master Level is not applied.'],
  // Mixer
  ['mixer.undo', 'Undo / Redo', 'Steps back or forward through processing changes (Ctrl/⌘ Z, Shift+Ctrl/⌘ Z).', 'One history for the whole chain: Undo in any editor undoes the newest change, whichever editor it was made in. A drag or a held key is one step; up to 100 steps.'],
  ['mixer.reset-layout', 'Reset window layout', 'Puts every editor window back to its first place.', 'Editors can be moved by their title bar and stay where you put them. Reset window layout returns them to their first places; it changes no settings.'],
  ['mixer.settings', 'Settings', 'Snapshots, whole-chain settings files and your account presets.', 'Settings… keeps session snapshots, downloads and loads whole-chain settings files (mps-chain) and, when signed in, your presets. These change every module; section presets in each editor change one module.'],
  ['mixer.stems', 'Stems', 'Plays several stems together through the master chain, each on its own strip.', 'Add stem WAVs (each up to 250 MiB); set gain, pan, mute, solo, offset and a chain per stem; render a stem master.'],
  ['mixer.eq', 'EQ module', '24-band parametric EQ per channel; opens the EQ editor.', 'The card shows the configured response even when nothing plays; "edited" means it differs from the defaults.'],
  ['mixer.dynamics', 'Dynamics module', 'Compressor; opens the Dynamics editor.', 'The card shows the configured transfer curve and the live gain reduction while playing.'],
  ['mixer.limiter', 'Limiter module', 'True-peak limiter; opens the Limiter editor.', 'The card shows the ceiling curve and the live gain reduction while playing.'],
  ['mixer.space', 'Space module', 'Stereo reverb; opens the Space editor.', 'The card shows the configured decay: pre-delay, the decay line, the faster high-frequency fall and the dry/wet balance.'],
  ['mixer.window', 'Move window', 'Drag the title bar to move the editor; with the keyboard use the arrow keys here (Home resets).', 'Arrow keys move 16 px, Shift+arrow 64 px, Home puts the window back. Windows stay inside the browser window and keep their place when closed and reopened.'],
  // EQ
  ['eq.channels', 'EQ edit mode (Link / Left / Right)', 'Link edits both channels together; Left or Right edits one channel.', 'In Link mode every change applies to the same band of both channels. Choosing Left or Right switches to independent channels starting from the linked settings.'],
  ['eq.on', 'EQ on', 'Switches the whole EQ on or off (bypass).', 'Bypass fades over 20 ms; the band settings are kept.'],
  ['eq.curve', 'EQ curve', 'Drag a point to change a band; double-click to add one; the shaded area is the live spectrum.', 'Points show enabled bands. Keyboard on a point: ←/→ frequency, ↑/↓ gain (Shift for bigger steps), Page Up/Down Q, Delete switches the band off.'],
  ['eq.bands', 'Band selector', 'Chooses which of the 24 bands the fields below edit.', 'Bands that are on are outlined in green.'],
  ['eq.band-on', 'Band on', 'Switches the selected band on or off.', 'A band that is off has no effect.'],
  ['eq.type', 'Band type', 'Bell, low/high shelf or low/high-pass for the selected band.', 'Bell and shelves use Gain; pass filters remove frequencies below (high-pass) or above (low-pass) the frequency.'],
  ['eq.frequency', 'Frequency', 'The centre or corner frequency of the band, 20 Hz–20 kHz.', 'The slider is logarithmic. Frequencies above 0.45 × the sample rate run at that limit.'],
  ['eq.gain', 'Gain', 'Boost or cut of the band in dB (±18 dB).', 'Positive values boost, negative values cut. Not used by pass filters.'],
  ['eq.q', 'Q', 'Width of the band: higher Q is narrower.', 'Q from 0.2 (very wide) to 12 (very narrow).'],
  // Dynamics
  ['dynamics.on', 'Compressor on', 'Switches the compressor on or off (bypass).', 'Bypass crossfades over 20 ms; the detector keeps running so it starts settled.'],
  ['dynamics.detector', 'Detector', 'Peak follows every peak; RMS (10 ms) follows the average level.', 'RMS is smoother for program material; Peak reacts to short transients.'],
  ['dynamics.threshold', 'Threshold', 'Level (dBFS) above which the compressor reduces gain.', 'Lower thresholds compress more of the signal. The transfer curve marks it.'],
  ['dynamics.ratio', 'Ratio', 'How strongly levels above the threshold are reduced (e.g. 4:1).', 'At 4:1, 4 dB over the threshold comes out 1 dB over. 1:1 is no compression.'],
  ['dynamics.attack', 'Attack', 'How fast gain reduction starts (ms).', 'Short attacks catch transients; longer attacks let them through.'],
  ['dynamics.release', 'Release', 'How fast gain reduction recovers (ms).', 'Short releases can pump; long releases sound smoother.'],
  ['dynamics.knee', 'Knee', 'Width of the soft transition around the threshold (dB).', '0 dB is a hard knee; wider knees start compressing gently.'],
  ['dynamics.makeup', 'Makeup gain', 'Gain added after compression (dB).', 'Use it to bring the level back up; the limiter still holds the ceiling.'],
  // Limiter
  ['limiter.on', 'Limiter on', 'Switches the true-peak limiter on or off.', 'With the limiter off, peaks above 0 dBFS can clip in the export.'],
  ['limiter.ceiling', 'Limiter ceiling', 'Limits peaks above the chosen ceiling (dBTP). Excessive limiting can reduce dynamics.', 'The limiter keeps true peaks (between samples, 8× detection) at or below the ceiling. −1.0 dBTP suits most streaming services; a lower ceiling adds headroom. It looks ahead 1.5 ms, so the output is slightly delayed and the original is delayed by the same amount for comparison.'],
  ['limiter.input', 'Input gain', 'Raises the level into the limiter (dB) to make the result louder.', 'More input gain means more limiting. Watch the gain-reduction meter.'],
  ['limiter.release', 'Release', 'How fast the limiter recovers after a peak (ms).', 'Short releases are louder but can distort; longer releases are cleaner.'],
  // Space
  ['space.on', 'Space on', 'Switches the reverb on or off; off by default.', 'Switching on starts from silence; switching off fades the reverb out in 20 ms. Space sits after the compressor and before the limiter.'],
  ['space.preset', 'Space preset', 'Room, Hall or Plate starting points of the same reverb.', 'Presets set mix, pre-delay, decay and damping together. They are not models of real rooms or plates. Editing a value shows "Custom".'],
  ['space.mix', 'Mix (wet)', 'How much reverb is heard (0 % dry … 100 % reverb only).', 'For mastering, small amounts (5–20 %) are usual.'],
  ['space.predelay', 'Pre-delay', 'Gap between the sound and the start of the reverb (ms).', 'Longer pre-delay keeps the dry sound clear in front of the reverb.'],
  ['space.decay', 'Decay (RT60)', 'Time for the reverb to fall by 60 dB at low frequencies (s).', 'Short decays sound like a room, long decays like a hall.'],
  ['space.damping', 'Damping', 'How much faster high frequencies fade than low ones.', 'More damping gives a darker, softer tail.'],
  // Presets
  ['presets.section', 'Section presets', 'Save or load this module\'s settings only; loading is one undo step.', 'A section preset (.mps-module.json) contains one module. Loading it changes only that module; a preset for another module, a whole-chain file or a project is refused. Projects and whole-chain settings are saved elsewhere.'],
  // Export
  ['export.format', 'Export format', '24-bit PCM, or 16-bit PCM with TPDF dither.', 'The export keeps the source sample rate and channels.'],
  ['export.tail', 'Reverb tail', 'With Space on: include the reverb after the source ends, or cut it.', 'Including adds pre-delay + decay seconds; cutting keeps the source length exactly.'],
  // Dialogs (dialog-level help; parameters inside are listed in the coverage inventory)
  ['dialogs.references', 'References', 'Measure and keep reference profiles (signed in) to compare against.', 'Reference profiles store measurements of a reference section, not the audio.'],
  ['dialogs.account', 'Account', 'Sign in for private presets, references and a private library.', 'Local work, projects and exports do not need an account.'],
];

// Entries are [id, section, name, short, long], or [id, name, short, long] with the section taken
// from the id prefix (transport.play → transport).
export const HELP = Object.fromEntries(entries.map(entry => {
  const [id, section, name, short, long] = entry.length === 5 ? entry : [entry[0], entry[0].split('.')[0], ...entry.slice(1)];
  return [id, { id, section, name, short, long }];
}));

export const helpAnchor = id => `help-${id.replace(/\./g, '-')}`;
