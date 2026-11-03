# LAS-31 manual QA for Gennady

Actual results stay **Not Run** until you test. Use your own mix and a reference you are entitled to use (a track you bought, or the authorized Lia v6 file once provided). Everything is measured on your Mac; a saved reference comes from your private library.

Preparation: load your mix with **Import WAV**. For QA-02 also prepare a mono WAV, a short WAV (under 5 s), and a WAV with a silent passage (all can be exported from your DAW).

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-31-QA-01 | **Compare** (Tracks heading) → choose a saved reference (or **WAV on this device**) → set **Mix start/end** around your chorus → **Measure and compare**. Then **Start monitor** and switch **Reference / Mix / Processed mix** several times; change the mix section and compare again. | The table shows loudness, true peak, loudness range, crest factor, PLR, correlation, side/mid, mono change and octave bands with units; loudness is labelled "Level difference (not a quality measure)". The monitor loops both sections and switches instantly; the three versions sound about equally loud (the status line names the gains). | Not Run | NOT_RUN |
| LAS-31-QA-02 | Compare with: a mono reference; a reference section much longer than the mix section; a mix section under 5 s; a silent reference section. | Mono: stereo rows say "not compared". Lengths: an *Uncertain* note, interpretations marked "(uncertain…)". Short: a reliability note. Silent: "The reference section is silent; choose a section with music." No error page, no "NaN" or "Infinity". | Not Run | NOT_RUN |
| LAS-31-QA-03 | Before comparing, note your EQ/Dynamics/Limiter settings. Choose another saved reference, compare, monitor, close the dialog. | The settings are unchanged (open the editors; Undo has no new step). Playback after closing sounds as before. | Not Run | NOT_RUN |

Please also note by ear whether the matched-loudness switching feels fair; that is a listening judgement, recorded separately from these checks.
