# LAS-37 — Design and evaluate a native VST3/AU host bridge for the web studio

Jira: [LAS-37](https://genstek69.atlassian.net/browse/LAS-37) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-37.md` · Mode: RESEARCH · Prerequisite: LAS-29 (READY_FOR_QA)

Branch `research/LAS-37-plugin-host-bridge` (design, prototype and tests under `docs/`; no application change)

Developer status: **READY_FOR_QA** (design + bridge prototype for the feasible subset) · Real VST3/AU plugin run: **NOT_RUN — not permitted in this session; macOS unavailable** · Jira sync: **SYNC_PENDING**

## Inventory: what native code exists
- **None that runs.** The repository holds only historical documents:
  - ADR-001 chose JUCE/C++ for macOS;
  - ADR-002 replaced it with the web-first studio and records that "no native project currently exists";
  - `docs/PRESETS_AND_PLUGINS.md` lists AU/VST3 hosting as a P2 feature that must not be advertised before it is implemented and tested.
- The browser app is unchanged by this work.

## Architecture decision
**Why a browser cannot load VST3 or AU plugins:**
- They are native shared libraries (`.vst3` bundles, `.component` bundles) that must be loaded into a native process: `dlopen`, Core Foundation bundles, the plugin's own threads and GUI.
- A web page cannot load native code, and WebAssembly cannot run an existing x86/ARM plugin binary.
- So plugin processing needs a **native host process** on the user's computer, which the studio controls.

**Boundary:**
```
Browser (studio, React/Web Audio)  ──HTTPS page──▶  local bridge (127.0.0.1, paired token)  ──IPC──▶  one host process per plugin instance
        UI, analysis, own DSP                           discovery, control, audio transfer             loads the VST3/AU, processes audio
```
- The **studio** keeps its own DSP, preview and export. Plugin processing is an optional stage that the studio asks the bridge to run.
- The **bridge** is a small local service that the user installs and starts, and it **listens on 127.0.0.1 only**.
- Each plugin instance runs in **its own process**, so a crash or a hang loses that instance only.
- **Audio:** offline rendering through the bridge is the first target: the file goes in and the processed file comes out, so preview/export parity is exact for that stage. Live preview through a plugin needs the bridge to do audio I/O itself, or to stream blocks over a WebSocket with added latency. That is a separate, later decision.
- **Plugin GUIs** cannot be embedded in a web page. Either the bridge opens the plugin's native window, or the studio controls exposed parameters only (the LAS-38 workflow needs parameters only).

## Feasibility evidence (this environment)
| Item | Status | Evidence |
| --- | --- | --- |
| Bridge mechanics: pairing token, origin check, Private Network Access preflight, discovery, per-instance processes, parameters with ranges, state save/restore, bypass, offline processing, crash and hang containment, body limits | **RUN, 7/7 PASS** | `prototype/bridge.js`, `prototype/host.js`, `prototype/bridge.test.js`, `evidence/bridge-tests.txt` |
| A real, permitted VST3 plugin through a real host | **NOT_RUN** | See below |
| AU (Audio Unit) | **NOT_RUN** | macOS only; no Mac in this environment |

**What the prototype proves**, using stand-in "plugins" built from the studio's own DSP and clearly labelled not to be VST3:
- Requests without the pairing token get 401. A browser request from another origin gets 403, even with the token. The studio's preflight, including `Access-Control-Request-Private-Network`, is answered.
- Processing through an isolated host process changes the audio by exactly the stand-in's transfer function (within 0.05 dB at 100 Hz and 10 kHz). Bypass is bit-exact, and the caller's buffer is untouched.
- State saved from one instance restores **bit-identical** processing in a new instance. State from another plugin or version is refused (409).
- A plugin that crashes takes down only its host process: the call returns 502 with the exit code, and the instance must be reloaded. The bridge and other instances keep working.
- A plugin that hangs is killed after the timeout (504) instead of blocking the bridge.
- Oversized bodies get 413 after being drained, not a reset connection; bad formats get 422; unknown plugins and instances get 404. No host process is left after shutdown.

**Defect found by the prototype tests:** the first version answered 413 before reading the oversized body, so the connection was reset and the client never saw the answer. It now drains the body (up to four times the limit) first, as the studio's account server already does.

**Why no real plugin was run:**
1. A permitted test plugin was found: **DISTRHO 3 Band EQ**, LGPL-3.0-or-later, from Ubuntu's `dpf-plugins-vst3` package. Its license was read from the package's copyright file.
2. A host was also available: the `pedalboard` Python package on PyPI, a GPL-3.0 VST3 host built on JUCE.
3. Installing that host and loading the plugin binary was **denied by this session's permission policy**: it counts as running code from external sources.
4. I did not work around the denial. The unpacked plugin files were deleted unused.

A real-plugin run therefore needs Gennady's permission, or his machine.

## Platform, format and licensing notes (to verify before any build)
- **Formats and platforms:**
  - VST3 works on macOS, Windows and Linux.
  - AU is macOS only. A Mac with Apple silicon needs arm64 (or universal) plugin binaries; Rosetta cannot mix architectures in one process, which is another reason for one host process per plugin.
- **Licenses**, recalled from upstream documentation and **not re-verified here**:
  - JUCE: AGPLv3 or a commercial license.
  - VST3 SDK: Steinberg's terms; the license changed in recent versions, so check the current SDK.
  - Apple's AudioUnitSDK: Apache-2.0.
  - pedalboard: GPLv3.
  - The bridge's own license depends on which host library is linked.
- **Installation and distribution:**
  - The bridge is a native app the user installs.
  - On macOS it must be signed and notarized (AGENTS.md: document signing honestly and never bypass Gatekeeper), and the user must allow it to access plugin folders.
  - Plugin scanning runs in a separate process (scanners crash on bad plugins).

## Threat model
| Threat | Mitigation in the design / prototype |
| --- | --- |
| A web page on another site drives the bridge (CSRF/DNS rebinding) | 127.0.0.1 only; secret pairing token required on every call; strict Origin allowlist (403 otherwise); Host header check planned; no cookies |
| The token leaks | It is shown once for pairing and stored only by the studio (per-origin storage) and the bridge (file readable by the user only). It can be rotated, and revoked by restarting with a new token |
| A malicious or buggy plugin | One process per instance; memory limit; processing timeout; kill and report; no plugin installation by the bridge; only plugins in the user's standard folders, with identity (name, vendor, version, file hash) shown |
| Plugin reads or writes the user's files | The OS sandbox on macOS (App Sandbox for the host processes) is to be evaluated. The bridge passes audio buffers, never file paths, to plugin processes |
| Resource exhaustion | Body size limit (413), timeout (504), one instance per process, per-session instance limit (to add) |
| Loss of the user's work | The studio keeps the source and project. Plugin output is a new render. A crash only fails that render, with a clear error |

## Recommendation
- **GO for a scoped validation step**, not for product integration.
- The architecture (local paired bridge, one process per plugin instance, offline rendering first) is sound and its control and isolation mechanics are proven. What is not yet proven is a real plugin on the target platform.
- **Scoped next step:**
  1. With Gennady's permission, or on his Mac, run a permitted plugin (for example the LGPL DISTRHO 3 Band EQ, or Apple's built-in AUs on macOS) through a real host process behind this same bridge API.
  2. Repeat the prototype's tests with it: measurable processing, parameter and state recall, crash containment, unauthorized client.
- LAS-38 (app-controlled prototype) stays gated until that run and Gennady's architecture approval.

## How to run the prototype tests
```sh
node --test docs/delivery/LAS-37/prototype/bridge.test.js
```

## Limitations
- The stand-in plugins are not VST3 or AU; nothing here claims plugin support.
- No real plugin was run (session permission policy) and no Mac was available (AU, signing, notarization).
- The licensing notes are recalled, not re-verified.
- Live preview through plugins is designed only in outline.
