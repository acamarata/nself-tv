# platforms/

**Platform Wrappers — Deploy Everywhere**

Thin platform-specific entry points and configuration. **No business logic here.**

## Directory Structure

- **web/** — Web application (Next.js)
- **desktop/** — Desktop applications (Electron/Tauri)
  - **macos/** — macOS-specific configuration
  - **windows/** — Windows-specific configuration
  - **linux/** — Linux-specific configuration
- **mobile/** — Mobile applications (React Native)
  - **ios/** — iOS-specific configuration
  - **android/** — Android-specific configuration
- **tv/** — TV platform applications
  - **android-tv/** — Android TV (React Native TV)
  - **roku/** — Roku (SceneGraph/BrightScript)
  - **webos/** — LG webOS (Enact/React)
  - **tvos/** — Apple TV (React Native TV)
  - **tizen/** — Samsung Tizen (Tizen Web)
  - **ntv-os/** — nTV OS (Custom AntBox)

## What Goes Here

Each platform directory contains:

1. **Entry point** — Platform-specific initialization and bootstrapping
2. **Native modules** — Platform-specific APIs (filesystem, notifications, etc.)
3. **Configuration** — Build configuration, environment setup
4. **Platform adapters** — Wrappers that call shared src/ code

## What Does NOT Go Here

- ❌ Business logic (belongs in src/)
- ❌ UI components (belongs in src/components/ or variants/)
- ❌ API clients (belongs in src/integrations/)
- ❌ Utilities (belongs in src/utils/)

## Guidelines

1. **Thin wrappers only** — Maximum 100 lines per file
2. **Call src/ code** — All logic should be imported from src/
3. **Platform-specific only** — If it works on multiple platforms, move it to src/
4. **No duplication** — Never copy code between platforms

## Example Platform Structure

```
platforms/web/
├── next.config.js          # Next.js configuration
├── package.json            # Platform-specific dependencies
├── tsconfig.json           # TypeScript config extends root
├── public/                 # Web-specific assets
└── app/
    └── page.tsx            # Entry point (imports from src/)
```

## Development

Each platform can be developed independently:

```bash
cd platforms/web
pnpm install
pnpm dev
```
