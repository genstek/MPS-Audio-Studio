# Apple release validation — all results NOT_RUN until recorded

For every run record Git SHA, Xcode/OS/device/CPU versions, audio route, source WAV format, commands, actual outcomes and evidence in `docs/delivery/LAS-58/`. Browser test counts from LAS-40 are baseline evidence only.

| Gate | Required checks | Current result |
| --- | --- | --- |
| Build | XcodeGen; macOS compilation; iOS simulator compilation; asset server XCTest | NOT_RUN |
| Offline startup | Disconnect internet; installed app opens built UI with no dev server; no remote requests | NOT_RUN |
| Local server | Valid JS MIME; token isolation; traversal/missing asset denied; no API/write support | NOT_RUN |
| Import | Native picker cancel/retry; Files and iCloud-downloaded WAV; mono/stereo 16/24/float, 44.1/48/96 kHz; corrupt and oversized input | NOT_RUN |
| Audio | Actual audible output; pause/resume/stop; EQ/dynamics/limiter changes; level-matched A/B; workers and AudioWorklet start without CSP errors | NOT_RUN |
| Export | Save WAV via macOS Save panel and iOS Share → Files; cancel; existing filename; low disk; reimport; independently check sample count/rate/bit-depth/true peak and original checksum | NOT_RUN |
| Settings | Download and restore chain/session JSON through native UI; wrong file rejected; source audio not embedded | NOT_RUN |
| Stems | Multiple Files selection; gain/pan/mute/solo; session recall; export; original files unchanged | NOT_RUN |
| Lifecycle | Phone call, headphones/Bluetooth route change, silent switch, lock/unlock, background/foreground, WebKit termination, restart after failure | NOT_RUN |
| Resources | Long/large WAV and multiple stems on actual iPhone; memory pressure; no UI freeze; 30-minute processing/playback | NOT_RUN |
| UX | iPhone portrait/landscape, iPad, safe areas, scrolling/dialogs, VoiceOver, keyboard Mac | NOT_RUN |
| Mac delivery | Sign, notarize, staple; clean-machine install/launch/uninstall; separate architecture evidence | NOT_RUN |
| iOS delivery | Team/provisioning; actual device install; appropriate distribution validation; icons and privacy metadata | NOT_RUN |

Release blockers: no Apple runtime was available to the author. The current wrapper does not promise background playback, native plugin hosting, cloud sync or persistent unsaved sessions. Fix failed gates before marking LAS-58 QA Ready or publishing installers. Keep Gennady's manual acceptance separate from developer checks.
