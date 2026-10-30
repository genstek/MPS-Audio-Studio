# LAS-36 manual QA for Gennady

Actual results stay **Not Run** until you test. This is the scoped next step, run where model hosts are reachable (your Mac).

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-36-QA-01 | Install one or two ML separators in a virtual environment. Separate the mixtures of a few multitracks you are entitled to use; export each multitrack's true vocals/drums/bass/other. Run `separation_eval.py --score truth/ estimates/` for each. | A JSON report per song (SI-SDR, bleed, transients, mono, residual), plus your runtime notes. | Not Run | NOT_RUN |
| LAS-36-QA-02 | Listen to each estimated stem against its true stem at matched loudness; rate bleed, transient damage and warbling (1–5). | Your ratings and a GO or NO-GO per use case (for example vocal-only karaoke, drum replacement). | Not Run | NOT_RUN |
