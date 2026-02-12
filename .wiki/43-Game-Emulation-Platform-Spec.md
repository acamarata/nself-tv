# 43 - Game Emulation Platform Spec ("Netflix for Games")

## Objective

Define the complete architecture for a modular game emulation platform integrated into nTV, covering emulator packaging, ROM management with LRU caching, save data sync, and per-platform capability tiers.

## Architecture Overview

```
+-------------------+     +-------------------+     +------------------+
|   nTV Client      |     |   nTV Backend     |     |  Object Storage  |
|                   |     |                   |     |                  |
| Game Catalog UI   |<--->| Game Metadata API |<--->| ROM files        |
| Emulator Runtime  |     | Save Sync API     |     | Save data        |
| Local ROM Cache   |     | User library API  |     | Cover art        |
| Local Save Store  |     |                   |     | Screenshots      |
+-------------------+     +-------------------+     +------------------+
```

## Emulator Tier System

### Tier 1 — Lightweight (all platforms)

Runs on any device including phones and low-end Android TVs.

| System | Recommended Core | APK/Binary Size | RAM Needed | Notes |
| --- | --- | --- | --- | --- |
| NES | FCEUmm (RetroArch) | ~2 MB | < 64 MB | universal compatibility |
| SNES | Snes9x | ~3 MB | < 64 MB | universal compatibility |
| Game Boy / Color | Gambatte | ~2 MB | < 64 MB | universal compatibility |
| GBA | mGBA | ~4 MB | < 128 MB | universal compatibility |
| Genesis / Mega Drive | Genesis Plus GX | ~3 MB | < 64 MB | universal compatibility |
| Master System / Game Gear | Genesis Plus GX | included above | < 64 MB | same core |

### Tier 2 — Moderate (Android TV, desktop, STB)

Requires dedicated hardware or higher-end SoC.

| System | Recommended Core/App | APK/Binary Size | RAM Needed | Notes |
| --- | --- | --- | --- | --- |
| PS1 | DuckStation | ~32 MB | 256-512 MB | good compatibility |
| N64 | Mupen64Plus-Next | ~15 MB | 256-512 MB | game-dependent perf |
| NDS | DraStic / melonDS | ~10-20 MB | 256 MB | DraStic best on Android |
| PSP | PPSSPP | ~15-22 MB | 512 MB | excellent compatibility |
| Dreamcast | Flycast | ~10 MB | 256-512 MB | good compatibility |

### Tier 3 — Demanding (mini-PC / STB only)

Requires x86-64 CPU with strong single-thread performance.

| System | Recommended Core/App | Binary Size | RAM Needed | Notes |
| --- | --- | --- | --- | --- |
| GameCube | Dolphin | ~20 MB | 1-2 GB | title-dependent |
| PS2 | PCSX2 / AetherSX2 fork | ~20-40 MB | 1-2 GB | title-dependent, per-game tweaks |
| Wii | Dolphin | included with GC | 1-2 GB | similar to GC demands |

### Not Feasible (documented for user expectations)

| System | Why | Alternative |
| --- | --- | --- |
| PS3 | RPCS3 requires high-end x86 desktop CPU/GPU | Tier 3 hardware + experimental, select titles only |
| Xbox 360 | Xenia requires desktop-class hardware | same as PS3 |
| PS4 | no practical emulation exists | not supported |
| Xbox One | no practical emulation exists | not supported |

## Modular Emulator Packaging

### Android (Play Store path)

Use **Dynamic Feature Modules** (Play Feature Delivery):

- Base APK: nTV app with game catalog UI and emulator loader (~15 MB)
- Feature Module per tier/system: downloaded on demand from Play Store
- User sees: "Install NES Pack", "Install PS1 Pack", etc. in settings
- Uninstall individual packs to reclaim space

### Android (Sideload path)

- Single APK with all emulator cores bundled
- OR separate APK per tier that registers with main app via intent

### Desktop (Mac/Win/Linux)

- Emulator cores as shared libraries loaded at runtime
- Downloaded on first use from backend or bundled in installer
- Stored in `~/.ntv/emulators/{system}/`

### nTV OS

- All emulator cores pre-installed in OS image (`ntv-os-full` variant)
- OR downloaded on demand (`ntv-os-minimal` variant)
- Native Linux binaries, GPU-accelerated

## ROM Management

### Server-Side ROM Library

Database schema:

```
game_titles:
  id: uuid
  platform_id: FK -> game_platforms.id
  title: string
  slug: string
  year: int
  genre: string[]
  description: text
  cover_art_url: string
  screenshots: string[]
  content_rating: string
  rom_file_hash: sha256
  rom_file_size_bytes: bigint
  rom_storage_path: string
  created_at: timestamptz
  updated_at: timestamptz

game_platforms:
  id: uuid
  name: string (e.g., "nes", "snes", "ps1")
  display_name: string (e.g., "Nintendo Entertainment System")
  emulator_tier: int (1, 2, or 3)
  core_name: string
  supported_extensions: string[] (e.g., [".nes", ".zip"])
```

