# MPS Apple standalone build kit — LAS-58

**Source/build kit, not a verified installer.** Baseline: `02963867dc1c5d5e3fb93cbf7eee85b9fa929771` from `delivery/LAS-40-all-sprints`. No main merge is required to test this branch.

This adds two native app targets containing the existing audio editor and shared DSP. It does not require a web browser, a manually running dev server, Node or an internet connection after installation. Compilation and runtime behavior still need the Apple validation below. Online account/library features are unavailable in this local edition. Save processed audio and JSON settings/session files before closing; reopening starts a new in-memory session.

## On a Mac

1. Install Xcode, open it once and install the iOS platform tools. Select it using `xcode-select` if necessary.
2. Install Node 22.13+ and XcodeGen. Rust, JUCE and Electron are not used.
3. Check out this complete feature branch. From the repository root:

```sh
bash scripts/apple/prepare.sh
open apple/MPSAudioStudio.xcodeproj
```

Select MPSMac to build/run on Mac. Select MPSiOS and an iPhone simulator to test the iOS interface. The iOS project also targets iPad. For a physical device, select your team under Signing & Capabilities, connect your device and follow Xcode's provisioning instructions. If the default bundle ID is unavailable, replace it consistently in `apple/project.yml` before regenerating.

## Build commands

```sh
# Development Mac build, unsigned if APPLE_TEAM_ID is not set
bash scripts/apple/build-macos.sh
# Simulator only: this does not produce an installable iPhone package
bash scripts/apple/build-ios.sh simulator
# Device archive: requires a configured signing team and profiles
APPLE_TEAM_ID=YOUR_TEAM_ID bash scripts/apple/build-ios.sh archive
```

Open `artifacts/apple/MPSiOS.xcarchive` in Xcode Organizer. Choose a distribution method available to your account. TestFlight requires the appropriate Apple developer/App Store Connect setup. Do not send certificates, passwords or provisioning secrets in chat. A signed iOS device build cannot be manufactured from a ZIP of web files.

## macOS installer

After a signed Release build, use your Developer ID Application identity and a preconfigured `notarytool` Keychain profile:

```sh
APPLE_TEAM_ID=YOUR_TEAM_ID bash scripts/apple/build-macos.sh
MAC_SIGN_IDENTITY='Developer ID Application: YOUR NAME (TEAM_ID)' \
  NOTARY_PROFILE='your-keychain-profile' bash scripts/apple/package-macos.sh
```

This creates an architecture-labelled DMG and checksum under `artifacts/apple/`, submits it for notarization and staples the ticket. Network access is needed for notarization. Mount the tested DMG and drag the app to Applications. Never tell users to disable Gatekeeper. Until signing and clean-machine testing succeed, the output is a development build only. Moving the app to Trash uninstalls the app; user exports remain where the user saved them.

## Validation and remaining release work

See [QA checklist](QA.md) and [architecture decision](../docs/ADR-004-apple-packaging.md). GitHub Actions is configured to compile the Mac app and iOS simulator app, run asset-server XCTest checks and upload development artifacts. A configured workflow is not evidence of a successful run. Native build/launch, file import/export, audio listening, physical iOS device testing, lifecycle handling, icons/privacy/submission metadata, distribution provisioning and notarization are **NOT_RUN / pending**.

No paid Apple account or signing identity was available in this authoring environment. No `.dmg`, `.ipa` or tested `.app` is included with this source change. Initial metadata is for development; do not upload to App Store Connect before supplying app icons and completing privacy/export-compliance review for the actual product.
