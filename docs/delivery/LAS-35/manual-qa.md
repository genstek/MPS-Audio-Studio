# LAS-35 manual QA for Gennady

Actual results stay **Not Run** until you test. Use stems of one song at one sample rate.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-35-QA-01 | Mixer → **Stems…** → add your stems. Shape a vocal EQ in the mixer, then on the vocal strip press **Use master settings**; on the drums load a saved preset with **Load settings…**; **Bypass** one, then the others. **Save session file**, change some gains, **Load session file…**. | Each chain changes only its stem; Bypass returns it to the original sound; recall brings back gains, mutes and chains. | Not Run | NOT_RUN |
| LAS-35-QA-02 | Give two stems very different chains (one heavy, one bypassed) and play; compare with all bypassed. | No flamming or phasing between stems in either case (alignment kept). | Not Run | NOT_RUN |
| LAS-35-QA-03 | **Render stem master** → **Save** each file; import them into your DAW at zero. | The master and stem files have the song's length and rate, line up sample-exactly, and the stems sum to what you heard before the master; your source files are unchanged. | Not Run | NOT_RUN |
