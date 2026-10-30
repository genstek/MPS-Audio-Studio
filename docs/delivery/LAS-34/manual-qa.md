# LAS-34 manual QA for Gennady

Actual results stay **Not Run** until you test. Use stems exported from one session of your DAW (same start, same rate), plus one stem at another rate or length for QA-03.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-34-QA-01 | Mixer → **Stems…** → **Add stem WAVs** (all stems of one song) → **Play**; **Pause** and **Play** several times; drag **Position** while playing; **Stop**. | The stems stay together: no flamming or phasing after repeated pause/seek; the time readout follows; the single-track transport shows Stopped. | Not Run | NOT_RUN |
| LAS-34-QA-02 | Change **Gain** and **Pan** on one stem; **Mute** one, **Solo** another; watch the meters. | Only that stem changes; Solo leaves only soloed stems; meters move with the sound (a muted stem reads silent). | Not Run | NOT_RUN |
| LAS-34-QA-03 | Add a stem at another sample rate and one shorter stem; set an **Offset** on one stem; **Remove** one; close the dialog and play your single track. | Notes name the resampling and the different end times; the offset delays only that stem; removing works; the single track plays normally afterwards. | Not Run | NOT_RUN |
