# ADR-004: additive Apple standalone packaging

Date: 2026-10-30. Issue: LAS-58. Status: implementation proposed; Apple execution NOT_RUN.

The owner explicitly resumed standalone delivery for macOS and iOS alongside the web application. Preserve ADR-002 and the existing React/Web Audio DSP; do not restart the historical JUCE rewrite. Package the Vite production assets inside a SwiftUI/WKWebView host. A loopback-only, random-port, token-path HTTP server serves immutable bundled assets so ES modules, workers and AudioWorklets retain HTTP-origin behavior. No remote website is loaded and no Node runtime is shipped. HTTP transport is local only; the asset server cannot accept writes or expose account APIs.

The wrapper uses WebKit on both platforms. Existing Chromium tests do NOT prove WebKit compatibility, device audio quality or background behavior. Native compilation, AudioWorklet/worker initialization, download interception and Files integration are mandatory gates before release. If the feasibility spike fails, fix the integration or revisit the wrapper, rather than claiming a working installer.

Targets: macOS 13+ and iOS/iPadOS 16+ are build settings, not verified compatibility. Builds use the host Mac architecture; Intel and Apple Silicon need separate validation. Initial scope is foreground local processing, WAV import/export, file-based settings/session recall. Cloud accounts, saved online references and server-side preferences are unavailable. The wrapper uses nonpersistent website storage: closing it discards unsaved in-memory session state. No background audio entitlement is requested; interruption/route-change recovery is a release gate. No native AU/VST3 hosting is added.

Export downloads go to a fresh temporary directory, then to a macOS Save panel or iOS system share sheet. macOS refuses overwriting existing paths; iOS Files destination semantics are controlled by the system and must be tested with a distinct export filename. Originals are never intentionally modified. Do not treat export rendering completion as confirmation that a file was saved by the user.

Distribution: macOS .app → signed/notarized DMG; iOS Xcode device build or signed archive followed by an authorized Apple distribution method. A simulator .app is not installable on an iPhone. An archive is not an installable IPA. Team identity, certificate/provisioning setup and developer enrollment are not known; no secrets belong in Git.

References: https://developer.apple.com/documentation/webkit/wkdownload ; https://developer.apple.com/documentation/network/nwlistener ; https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution ; https://help.apple.com/xcode/mac/current/en.lproj/dev31de635e5.html
