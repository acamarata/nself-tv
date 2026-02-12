# nself-tv Frontend

## Code Once, Deploy Everywhere

Unified Next.js application with platform-specific adapters for web, mobile, desktop, and TV surfaces.

## Architecture

### Core Principle: Shared Logic, Platform Wrappers

- **src/** — All shared business logic, components, hooks, and utilities (write once)
- **platforms/** — Thin platform-specific entry points and wrappers (deploy everywhere)
- **variants/** — Platform-specific UI components (10-foot TV UI vs. touch/pointer UI)

### Directory Structure

```text
frontend/
├── src/                        # Shared Next.js source (code once)
│   ├── app/                    # Next.js app directory (pages, routing)
│   ├── components/             # Shared UI components
│   ├── hooks/                  # Shared React hooks
│   ├── lib/                    # Business logic, utilities
│   ├── utils/                  # Pure utility functions
│   ├── types/                  # TypeScript types/interfaces
│   ├── styles/                 # Global styles, theme
│   └── integrations/           # API clients, GraphQL, backend adapters
├── platforms/                  # Platform wrappers (deploy everywhere)
│   ├── web/                    # Web-specific entry point
│   ├── desktop/                # Electron/Tauri wrapper
│   │   ├── macos/
│   │   ├── windows/
│   │   └── linux/
│   ├── mobile/                 # React Native wrapper
│   │   ├── ios/
│   │   └── android/
│   └── tv/                     # TV platform wrappers
│       ├── android-tv/
│       ├── roku/
│       ├── webos/
│       ├── tvos/
│       ├── tizen/
│       └── ntv-os/
├── variants/                   # Platform-specific UI components
│   ├── tv-ui/                  # 10-foot UI components (TV remotes)
│   ├── display-ui/             # Touch/pointer UI components
│   └── shared/                 # UI primitives used by both
├── public/                     # Static assets
├── tests/                      # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/                       # Frontend documentation
```

## Responsibilities

1. **VOD and Live Playback** — HLS adaptive streaming, subtitles, audio tracks
2. **Catalog and Discovery** — Browse, search, filter, recommendations
3. **Watch State Management** — Resume playback, watch history, favorites
4. **User Profiles** — Multi-profile support, parental controls, preferences
5. **Platform-Specific Behavior** — Input handling, navigation, performance optimization

## Platform Targets

| Platform | Path | Technology | Status |
|----------|------|------------|--------|
| Web | `platforms/web/` | Next.js | Planned |
| macOS Desktop | `platforms/desktop/macos/` | Electron/Tauri | Planned |
| Windows Desktop | `platforms/desktop/windows/` | Electron/Tauri | Planned |
| Linux Desktop | `platforms/desktop/linux/` | Electron/Tauri | Planned |
| iOS Mobile | `platforms/mobile/ios/` | React Native | Planned |
| Android Mobile | `platforms/mobile/android/` | React Native | Planned |
| Android TV | `platforms/tv/android-tv/` | React Native TV | Planned |
| Roku TV | `platforms/tv/roku/` | SceneGraph/BrightScript | Planned |
| webOS TV | `platforms/tv/webos/` | Enact/React | Planned |
| tvOS | `platforms/tv/tvos/` | React Native TV | Planned |
| Samsung Tizen | `platforms/tv/tizen/` | Tizen Web | Planned |
| nTV OS | `platforms/tv/ntv-os/` | Custom (AntBox) | Planned |

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server (web)
cd platforms/web
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Code Organization Rules

1. **Shared logic goes in src/** — If multiple platforms use it, it belongs in src/
2. **Platform-specific code goes in platforms/** — Entry points, native modules, platform APIs
3. **UI variants go in variants/** — Different UI for TV vs. touch/pointer interfaces
4. **No business logic in platforms/** — Platforms should only wrap and configure src/ code
5. **Server-authoritative policies** — Never trust client, always validate on backend

### Testing Strategy

- **Unit tests** — All src/ code must have unit tests (100% coverage)
- **Integration tests** — Test API integration, GraphQL queries, backend adapters
- **E2E tests** — Platform-specific E2E tests in each platform directory

## Backend Integration

Frontend connects to:
- **Hasura GraphQL API** — `http://localhost:8080/v1/graphql`
- **Auth Plugin** — `http://localhost:3014`
- **Media URLs** — `http://localhost:9000` (MinIO/Hetzner Object Storage)
- **Search Plugin** — `http://localhost:3302`

All API clients and backend adapters live in `src/integrations/`.

## Feature Flags

Environment variables control feature availability:
- `NEXT_PUBLIC_ENABLE_VOD` — Video on demand
- `NEXT_PUBLIC_ENABLE_LIVE_TV` — Live TV and DVR
- `NEXT_PUBLIC_ENABLE_SPORTS` — Sports content
- `NEXT_PUBLIC_ENABLE_PODCASTS` — Podcast support
- `NEXT_PUBLIC_ENABLE_GAMES` — Gaming integration

See `.env.local.example` for full configuration.

## Package Manager

**Always use `pnpm`** — Never npm or yarn. This is a hard constraint.

```bash
pnpm install          # Install dependencies
pnpm add <package>    # Add dependency
pnpm dev              # Development server
pnpm build            # Production build
pnpm test             # Run tests
```

## Documentation

- [Platform-Specific Guides](docs/platforms/) — How to develop for each platform
- [Architecture Decisions](docs/architecture/) — Design rationale and patterns
- [Product Specifications](docs/product/) — Feature specs and requirements
- [Operations Guide](docs/ops/) — Deployment and infrastructure

## Next Steps

1. Initialize shared src/ structure with Next.js app directory
2. Set up GraphQL client and API integration layer
3. Build core UI components (catalog, player, navigation)
4. Implement web platform as reference implementation
5. Add platform-specific wrappers for mobile, desktop, TV
