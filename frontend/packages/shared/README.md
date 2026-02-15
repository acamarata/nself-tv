# @ntv/shared

Shared business logic, API clients, and domain models for nself-tv platform.

## Overview

This package contains all platform-agnostic code that is shared across:
- Web (Next.js)
- Mobile (iOS, Android via React Native)
- Desktop (macOS, Windows, Linux via Tauri)
- TV platforms (Android TV, Roku, webOS, tvOS, Tizen)

## Installation

```bash
pnpm add @ntv/shared
```

## Usage

```typescript
import {
  // Business logic
  calculateQualityTier,
  filterByContentRating,
  calculateWatchProgress,
  isCompleted,

  // API client
  APIClient,

  // Models
  type User,
  type Profile,
  type Media,

  // Constants
  QUALITY_TIERS,
  CONTENT_RATINGS,
  PLATFORMS,

  // Utils
  formatDate,
  formatDuration,
  formatFileSize,
  isValidEmail
} from '@ntv/shared';

// Initialize API client
const api = new APIClient({
  baseUrl: 'http://localhost:8080',
  graphqlUrl: 'http://localhost:8080/v1/graphql',
  getAuthToken: async () => {
    // Return current auth token
    return localStorage.getItem('token');
  }
});

// Use business logic
const tier = calculateQualityTier(1920); // 'FHD'
const progress = calculateWatchProgress(5700, 6000); // 95
const completed = isCompleted(progress); // true

// Make API calls
const user = await api.auth.getCurrentUser();
const profiles = await api.profiles.getProfiles();
const trending = await api.media.getTrending();
```

## Structure

```
src/
├── api/              # API clients
├── models/           # Domain models
├── business/         # Business logic
├── types/            # TypeScript types
├── constants/        # Shared constants
├── utils/            # Utility functions
└── adapters/         # Platform adapter interfaces
```

## Development

```bash
# Build package
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Platform Adapters

Platform-specific implementations must provide these adapters:

- `PlatformStorage` - Web (localStorage), RN (AsyncStorage), Tauri (Store)
- `PlatformPlayer` - Web (HLS.js), iOS (AVPlayer), Android (ExoPlayer)
- `PlatformNotifications` - Web (Web Push), iOS (APNs), Android (FCM)
- `PlatformFileSystem` - For offline downloads
- `PlatformBiometrics` - For biometric auth
- `PlatformCasting` - For Chromecast/AirPlay

See `src/adapters/index.ts` for full interface definitions.

## Testing

All business logic has 100% test coverage:

```bash
pnpm test:coverage
```

## License

See root LICENSE file.
