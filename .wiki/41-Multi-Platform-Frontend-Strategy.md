# 41 - Multi-Platform Frontend Strategy

## Objective

Define the complete platform surface matrix, technology choices per target, shared code strategy, and input model for every deployment target nTV must support.

## Platform Surface Matrix

### Tier A — Primary (launch targets)

| Platform | Runtime | Player SDK | Input Model | Distribution |
| --- | --- | --- | --- | --- |
| Web | Browser (SPA) | HLS.js over MSE | keyboard/mouse | Vercel / self-hosted |
| Android TV | Android (Leanback) | ExoPlayer | D-pad remote, BT controller | APK sideload, Google Play |
| nTV OS (mini-PC) | Linux (Electron/CEF or Wayland native) | mpv / GStreamer (VA-API) | BT controller, USB KB/mouse, IR, HDMI-CEC | nTV OS image flash |

### Tier B — High priority

| Platform | Runtime | Player SDK | Input Model | Distribution |
| --- | --- | --- | --- | --- |
| iOS | Flutter / RN / native | AVPlayer | touch, AirPlay | App Store |
| Android Mobile | Flutter / RN / native | ExoPlayer | touch, Chromecast | Play Store |
| macOS | Electron / Tauri | HLS.js or native | keyboard/mouse/trackpad | `.dmg`, Homebrew cask |
| Windows | Electron / Tauri | HLS.js or native | keyboard/mouse | `.exe` / `.msi`, winget |
| Linux Desktop | Electron / Tauri | HLS.js or native | keyboard/mouse | `.AppImage` / `.deb` / Flatpak |
| Amazon Fire TV | Android (Leanback) | ExoPlayer | Fire remote, BT controller | Amazon Appstore |

### Tier C — Extended

| Platform | Runtime | Player SDK | Input Model | Distribution |
| --- | --- | --- | --- | --- |
| tvOS (Apple TV) | Swift / TVML | AVPlayer / AVKit | Siri Remote, BT controller | App Store |
| Roku | BrightScript + SceneGraph | Roku native player | Roku remote | Roku Channel Store |
| webOS (LG) | Web app (enact/vanilla) | LG native player | Magic Remote | LG Content Store |
| Samsung Tizen | Tizen web app | Tizen AVPlay | Samsung remote | Samsung Apps |

## Shared Code Strategy

### What is shared across all platforms

- API client layer (GraphQL queries, REST calls, auth token management)
- domain models and TypeScript types (media item, playlist, episode, game title, podcast)
- business logic (LRU cache policy, watch progress, queue management, config discovery)
- state machines (playback lifecycle, auth flow, download queue)

### What is platform-specific

- UI rendering (each platform has its own component tree)
- player integration (HLS.js vs ExoPlayer vs AVPlayer vs mpv vs native)
- input handling (touch vs D-pad vs keyboard vs controller)
- navigation model (stack nav vs focus-based nav vs tab nav)
- OS integration (notifications, background audio, PiP, HDMI-CEC)
- packaging and distribution (APK, IPA, `.dmg`, `.img.gz`, BrightScript)

### Shared code packaging

- `@ntv/shared` — TypeScript package consumed by all platforms
- published to private npm registry or used as monorepo workspace dependency
- contains: API client, domain types, state machines, config SDK, cache policy logic

## Technology Decision Framework

Use the decision from wiki 31 (Flutter Limitations and Native Fallback):

> Use Flutter by default unless platform media APIs, remote-control focus behavior, DRM, or critical playback metrics require native implementation.

Additional decision rules for new platforms:

- **Roku, webOS, Tizen**: these platforms have unique runtimes — native-first, no Flutter
- **nTV OS**: Linux-native with Electron/CEF or pure Wayland — no Flutter
- **Desktop (Mac/Win/Linux)**: Electron or Tauri wrapping the web app — no Flutter
- **Mobile (iOS/Android)**: Flutter acceptable if playback and UX meet targets; native fallback ready

## Auth Flow Per Platform

| Platform Class | Auth Method |
| --- | --- |
| Web, Desktop | Full login (email/password or OAuth redirect) |
| Mobile | Full login + biometric unlock |
| Android TV, Fire TV, nTV OS | Device-code flow (display code, confirm on phone/web) |
| tvOS | Device-code flow |
| Roku | Device-code flow (Roku activation URL) |
| webOS, Tizen | Device-code flow |

## Offline and Caching Strategy

| Platform | Offline VOD | Offline Games | Offline Podcasts |
| --- | --- | --- | --- |
| Web | catalog shell only (PWA) | no | no |
| Mobile | download-for-offline (DRM-wrapped) | Tier 1 ROM cache | episode download |
| Desktop | download-for-offline | full ROM cache | episode download |
| Android TV | limited (storage dependent) | Tier 1-2 ROM cache | episode download |
| nTV OS | full local cache | full ROM cache (LRU) | full episode cache |

## Platform Parity Tracking

Each platform must track feature parity against a canonical feature list:

1. VOD browse/search/detail/playback
2. live TV guide/playback/timeshift
3. sports schedule/live/archive
4. podcast browse/subscribe/playback
5. game browse/play/save-sync
6. profile and watch history
7. settings and backend-URL configuration
8. admin panel access (web/desktop only)
9. accessibility (captions, screen reader, high contrast)

Track as a matrix in the frontend progress tracker with status per feature per platform.
