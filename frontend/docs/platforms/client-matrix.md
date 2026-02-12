# TV Client Matrix

## Surface Matrix

| Surface | Runtime | Player | Primary Input | Distribution | Phase |
| --- | --- | --- | --- | --- | --- |
| web | Browser SPA | HLS.js | keyboard/mouse | Vercel / self-hosted | 3 |
| mobile (iOS) | Flutter/RN/native | AVPlayer | touch | App Store | 6 |
| mobile (Android) | Flutter/RN/native | ExoPlayer | touch | Play Store | 6 |
| desktop (macOS) | Electron/Tauri | HLS.js/native | keyboard/mouse | `.dmg` | 6 |
| desktop (Windows) | Electron/Tauri | HLS.js/native | keyboard/mouse | `.exe`/`.msi` | 6 |
| desktop (Linux) | Electron/Tauri | HLS.js/native | keyboard/mouse | `.AppImage`/`.deb` | 6 |
| android tv | Android Leanback | ExoPlayer | D-pad remote, BT controller | APK / Play Store | 6 |
| amazon fire tv | Android Leanback | ExoPlayer | Fire remote, BT controller | Amazon Appstore | 6 |
| roku | BrightScript/SceneGraph | Roku native | Roku remote | Roku Channel Store | 6 |
| webos (LG) | Web app | LG native | Magic Remote | LG Content Store | 6 |
| tvos (Apple TV) | Swift/TVML | AVPlayer/AVKit | Siri Remote, BT controller | App Store | 6 |
| samsung tizen | Tizen web app | Tizen AVPlay | Samsung remote | Samsung Apps | 6 |
| ntv os (mini-PC) | Linux Electron/CEF | mpv/GStreamer | BT controller, KB, IR, CEC | OS image flash | 9 |

## Content Vertical Support Per Platform

| Vertical | Web | Desktop | Mobile | Android TV | Fire TV | Roku | webOS | tvOS | Tizen | nTV OS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Movies/Shows | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Live TV | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Sports | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Podcasts | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Games | yes | yes | limited* | yes | yes | no | no | no | no | yes |

`*` Mobile games limited to Tier 1 emulators (lightweight retro systems only)

Games not supported on Roku, webOS, tvOS, Tizen due to platform runtime constraints.

## Platform-Specific Considerations

- remote navigation and focus behavior (wiki 48)
- codec/container support differences
- auth flow differences (device code vs full login)
- game controller support (Bluetooth HID)
- input abstraction layer (wiki 48)
- emulator tier capability per hardware (wiki 43, 46)
- offline/download support varies by platform
- background audio for podcasts (mobile and desktop)
- HDMI-CEC passthrough (nTV OS, some Android TV)
