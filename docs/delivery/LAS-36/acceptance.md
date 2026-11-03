# LAS-36 acceptance trace

Research for the feasible subset. Developer results; the ML comparison and the listening review are NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-36-AC-01 | At least two feasible approaches compared for vocal/drum/bass/other when resources allow; unavailable options documented | Two feasible classical approaches run and scored per stem. Three ML candidates documented as unavailable, with host-by-host reachability evidence | PASS (feasible subset); ML NOT_RUN (blocked) | `evidence/separation.json`, `evidence/model-hosts.md` |
| LAS-36-AC-02 | Listening and objective comparisons record bleed, transient damage, warbling, phase/mono, recombination residual | Objective: SI-SDR, bleed per source, kick transient loss, L/R correlation and mono loss, recombination residual. Listening (including warbling): **NOT_RUN** | PARTIAL: objective PASS, listening NOT_RUN | `evidence/separation.json` |
| LAS-36-AC-03 | Runtime, hardware/memory, model license, deployment/privacy options and cost assumptions recorded | Runtime and memory measured for A and B on the recorded host; licenses recalled and flagged for verification; deployment and privacy table; cost formula (no invented figures) | PASS (with stated verification needs) | README |
| LAS-36-AC-04 | Go/no-go with supported use cases, quality gates and a separately scoped integration step; never lossless source recovery | NO-GO for classical separation; ML not decided (blocked); quality gates; scoped next step with a runnable scorer; "never describe as lossless" | PASS | README |

## Focused verification cases
| Case | Developer result | Manual status |
| --- | --- | --- |
| LAS-36-QA-01 | feasible candidates run with runtime and artefact measures; ML blockers recorded precisely | NOT_RUN |
| LAS-36-QA-02 | numerical comparison and go/no-go; listening comparison NOT_RUN | NOT_RUN |
