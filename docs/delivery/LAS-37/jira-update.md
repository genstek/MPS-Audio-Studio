**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Research result — LAS-37

Scope: architecture decision and feasibility for VST3/AU hosting from the web studio.
- **Boundary:** a local paired bridge on 127.0.0.1, with one native host process per plugin instance and offline rendering first.
- **Prototype:** proves the bridge mechanics with stand-in plugins, 7/7 tests: token and origin checks, Private Network Access preflight, discovery, parameters, bit-identical state recall, exact bypass, crash and hang containment, limits.
- **Not run:**
  - a real permitted plugin: DISTRHO 3 Band EQ (LGPL-3+) was identified, but running it was denied by the session's permission policy;
  - AU: no Mac.
- **Recommendation:** GO for a scoped validation step with a real plugin on Gennady's machine, not product integration. LAS-38 stays gated.

Branch / PR: research/LAS-37-plugin-host-bridge → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: not applicable (design and prototype under docs/)
Material: docs/delivery/LAS-37/

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 why a native host; boundary | decision and diagram | PASS | README |
| AC-02 permitted plugin, routing, parameters, offline | mechanics PASS; real plugin NOT_RUN | PARTIAL | evidence/bridge-tests.txt |
| AC-03 platforms, formats, licensing, installation | recorded; licenses to verify | PASS | README |
| AC-04 threat model; go/no-go | recorded | PASS | README |

Commands/environment: node --test docs/delivery/LAS-37/prototype/bridge.test.js exit 0 (7/7), Node 22.22, Linux.
Manual QA: docs/delivery/LAS-37/manual-qa.md; Gennady execution NOT_RUN.
Limitations/blockers: real-plugin execution not permitted in this session; no macOS; licenses recalled; live preview through plugins only outlined.
Disposition: READY_FOR_QA (research report)

No claim of manual sign-off, Jira closure or main merge is implied.