### Object Storage Layout

```
/{env}/{family_id}/games/roms/{platform}/{game_id}/{filename}
/{env}/{family_id}/games/saves/{user_id}/{platform}/{game_id}/
/{env}/{family_id}/games/states/{user_id}/{platform}/{game_id}/
/{env}/{family_id}/games/artwork/{platform}/{game_id}/cover.jpg
/{env}/{family_id}/games/artwork/{platform}/{game_id}/screenshot_01.jpg
```

### Client-Side ROM Cache

#### Cache Quota Defaults

| Platform | Default Quota | Configurable |
| --- | --- | --- |
| Mobile (iOS/Android) | 5-10 GB | yes |
| Android TV | 20-40 GB | yes (storage dependent) |
| Desktop | 50-100 GB | yes |
| nTV OS | auto-calculated (50% of free disk minus 10 GB reserve) | yes |

#### LRU Eviction Algorithm

```
function evictIfNeeded(cacheDir, maxBytes):
  currentSize = sumFileSizes(cacheDir)
  if currentSize <= maxBytes:
    return

  candidates = allCachedROMs()
    .filter(rom => !rom.pinned)
    .sortBy(rom => rom.lastPlayedAt, ascending)

  for rom in candidates:
    if currentSize <= maxBytes * 0.85:  // evict to 85% to avoid thrashing
      break
    deleteROM(rom)
    currentSize -= rom.sizeBytes
```

#### Pin System

- Users can pin/unpin games from game detail screen or library view
- Pinned games display a pin icon and are excluded from LRU eviction
- Pin count warning: alert user when pinned games exceed 70% of quota
- Bulk unpin option in storage settings

## Save Data Management

### Local Save Storage

```
~/.ntv/saves/{platform}/{game_id}/
  sram/          # in-game saves (battery saves, memory cards)
  states/        # save states (snapshots)
  metadata.json  # timestamps, sync status
```

### Cloud Sync Protocol

1. After game exit: hash local save files
2. Compare hashes with server-side record
3. If local is newer: upload encrypted save bundle
4. If server is newer: prompt user (keep local / download server / keep both)
5. Sync runs in background, never blocks game launch

### Conflict Resolution

- Default: last-write-wins with automatic backup of overwritten save
- Manual restore: user can browse save history and restore any previous version
- Save history retention: 30 days or 50 versions (whichever is less)

### Encryption

- Save data encrypted at rest with per-user key derived from auth credentials
- In transit: standard HTTPS/TLS
- Server-side: encrypted blob storage, server cannot read save contents

## Game Catalog UX

### Home Screen Integration

- "Continue Playing" row: most recent 5 games sorted by `lastPlayedAt`
- "Recently Added" row: newest games added to server library
- "Browse by System" row: platform icons leading to per-system libraries

### Game Detail Page

- Cover art (large)
- Title, year, platform, genre
- Content rating
- Play button (downloads ROM if not cached, then launches emulator)
- Pin/Unpin toggle
- Save data info (last save date, sync status)
- "Delete Local Data" option (removes cached ROM, keeps saves)

### Search

- Search across all platforms by title
- Filter by platform, genre, year
- Sort by: title, year, recently played, recently added

## Platform Capability Auto-Detection

On first launch (and on hardware change), detect:

1. CPU architecture (arm64, x86_64)
2. GPU capability (Vulkan support level, OpenGL ES version)
3. Available RAM
4. Available storage

Map to supported emulator tiers:

```
if x86_64 AND ram >= 4GB AND (vulkan OR opengl >= 4.5):
  enable Tier 1 + Tier 2 + Tier 3
elif arm64 AND ram >= 2GB:
  enable Tier 1 + Tier 2
else:
  enable Tier 1 only
```

Display unsupported tiers as greyed-out with explanation.

## Legal Framework

### nTV Project Position

- nTV ships emulator software only (emulators are legal)
- nTV does NOT distribute ROMs, BIOS files, or copyrighted game content
- Server operators are responsible for the legality of their ROM libraries
- Users are responsible for owning legal copies of games they play

### Required Disclosures

- First-time game section entry: display legal notice
- Settings: link to terms of service and content policy
- Server admin panel: acknowledge content responsibility on setup

### BIOS Files

- Some emulators require BIOS files (PS1, PS2, Dreamcast, etc.)
- BIOS files must be provided by the user or server operator
- nTV provides a BIOS management UI but does not distribute BIOS files
- Missing BIOS detected and reported clearly to user
