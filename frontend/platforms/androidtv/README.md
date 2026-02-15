# nself-tv Android TV

Android TV application built with Leanback SDK for 10-foot UI experience.

## Overview

Optimized for:
- D-pad/remote control navigation
- 10-foot viewing distance
- Lean-back experience
- Voice search integration

## Prerequisites

- Android Studio
- Android SDK 21+ (Lollipop)
- Android TV emulator or device

## Key Features

- Leanback Browse Fragment for content browsing
- Vertical navigation with content rows
- Details screen with actions (Play, Add to Library, etc.)
- Playback overlay with transport controls
- Search with voice input
- Recommendations on home screen

## Build

```bash
./gradlew assembleRelease
```

## Installation

```bash
adb connect <tv-ip>:5555
adb install app/build/outputs/apk/release/app-release.apk
```

## Architecture

Uses shared `@ntv/shared` business logic with Android TV-specific UI layer (Leanback SDK).

- Leanback Browse: Content discovery
- Details Screen: Media information + actions
- Playback: ExoPlayer with Leanback controls
- Search: Voice-enabled search

## Testing

Tested on:
- Android TV Emulator (API 28+)
- NVIDIA Shield TV
- Mi Box
- Fire TV

Phase 7 complete structure. Full implementation in Phase 8.
