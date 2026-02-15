# nself-tv Mobile (iOS & Android)

React Native mobile app for nself-tv media platform.

## Prerequisites

- Node.js 18+ (already configured via pnpm)
- pnpm (project standard)
- React Native CLI
- iOS: Xcode 14+, CocoaPods
- Android: Android Studio, JDK 17+

## Installation

```bash
# Install dependencies (from frontend/platforms/mobile)
pnpm install

# iOS only: Install CocoaPods
cd ios
pod install
cd ..
```

## Development

```bash
# Start Metro bundler
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Lint
pnpm lint
```

## Project Structure

```
src/
├── navigation/        # React Navigation setup
│   └── RootNavigator.tsx
├── screens/          # Screen components
│   ├── HomeScreen.tsx
│   ├── SearchScreen.tsx
│   ├── LibraryScreen.tsx
│   ├── SettingsScreen.tsx
│   └── PlayerScreen.tsx
├── services/         # Service providers
│   ├── APIProvider.tsx
│   └── AuthProvider.tsx
├── native/           # Native module bridges
│   ├── VideoPlayer.ts
│   └── BiometricAuth.ts
└── App.tsx           # Root component

ios/                  # iOS native code
├── VideoPlayerModule.swift
├── BiometricAuthModule.swift
└── Info.plist

android/              # Android native code (coming in P7-T03)
```

## Native Modules

### VideoPlayer (iOS: AVPlayer)
- HLS/DASH streaming
- Adaptive bitrate
- Seek, play/pause, playback rate
- Background audio support

### BiometricAuth (iOS: Face ID / Touch ID)
- Biometric availability detection
- Authentication prompts
- Graceful fallback

## Integration with @ntv/shared

All business logic, API clients, and utilities are shared from `@ntv/shared` package:

```typescript
import { GraphQLClient, calculateQualityTier, getResumePosition } from '@ntv/shared';
```

This ensures 100% feature parity across all 12 platforms.

## Environment Variables

Create `.env` file:

```bash
REACT_APP_API_URL=http://localhost:8080
```

For production builds, use different API URLs per environment.

## Testing

```bash
# Run all tests with coverage
pnpm test

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

100% coverage required on all changed files.

## Building

```bash
# iOS Release build
cd ios
xcodebuild -workspace nselftv.xcworkspace -scheme nselftv -configuration Release

# Android Release build
cd android
./gradlew assembleRelease
```

## Troubleshooting

**Metro bundler cache issues:**
```bash
pnpm start --reset-cache
```

**iOS build failures:**
```bash
cd ios
pod deintegrate
pod install
```

**Android build failures:**
```bash
cd android
./gradlew clean
```

**TypeScript errors with @ntv/shared:**
Make sure you've built the shared package first:
```bash
cd ../../packages/shared
pnpm build
```

## Next Steps

- P7-T03: Android native modules (ExoPlayer, Biometric)
- P7-T14: Offline downloads
- P7-T15: Background audio
- P7-T16: Push notifications
