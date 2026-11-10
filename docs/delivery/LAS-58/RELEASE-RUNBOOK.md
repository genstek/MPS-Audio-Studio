# LAS-58 Apple release & install runbook

Four different things — do not confuse them:

| Artifact | What it is | Installs on |
| --- | --- | --- |
| Development DMG / app ZIP (unsigned, Debug) | Owner-only QA build | Macs, macOS 13+, after a Gatekeeper override for this one app |
| Signed + notarized DMG | Production installer; needs Apple Developer Program | Macs, macOS 13+, no warning |
| iOS simulator ZIP | `MPSiOS.app` for the Xcode Simulator | **Simulator only. Cannot install on a physical iPhone.** |
| Physical iPhone / TestFlight | Needs team, provisioning, App Store Connect | Blocked without Apple credentials |

## Status (honest table)

| Gate | Result |
| --- | --- |
| Web CI on main (lint/Vitest/Playwright) | PASS per run 42787479384 (reported in the issue; not re-run here) |
| Apple CI on `main` HEAD | **NOT_RUN by the assistant** — the assistant cannot trigger workflows or read runner logs. Owner must dispatch it (below). Run 42647865907 was on branch `fix/ci-macos15-retired-runner`, not main. |
| Apple CI on this PR SHA | Runs automatically if the PR touches `apple/**` / `scripts/apple/**` (path-filtered); record link here when green |
| `lipo` / `otool` evidence from a real binary | NOT_RUN here (Linux). `package-dev-macos.sh` produces `PROVENANCE.txt` and fails if arm64/x86_64 or minos 13.0 is missing |
| macOS Intel Ventura 13.7.8 runtime | **PENDING** (owner) |
| macOS Apple Silicon Ventura runtime | **PENDING** |
| iOS simulator build | PASS on older branch run only; re-verify on main via dispatch |
| Physical iOS | BLOCKED (no provisioning) |
| Signing / notarization | BLOCKED (no credentials) |

## A. Run Apple CI on main (GitHub UI)

1. Repo → **Actions** → **Apple build validation** → **Run workflow** → branch `main` → **Run workflow**.
2. Open the run; confirm the commit SHA shown matches `git rev-parse origin/main`.
3. All steps (prepare, lint/unit, Mac build, AssetServerTests, iOS simulator build, package) must be green.
4. Scroll to **Artifacts** → download `apple-development-builds` (14-day retention). It holds the unsigned DMG, app ZIP, simulator ZIP and `SHA256SUMS.txt`.

Note: the workflow checksum file covers the DMG only, and the CI DMG name does not embed the SHA. Prefer the local script below when you need traceable provenance.

## B. Build a development DMG locally (recommended)

Prerequisites: macOS 13+, Xcode 15.2 (opened once), Node 22.13+, XcodeGen (`brew install xcodegen`), git.

```sh
git clone https://github.com/genstek/MPS-Audio-Studio.git   # first time only
cd MPS-Audio-Studio
git fetch origin
git switch main && git pull --ff-only          # latest main
# or a PR:  git fetch origin pull/<N>/head:pr-<N> && git switch pr-<N>
bash scripts/apple/package-dev-macos.sh
```

Output in `artifacts/apple-dev/MPS-Audio-Studio-<ver>+<build>-<sha>[-dirty]-DEV-UNSIGNED/`:
`*.dmg`, `*-app.zip`, `SHA256SUMS.txt`, `PROVENANCE.txt` (git SHA, Xcode, host OS, architectures, minos). The script aborts if the executable lacks `x86_64` or `arm64`, or its minimum macOS is not 13.0. The underlying Xcode `.app` is `apple/build/Build/Products/Debug/MPSMac.app`.

Verify manually:

```sh
cd artifacts/apple-dev/*-DEV-UNSIGNED
shasum -a 256 -c SHA256SUMS.txt
APP=../../../apple/build/Build/Products/Debug/MPSMac.app
EXE="$APP/Contents/MacOS/$(plutil -extract CFBundleExecutable raw "$APP/Contents/Info.plist")"
lipo -archs "$EXE"                      # expect: x86_64 arm64
otool -l "$EXE" | grep -A4 LC_BUILD_VERSION   # expect minos 13.0
ls "$APP/Contents/Resources/WebAssets"  # bundled UI, no server needed
```

The build host (macOS 14/15 CI, Xcode 15+) is distinct from the minimum runtime (13.0). A binary with minos 13.0 still needs real Ventura testing — that is the PENDING gate.

## C. Install, launch, update, uninstall

