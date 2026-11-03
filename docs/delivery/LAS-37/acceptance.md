# LAS-37 acceptance trace

Research for the feasible subset. Developer results; a real-plugin run and Gennady's review are NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-37-AC-01 | Why native VST3/AU needs a native host; browser/host boundary defined | Architecture decision and boundary diagram; repository inventory (no native code exists) | PASS | README |
| LAS-37-AC-02 | Feasibility evidence: a permitted test plugin, audio routing, parameter access, preview/offline behaviour | Bridge routing, parameters, state, bypass and offline processing proven with stand-ins (7/7). A permitted plugin was identified (DISTRHO 3 Band EQ, LGPL-3+), but running it was not permitted in this session; AU needs macOS | PARTIAL: mechanics PASS; real plugin NOT_RUN | `evidence/bridge-tests.txt`, README |
| LAS-37-AC-03 | Platform/architecture compatibility, formats, JUCE/SDK/plugin licensing and installation recorded | Formats and platforms, arm64/x86 per process, licenses (recalled, to verify), signing and notarization, scanning | PASS (with verification needs) | README |
| LAS-37-AC-04 | Threat model (untrusted plugins, bridge authentication, file/system permissions, crashes, resources); go/no-go with a scoped next step | Threat table; GO for a scoped validation step, not product integration; LAS-38 stays gated | PASS | README |

## Focused verification cases
| Case | Developer result | Manual status |
| --- | --- | --- |
| LAS-37-QA-01 | stand-in routing and parameter/state evidence; real-plugin blocker recorded precisely | NOT_RUN |
| LAS-37-QA-02 | unauthorized client, crash and hang containment executed; source buffer preserved | NOT_RUN |
