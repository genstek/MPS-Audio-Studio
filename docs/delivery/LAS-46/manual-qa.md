# LAS-46 manual QA for Gennady

Not ready for QA: blocked on the approved design. When it is unblocked, these cases apply. Actual results stay **Not Run**.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-46-QA-01 | Import → analyze → proposal → edit/undo → reference A/B → stem mix → export in the approved UI. | Correct engine state and clear completion/error feedback at each step. | Not Run | NOT_RUN |
| LAS-46-QA-02 | Cancel, retry and return to the project at several steps. | Recoverable; no lost source, settings or playback state. | Not Run | NOT_RUN |