1. Mount the DMG, drag **MPS Audio Studio** to **Applications**, eject the DMG.
2. First launch: the build is unsigned, so Gatekeeper blocks it. Right-click the app → **Open** → **Open**, or System Settings → Privacy & Security → **Open Anyway** for this app. Do **not** run `spctl --master-disable` or otherwise disable Gatekeeper globally. Files downloaded via browser carry a quarantine flag; a locally built DMG usually does not.
3. Relaunch normally afterwards.
4. Update: quit the app, build/download the newer DMG, verify checksum, drag over the old app (Replace). Settings and sessions are in-memory; save exports/JSON first.
5. Uninstall: quit, move the app from Applications to Trash. Exports stay where you saved them.

## D. Diagnostics to attach to a bug report

```sh
sw_vers; uname -m; sysctl -n machdep.cpu.brand_string
cat artifacts/apple-dev/*/PROVENANCE.txt
log show --last 10m --predicate 'process == "MPSMac"' --style compact > ~/Desktop/mps-log.txt
```

Also use Console.app → Crash Reports (`MPSMac`), and Safari Develop → Web Inspector console if enabled. Do not include secrets or credentials.

## E. Troubleshooting

- `xcodegen: command not found` → `brew install xcodegen`.
- `npm ci` fails → check `node -v` (22.13+).
- Xcode picks the wrong toolchain → `sudo xcode-select -s /Applications/Xcode.app`.
- "damaged and can't be opened" on a downloaded artifact → `xattr -dr com.apple.quarantine "/Applications/MPS Audio Studio.app"` (that app only), after verifying the SHA-256.
- Blank window → confirm `WebAssets` exists in the bundle; rerun the script.
- DMG exists error → move the old output directory.

## F. iOS simulator (not a device build)

```sh
bash scripts/apple/build-ios.sh simulator
open apple/MPSAudioStudio.xcodeproj   # choose MPSiOS + an iPhone simulator, Run
```

Deployment target iOS 16.0. CI's `MPSiOS-simulator-only.zip` is for the simulator only. Physical device or TestFlight (optional, needs credentials): enroll in the Apple Developer Program, set your team in Signing & Capabilities, `APPLE_TEAM_ID=<team> bash scripts/apple/build-ios.sh archive`, then validate/distribute from Xcode Organizer. Needs icons, privacy and export-compliance metadata first.

## G. Public macOS release (signed + notarized)

Prerequisites: paid Apple Developer Program membership; a **Developer ID Application** certificate in your login Keychain; a notarytool Keychain profile created once with `xcrun notarytool store-credentials` (it prompts for credentials locally — never paste them in chat, issues or logs).

```sh
export APPLE_TEAM_ID=YOURTEAMID
bash scripts/apple/build-macos.sh                      # Release, signed with the team
MAC_SIGN_IDENTITY='Developer ID Application: NAME (TEAMID)' \
  NOTARY_PROFILE='your-profile' bash scripts/apple/package-macos.sh
spctl --assess --type open --context context:primary-signature -v artifacts/apple/MPS-Audio-Studio-universal.dmg
xcrun stapler validate artifacts/apple/MPS-Audio-Studio-universal.dmg
shasum -a 256 -c artifacts/apple/MPS-Audio-Studio-universal.dmg.sha256
```

Only after notarization succeeds and a clean-machine install passes is the DMG a release candidate. Publishing a GitHub Release is a separate human decision.

## H. Ventura acceptance checklist (all PENDING until the owner runs it)

Record for each: Mac model/arch, macOS version, git SHA from `PROVENANCE.txt`, result.

| # | Check | Intel Ventura 13.7.8 | Apple Silicon Ventura |
| --- | --- | --- | --- |
| 1 | Offline cold launch (Wi-Fi off), no server running | PENDING | PENDING |
| 2 | WebAssets local; AudioWorklet starts, no console errors | PENDING | PENDING |
| 3 | Import known 48 kHz WAV | PENDING | PENDING |
| 4 | Play / Pause / Stop / Seek | PENDING | PENDING |
| 5 | Processed/Original toggle and EQ controls affect sound | PENDING | PENDING |
| 6 | Settings don't silently reset | PENDING | PENDING |
| 7 | Export WAV 48 kHz and 96 kHz/24-bit; reimport; verify | PENDING | PENDING |
| 8 | Original file checksum unchanged | PENDING | PENDING |
| 9 | Save and reload project/settings JSON | PENDING | PENDING |
| 10 | macOS open/save dialogs, cancel paths | PENDING | PENDING |
| 11 | Reinstall/update over existing app | PENDING | PENDING |
| 12 | `lipo`/`sw_vers`/`uname -m` captured | PENDING | PENDING |

Known separate issues, not touched here: LAS-160 (native EQ slider), LAS-166 (audio/EQ dropping, on hold pending repro), LAS-167 (meter jitter).
