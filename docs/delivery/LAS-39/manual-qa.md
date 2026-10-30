# LAS-39 manual QA for Gennady

Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-39-QA-01 | Read "Data inventory, permissions and protocol" in the README. Decide whether your remembered decisions may ever be used for a local preference study (a new opt-in would be needed), and whether your own projects can form a first dataset. | The inventory, permissions and splits are clear, and leakage risks are named; your decision is recorded. | Not Run | NOT_RUN |
| LAS-39-QA-02 | Run `node --test docs/delivery/LAS-39/experiment/protocol.test.js`, then `node docs/delivery/LAS-39/experiment/experiment.js results.json` (about 7 min). Compare with `evidence/experiment-summary.json`. | 9 tests pass. The numbers match the evidence (the run is deterministic). You agree or disagree with the go/no-go. Listening is not part of this run. | Not Run | NOT_RUN |
