# LAS-38 — Prototype application-controlled plugin processing after host feasibility passes

Jira: [LAS-38](https://genstek69.atlassian.net/browse/LAS-38) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-38.md` · Mode: GATED_PROTOTYPE · Prerequisite: LAS-37 (READY_FOR_QA as a research report; real-plugin feasibility NOT_RUN)

Developer status: **BLOCKED** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Why it is blocked
The work order allows this prototype only after **a positive LAS-37 feasibility decision and an available, permitted plugin and host**. Neither holds yet:
1. **LAS-37 has not proven a real plugin.**
   - Its recommendation is GO only for a scoped validation step: running a real plugin behind the bridge API.
   - The bridge mechanics passed with stand-in plugins, but a real VST3 or AU has not been loaded.
   - Gennady has not yet approved the architecture.
2. **No permitted host and plugin are runnable here.**
   - In this session, installing a VST3 host (pedalboard) and loading a permitted plugin binary (DISTRHO 3 Band EQ, LGPL-3+) was denied by the permission policy.
   - AU needs macOS, which is not available.
   - The work order forbids purchasing licenses and installing arbitrary plugins.

So no application code was written: no studio UI and no bridge client. Building studio controls for a plugin path that cannot run would be a "pretend control", which AGENTS.md forbids.

## What already exists for it
The LAS-37 prototype (`docs/delivery/LAS-37/prototype/`) already defines and tests the bridge API that LAS-38 would drive from the studio:
- discovery;
- instances;
- parameters with ranges;
- state save/restore with identity checks;
- bypass;
- offline processing;
- crash (502), hang (504), missing (404) and unauthorized (401/403) responses.

## Scoped plan once unblocked
1. **Gate:**
   - Gennady approves the LAS-37 architecture and permits a host and test plugin.
   - Candidates: the DISTRHO 3 Band EQ (LGPL-3+) through a JUCE- or pedalboard-based host, or Apple's built-in AUs on his Mac.
   - Repeat the LAS-37 tests with the real plugin.
2. **Studio side,** behind an explicit "Plugin bridge (experimental)" setting that is off by default:
   - **Pairing:** a pairing dialog with the token typed or pasted once and kept per origin, plus bridge status (connected, unreachable, unauthorized).
   - **Plugin slot:** an optional post-chain slot. It lists the discovered plugins with name, vendor, version and file hash, and shows the exposed parameters as normal studio controls (ranges from the bridge).
   - **Bypass and state:** a bypass button, and the plugin state saved in the project with its identity, refused on mismatch.
3. **Processing:**
   - The export renders the studio chain, then sends the audio to the bridge, then writes the file.
   - The preview of the plugin slot is an offline render of the selected range. Real-time preview is out of scope.
   - The report states the parity rule: preview and export use the same offline render.
4. **Failure handling:**
   - When the plugin is missing, incompatible or crashes, or the bridge is unauthorized or gone: a visible error.
   - The source and project are untouched, and the render without the plugin can still be made.
   - Tests use the stand-in host for automation and the real plugin for evidence.
5. **Evidence:**
   - A numerical fixture shows the plugin's measured effect.
   - Parameter and state recall are shown to be bit-identical.
   - Recovery from crash and unauthorized control is demonstrated.
   - Go/no-go for product integration.

## To unblock
- Gennady's decision on LAS-37 and permission (or his machine) for a real host and test plugin.
