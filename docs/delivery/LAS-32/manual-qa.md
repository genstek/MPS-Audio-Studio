# LAS-32 manual QA for Gennady

Actual results stay **Not Run** until you test. Use your own mix and a reference you are entitled to use. The listening judgement is yours; the studio only measures.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-32-QA-01 | Import your mix → **Compare** → choose the reference and comparable sections (for example both choruses) → **Measure and compare** → **Propose settings**. Note the values; press **Propose settings** again after closing and reopening with the same sections. | Cards for EQ, Compressor, Limiter and Width, each with a measured reason, exact values, supported range and uncertainty; the same values both times. | Not Run | NOT_RUN |
| LAS-32-QA-02 | Try a deliberately mismatched pair: a much darker or brighter reference, a heavily limited reference, a quiet demo against a loud master. | Guard notes say where the proposal stopped (−6/+4 dB per band, ratio 3, 6 dB of limiting, 12 dB of gain); nothing extreme is applied silently. | Not Run | NOT_RUN |
| LAS-32-QA-03 | **Preview proposal** at 100 % and 50 %; **Start monitor** and switch Reference / Processed mix; **Check at this strength**. Then **Reject proposal**; propose again, **Apply proposal**, close the dialog and press **Undo** in the mixer. | Preview changes the sound but not your settings; Reject brings back your sound; after Apply, Undo restores your complete previous chain. Write down whether the proposal sounds closer to the reference at matched loudness. That is the listening result for AC-04. | Not Run | NOT_RUN |

Listening evaluation (AC-04): for at least two of your own songs, compare **Mix**, **Processed mix (proposal)** and **Reference** in the level-matched monitor, or prepare blind files with the LAS-29 listening-set tool (`npm run listening:set`). Record which you prefer and why. Until then the listening part stays NOT_RUN.
