# LAS-37 manual QA for Gennady

Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-37-QA-01 | Decide whether a real plugin may be run (the permission was denied in this session). If yes, on your Mac or here: run a permitted plugin behind the same bridge API and repeat the prototype tests with it. | Measurable processing, parameters and state recalled, bypass exact; or the exact reason it could not run. | Not Run | NOT_RUN |
| LAS-37-QA-02 | Read the threat model and the boundary; try `node --test docs/delivery/LAS-37/prototype/bridge.test.js`. | You agree or disagree with the local-bridge architecture; the tests pass on your machine. | Not Run | NOT_RUN |
