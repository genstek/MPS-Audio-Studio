# LAS-30 manual QA for Gennady

Actual results stay **Not Run** until you test. Use a reference you are entitled to use: a track you bought or the authorized Lia v6 file. It is stored only in your private library.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-30-QA-01 | Sign in → **References** → **Choose reference WAV** → set Start/End around the chorus (at least 5 s) → Name, Style (e.g. "Enigma"), Source version → **Measure segment** → **Save to my references**. | The table shows integrated loudness, loudness range, true peak, crest factor, correlation and tonal balance for exactly that segment; the saved entry shows name, version, segment and values under its style. | Not Run | NOT_RUN |
| LAS-30-QA-02 | On the saved entry press **Reanalyse**. Then sign in as a second test account (another browser profile) and open References. | "Reproducible: the same measurements." The second account sees no references. | Not Run | NOT_RUN |
| LAS-30-QA-03 | Delete the profile; save another, then delete the reference file in Account → library; finally delete a throwaway test account that has references. | The profile disappears; deleting the file or the account also removes its profiles (nothing left to open). | Not Run | NOT_RUN |
