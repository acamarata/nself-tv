# nself-tv tvOS (Apple TV)

Apple TV app built with SwiftUI and TVUIKit.

## Overview

Optimized for:
- Siri Remote
- tvOS 15.0+
- Focus engine
- 4K HDR Dolby Vision

## Prerequisites

- Xcode 14+
- Apple Developer account
- Apple TV 4K or simulator

## Key Features

- SwiftUI TabView navigation
- TVUIKit for card layouts
- AVFoundation for playback
- Focus engine for navigation
- Siri voice control
- Top Shelf integration

## Development

```bash
# Build
xcodebuild -scheme nself-tv-tvOS -configuration Release

# Run on simulator
open -a Simulator && xcrun simctl boot "Apple TV 4K"
xcodebuild -scheme nself-tv-tvOS -destination 'platform=tvOS Simulator'
```

## Architecture

Native Swift/SwiftUI:
- SwiftUI for modern UI
- Combine for reactive state
- AVFoundation for video
- Swift Package for shared models

## File Structure

```
Sources/
  App/
    ContentView.swift
    HomeView.swift
    PlayerView.swift
  Services/
    APIService.swift
    AuthService.swift
Resources/
  Assets.xcassets
Info.plist
```

Phase 7 complete structure. Full implementation in Phase 8.
