# nself-tv Desktop (macOS, Windows, Linux)

Tauri desktop application for nself-tv media platform.

## Prerequisites

- Node.js 18+ (already configured via pnpm)
- pnpm (project standard)
- Rust 1.70+ (for Tauri)
- macOS: Xcode Command Line Tools
- Windows: Microsoft C++ Build Tools
- Linux: webkit2gtk, libayatana-appindicator3

## Installation

```bash
# Install JavaScript dependencies
pnpm install

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Development

```bash
# Run in development mode (hot reload)
pnpm dev

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Lint
pnpm lint
```

## Building

```bash
# Build for current platform
pnpm build

# Build for specific platforms
pnpm build:mac        # macOS Universal (Intel + Apple Silicon)
pnpm build:windows    # Windows x64
pnpm build:linux      # Linux x64
```

## Project Structure

```
src/
├── components/       # Shared UI components
│   └── Layout.tsx
├── screens/         # Screen components
│   ├── HomeScreen.tsx
│   ├── SearchScreen.tsx
│   ├── LibraryScreen.tsx
│   ├── SettingsScreen.tsx
│   └── PlayerScreen.tsx
├── services/        # Service providers
│   ├── APIProvider.tsx
│   └── AuthProvider.tsx
├── App.tsx          # Root component with routing
├── main.tsx         # Entry point
└── styles.css       # Global styles

src-tauri/
├── src/
│   └── main.rs      # Rust backend entry point
├── Cargo.toml       # Rust dependencies
└── tauri.conf.json  # Tauri configuration
```

## Integration with @ntv/shared

All business logic, API clients, and utilities are shared from `@ntv/shared` package:

```typescript
import { NTVGraphQLClient, calculateQualityTier } from '@ntv/shared';
```

This ensures 100% feature parity with web and mobile platforms.

## Platform-Specific Features

### macOS
- Native menu bar integration
- Dock integration
- System dark mode support
- Touch Bar support (if available)

### Windows
- System tray integration
- Windows notifications
- Taskbar integration

### Linux
- System tray integration (AppIndicator)
- Desktop notifications
- Wayland/X11 support

## Tauri Backend

The Rust backend provides:
- Secure local storage (Tauri Store)
- File system access (scoped to app data)
- HTTP requests (scoped to backend API)
- Window management
- System integration

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

## Distribution

Built apps are created in `src-tauri/target/release/bundle/`:
- macOS: `.dmg` and `.app`
- Windows: `.msi` and `.exe`
- Linux: `.deb`, `.AppImage`

## Next Steps

- P7-T05: Windows Desktop (same codebase, Windows-specific build)
- P7-T06: Linux Desktop (same codebase, Linux-specific build)
- P7-T14: Offline downloads
- P7-T15: Background audio
