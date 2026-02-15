# 13 - Roadmap and Backlog

## Phase Summary

| Phase | Version | Name |
| --- | --- | --- |
| 0 | — | Planning and Scaffolding |
| 1 | v0.1 | Foundation |
| 2 | v0.2 | Backend Core |
| 3 | v0.3 | Frontend VOD MVP + Dynamic Configuration |
| 4 | v0.4 | Ant Foundations |
| 5 | v0.5 | Live and DVR Core |
| 6 | v0.6 | Multi-Platform Parity and Advanced Features |
| 7 | v0.7 | Content Verticals: Podcasts and Games |
| 8 | v0.8 | Reliability and Operations |
| 9 | v0.9 | nTV OS and Set-Top Box Appliance |
| 10 | v0.10 | Security and Release Automation |
| 11 | v0.11 | RC Freeze and Final Validation |

---

## Phase 0 — Planning and Scaffolding

1. done: docs-first scaffold
2. done: component-level backlogs (`backend`, `frontend`, `antbox`, `antserver`)
3. done: quality/security/assurance control documents
4. multi-platform frontend strategy document (wiki 41)
5. Android TV and Google Play compliance plan (wiki 42)
6. game emulation platform spec (wiki 43)
7. podcast content vertical spec (wiki 44)
8. nTV OS and STB appliance spec (wiki 45)
9. STB hardware reference and recommendation tiers (wiki 46)
10. backend-URL dynamic configuration spec (wiki 47)
11. input and controller abstraction spec (wiki 48)

---

## Phase 1 (`v0.1`) — Foundation

### 1.1 — Runtime and CI

1. runtime contract and CI gate scaffolding
2. local environment contract (Docker Compose one-command bootstrap)
3. traceability lock and ticket governance

### 1.2 — Backend-URL Configuration Contract

4. define `/api/v1/config` endpoint schema (returns theme, branding, feature flags)
5. define client-side discovery flow (user enters `tv.mydomain.com` or IP -> app fetches config)
6. define fallback behavior when backend unreachable

### 1.3 — Shared Frontend SDK Contract

7. TypeScript types for tenant config response
8. platform-agnostic config caching and refresh logic
9. shared API client contract (GraphQL queries, REST calls, auth token management)

---

## Phase 2 (`v0.2`) — Backend Core

### 2.1 — Auth, Identity, and Session

1. auth service with JWT access + opaque refresh tokens (wiki 33)
2. role model: OWNER, ADMIN, ADULT_MEMBER, YOUTH_MEMBER, CHILD_MEMBER, DEVICE (wiki 06)
3. SSO behavior: single identity session across family/chat/tv apps
4. device code auth endpoint (for TV/STB flows)
5. session concurrency counting and heartbeat infrastructure (wiki 29)

### 2.2 — Schema and API

6. PostgreSQL schema baseline with Hasura GraphQL layer
7. media item and media variant tables with manifest pointers
8. user profile schema (per-member profiles: avatar, display name, preferences, age bracket)
9. watchlist/favorites table (per-user, per-content-type)
10. watch history / progress tracking table (position, completed flag, updated_at)
11. relationship graph schema for family links and optional Mahram policy (wiki 32)
12. podcast and game metadata schema foundations (wiki 43, wiki 44)
    - `podcast_shows`, `podcast_episodes`, `podcast_subscriptions`, `podcast_progress`
    - `game_platforms`, `game_titles`, `game_save_states`, `game_user_library`
13. content-type registry enum: `movie`, `show`, `episode`, `live_event`, `podcast_show`, `podcast_episode`, `game_title`
14. content rating / age classification schema (ESRB, TV-PG, etc.)
15. content-type-aware policy and visibility rules (role + rating + tenant feature flags)

### 2.3 — White-Label and Tenant Configuration

16. white-label tenant bootstrap: `POST /api/v1/bootstrap` (first-time setup)
17. tenant config storage: name, logos, palette, feature toggles, locale
18. config retrieval: `GET /api/v1/config` (public, no auth)
19. config update: `PUT /api/v1/config` (admin-only)

### 2.4 — Media Ingest Pipeline

20. media library import service
    - file system scanner (watch directory for new files, configurable paths)
    - manual upload API (admin uploads via web UI or API)
    - metadata auto-match pipeline (filename parsing -> TMDB/TVDB lookup -> normalize)
    - poster/backdrop download and cache to object storage
    - subtitle extraction and normalization to WebVTT
21. resumable ingest job queue with per-stage retries and dead-letter handling (wiki 08)
22. ingest job traceability (job ID tracked across scan/validate/transcode/package stages)

### 2.5 — Observability and Audit

23. structured JSON logging with request/session/event identifiers
24. metrics pipeline (API latency, error rates, job queue depth)
25. alert infrastructure (live event failures, auth anomalies, backup failures)
26. immutable audit event log (account lifecycle, role changes, policy toggles, device enrollment, data exports)

### 2.6 — Notification Foundation

27. notification event schema (event type, target user, payload, delivery status)
28. notification delivery service foundation (in-app, push, email digest)
29. per-user notification preferences (opt-in/out per event type, quiet hours)

---

## Phase 3 (`v0.3`) — Frontend VOD MVP + Dynamic Configuration

### 3.1 — Backend-URL Discovery and Theming

1. first-launch screen: enter backend URL or IP address
2. fetch and cache tenant config (name, theme, logos, feature flags)
3. apply dynamic theming (CSS custom properties from config: colors, fonts, branding)
4. persist backend URL in local storage with manual override in settings
5. logo and splash screen injection from config assets
6. feature toggle system: show/hide content verticals (VOD, Live TV, Sports, Podcasts, Games) per tenant config

### 3.2 — User Profiles

7. profile selector on app launch (family member list with avatars)
8. in-app profile switching (no full re-auth required)
9. per-profile: watch history, watchlist, preferences, content rating level
10. profile management UI (create, edit, delete profiles — OWNER/ADMIN only)

### 3.3 — Home Screen and Navigation

11. home screen with content rail system
    - "Continue Watching" row (resume-ready items sorted by last watched)
    - "Recently Added" row (newest library additions)
    - genre rows (action, comedy, drama, etc. generated from library metadata)
    - "Watchlist" row (user's saved items)
12. top navigation: Home, Movies, Shows, Live TV, Sports, Podcasts, Games, Search, Settings
    - sections hidden when disabled by tenant feature flags
13. global cross-vertical search (search movies, shows, live events, podcasts, games in one query)
14. content detail pages (movie/show/episode: metadata, poster, play, add to watchlist, cast info)

### 3.4 — VOD Playback

15. HLS adaptive streaming with automatic quality selection
16. subtitle rendering (WebVTT) with language selection
17. audio track selection with language labels
18. trickplay seek thumbnails (lazy-load VTT + sprite sheets on first seek)
19. resume playback from last position (cross-device via watch progress sync)
20. stream admission: auth check, role/policy check, concurrency check, signed URL issuance
21. playback error states: clear messages for policy violations, stream limits, network errors
22. autoplay next episode (configurable per profile)

### 3.5 — Watchlist and Progress

23. "My List" / watchlist: add/remove movies, shows from any browse or detail screen
24. watch progress sync: position saved every 15 seconds, synced to backend
25. "Mark as watched" / "Mark as unwatched" manual overrides

### 3.6 — Settings

26. account settings: profile info, change password, linked devices
27. playback preferences: default subtitle language, audio language, quality cap, autoplay
28. parental controls: content rating limits per profile (child can only see TV-Y, youth sees TV-14, etc.)
29. storage management: clear cache, manage downloads, view usage
30. backend connection: view/change server URL, test connection
31. about: app version, open-source licenses, backend version

### 3.7 — Auth Flows

32. web/desktop: full login (email/password or OAuth)
33. mobile: full login + biometric unlock
34. device code auth flow foundation (TV/STB: display code, confirm on phone/web)

---

## Phase 4 (`v0.4`) — Ant Foundations

### 4.1 — AntServer

1. AntServer lifecycle core (scheduling, orchestration, state management)
2. event scheduler: create events from sports API feeds and manual entries
3. device registry and fleet health dashboard

### 4.2 — AntBox

4. AntBox enrollment and command protocol (wiki 18, wiki 19)
5. device identity: Ed25519 keypair, enrollment, certificate/token issuance
6. command protocol: SCAN_CHANNELS, START_EVENT, STOP_EVENT, HEALTH, UPDATE

### 4.3 — Ingest Transport

7. SRT primary ingest transport with RTMP fallback (wiki 21)
8. reconnection logic: immediate retry, exponential backoff, degraded/failed state machine
9. ingest health telemetry: packet loss, latency, reconnect counts

---

## Phase 5 (`v0.5`) — Live and DVR Core

### 5.1 — EPG and Schedule

1. EPG (Electronic Program Guide) data source integration
   - Schedules Direct or equivalent for US OTA TV listings
   - sports API integration (NFL schedule feed, team/venue metadata) (wiki 09)
   - manual event creation for custom recordings
2. live guide UI: channel list, current/upcoming programs, grid view
3. channel favorites and custom ordering per user profile
4. scheduled recording management: view, edit, cancel upcoming recordings

### 5.2 — DVR and Recording

5. DVR buffer: 6-hour rolling ring buffer with configurable window (wiki 23)
6. commercial detection pipeline: Comskip + heuristic markers (wiki 24)
   - live assist mode (rolling batches during recording)
   - post-process mode (full analysis after event)
   - ad marker storage with confidence scores
   - user-initiated skip controls (prompt at >= 0.70 confidence, auto-skip at >= 0.90)
7. post-event archive pipeline: finalize recording -> ad detection -> encode renditions -> generate trickplay/subtitles -> upload to object storage -> publish to library (wiki 26)

### 5.3 — Live Playback

8. live playback with adaptive streaming (live HLS manifest)
9. timeshift: pause live, seek backward within DVR buffer
10. seek outside buffer: bounded error with jump-to-earliest action
11. live event status indicators: scheduled / live / final / failed
12. LL-HLS investigation: time-boxed evaluation for low-latency live streaming (feasibility, player support, cost-benefit)

### 5.4 — Sports-Specific

13. NFL event metadata: league, season, week, teams, venue, kickoff, status (wiki 09)
14. event status state machine: scheduled -> live -> final (or failed)
15. automatic retry policies for tuner unavailable, ingest interruption, scheduler drift

---

## Phase 6 (`v0.6`) — Plugin Integration and Content Acquisition ✅ COMPLETE

**Completion Date**: 2026-02-14
**Status**: Released

**What Was Actually Completed**:
Phase 6 pivoted to focus on plugin integration and content acquisition infrastructure instead of the originally planned multi-platform work. The plugin ecosystem provides the foundation for all future features.

**Key Accomplishments**:
- Integrated 18 production ɳPlugins from nself-plugins ecosystem
- 9 plugins enabled and operational (content-progress, devices, epg, file-processing, jobs, recording, sports, tokens, workflows)
- 7 acquisition plugins configured (vpn, torrent-manager, content-acquisition, subtitle-manager, metadata-enrichment, stream-gateway, media-processing)
- Complete acquisition dashboard UI with downloads management, RSS feeds, movie monitoring, torrent integration
- Database migration 007: Content acquisition schema
- Removed 6 custom backend services (97 files) - replaced by plugins
- 100% test coverage on all changed files (32 new test files)

**Plugin Architecture Benefits**:
- Microservices pattern with independent health checks
- Shared utilities (@nself/plugin-utils) for database, logging, configuration
- Automatic schema initialization on first startup
- Multi-app support via source_account_id
- Namespaced database tables (np_* prefix) prevent conflicts

**Technical Achievements**:
- All 18 backend services running (PostgreSQL, Hasura, Auth, Nginx, Redis, MinIO, MeiliSearch, Mailpit + monitoring stack)
- Fixed Hasura connectivity issues (localhost → postgres service name)
- Implemented DATABASE_URL parsing across all plugins
- Resolved 73 TypeScript compilation errors
- Peer dependency architecture fully functional

---

## Original Phase 6 Plan (Deferred to Phase 7)

The items below were originally planned for Phase 6 but have been deferred to Phase 7 to prioritize plugin integration.

### 6.1 — Metadata Enrichment and Sports (Deferred)

1. metadata provider integration: TMDB/TVDB API with configurable refresh schedules (wiki 30)
   - static catalog: weekly refresh
   - active/ongoing series: daily refresh
   - sports metadata: event-driven refresh + final score reconciliation
2. metadata admin UI: select providers, set API keys, trigger manual refresh, edit metadata overrides

### 6.2 — Admin Panel

3. media library management
   - browse/search/filter all media items
   - upload new media, trigger re-scan of watch directories
   - edit metadata, replace poster/backdrop, manage subtitles
   - delete media (with confirmation and storage cleanup)
4. user and device management
   - view all family members, roles, session history
   - invite/remove members, change roles
   - view connected devices, revoke sessions
5. recording and event management
   - view scheduled/active/completed recordings
   - manual event creation and cancellation
   - AntBox fleet status dashboard
6. podcast management (admin can add/remove feeds for the family library)
7. game library management
   - upload ROMs to server storage
   - edit game metadata, manage BIOS files
   - view game library usage and save data stats
8. nTV OS device fleet management
   - view registered nTV OS devices (name, IP, hardware tier, OS version, last seen)
   - push configuration updates to devices
   - request diagnostic bundles
   - trigger remote OTA updates
9. analytics dashboard: active users, playback sessions, storage usage, bandwidth, most watched
10. policy controls: stream concurrency limits, content rating defaults, feature toggles

### 6.3 — Stream and CDN Controls

11. stream concurrency admission: enforce per-user and per-family concurrent stream limits (wiki 29)
    - session heartbeat validation (45-second timeout)
    - eviction order: oldest idle -> oldest paused -> oldest low-priority -> deny
    - admin session revocation
12. CDN signed URL generation: backend issues time-limited signed URLs for media access (wiki 28)
    - VOD URL TTL: 10-30 minutes
    - live URL TTL: 2-5 minutes, auto-refresh via session heartbeat
    - token binding to user/session context
    - replay anomaly detection and rate limiting
13. token signing key rotation: key versioning, graceful rollover, validation against multiple key versions

### 6.4 — DRM Decision

14. DRM strategy decision: Widevine L1/L3 for Android/TV, FairPlay for Apple, or signed-URL-only for self-hosted
    - implementation if required by deployment target
    - license server integration if DRM active

### 6.5 — Notification System

15. notification delivery across all platforms
    - mobile: push notifications (FCM for Android, APNS for iOS)
    - TV/STB/nTV OS: in-app notification badges and toast messages
    - web/desktop: browser notifications or in-app badges
    - email digest: optional daily/weekly summary
16. notification triggers: live event starting, new episode added, game save sync conflict, recording completed, new podcast episode

### 6.6 — Web Platform

17. responsive web app (keyboard/mouse primary input)
18. Chromecast sender integration
19. PWA manifest and offline catalog shell
20. media session API for browser media key support

### 6.7 — Desktop Platforms (Mac, Windows, Linux)

21. Electron or Tauri wrapper around web app
22. native media key and system tray integration (background podcast playback)
23. platform-specific installer packaging (`.dmg`, `.exe`/`.msi`, `.AppImage`/`.deb`)
24. auto-update mechanism per platform
25. keyboard shortcut parity with web

### 6.8 — Mobile Platforms (iOS, Android)

26. Flutter or React Native shared mobile shell
27. iOS: AVPlayer integration, App Store compliance, notch/island layouts
28. Android: ExoPlayer integration, Play Store compliance, adaptive layouts
29. mobile-specific UX: gesture navigation, picture-in-picture, download-for-offline
30. push notification integration (live event alerts, new episodes, recording complete)
31. Chromecast/AirPlay cast support
32. background audio service for podcast playback
33. lock screen and notification media controls
34. biometric unlock (Face ID, fingerprint)

### 6.9 — Android TV (APK + Google Play)

35. Leanback SDK integration (320x180 banner, D-pad navigation, focus states)
36. ExoPlayer with HLS adaptive streaming
37. device-code auth flow
38. remote control UX (5-way D-pad + select + back + play/pause)
39. sideload-friendly APK signing and ADB deployment workflow
40. Google Play Store submission pipeline (wiki 42)
    - data safety form and privacy policy
    - internal testing track -> closed beta -> public
    - TV-specific QA checklist (focus traversal, remote-only navigation, no touch assumptions)
41. Bluetooth controller support for game emulation mode

### 6.10 — Additional TV Platforms

42. Roku: BrightScript channel with SceneGraph UI, Roku channel store submission
43. webOS (LG): web app packaged for webOS, LG Content Store submission path
44. tvOS (Apple TV): native Swift/AVKit or TVML, App Store submission, Siri Remote support
45. Samsung Tizen: Tizen web app packaging, Samsung app store submission path
46. Amazon Fire TV: Android TV APK adaptation, Amazon Appstore submission

### 6.11 — Cross-Platform Shared Concerns

47. unified controller/remote abstraction layer (wiki 48)
48. platform capability detection (codec support, DRM, input method)
49. cross-device watch progress and session continuity
50. platform-specific player SDK selection (HLS.js / ExoPlayer / AVPlayer / mpv / native)
51. accessibility baseline per platform (screen reader, high contrast, closed captions)
52. localization / i18n foundation (string externalization, locale switching, RTL layout support for Arabic/Hebrew)

---

## Phase 7 (`v0.7`) — Content Verticals: Podcasts and Games

### 7.1 — Podcast Platform

1. podcast feed ingest pipeline
   - RSS/Atom feed parser and scheduler
   - episode audio download and transcode to normalized format
   - metadata extraction: show art, descriptions, episode dates, categories
   - automatic episode refresh on configurable schedule (wiki 44: active=60min, dormant=6hr, inactive=daily)
   - OPML import/export for bulk subscription management
2. podcast playback UX
   - audio-only player with persistent mini-player bar
   - expand to full-screen player with artwork
   - background playback support (all platforms)
   - playback speed controls (0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x, 2.5x, 3x)
   - sleep timer (15m, 30m, 45m, 60m, end of episode)
   - chapter navigation (when podcast namespace chapters available)
   - episode queue / "Up Next" with manual ordering
   - per-episode progress tracking and resume (position synced cross-device)
3. podcast discovery and catalog
   - browse by category, search by title/description, recently played
   - subscription management (add/remove feeds, notification toggle per show)
   - new episode notifications (push on mobile, badge on TV/web)
   - show detail page: artwork, description, episode list, subscribe toggle
4. podcast offline and storage
   - download individual episodes or batch-download for offline
   - auto-download: optionally download newest N episodes per show
   - storage quota: configurable limit (default: 2 GB mobile, 10 GB desktop/STB)
   - LRU eviction of completed downloaded episodes when quota exceeded
   - audio file caching in object storage for CDN delivery

### 7.2 — Game Emulation Platform ("Netflix for Games")

5. emulator runtime integration
   - modular emulator packaging (each system is an installable module)
   - supported tiers:
     - Tier 1 (lightweight): NES, SNES, Genesis/Mega Drive, GBA, Game Boy/Color
     - Tier 2 (moderate): N64, PS1, NDS, PSP, Dreamcast
     - Tier 3 (demanding): GameCube, PS2, Wii (mini-PC / STB only)
   - emulator size budget per module (wiki 43)
   - RetroArch core integration OR standalone emulator binaries per platform
   - Dynamic Feature Modules for Android (Play Feature Delivery), shared libs for desktop/nTV OS
6. ROM management and LRU caching
   - server-side ROM library with metadata (title, system, year, genre, cover art, content rating)
   - on-demand ROM download to local device cache
   - configurable local cache quota (10 GB mobile, 40 GB STB, 100 GB desktop)
   - LRU eviction of unpinned ROMs sorted by `lastPlayedAt` (evict to 85% to avoid thrashing)
   - pin/unpin system to protect favorite games from eviction
   - download progress and queue management UI
7. save data management
   - local save storage (SRAM/memcard + save states) with automatic cloud sync to backend
   - per-user encrypted save data in object storage (per-user key derived from auth)
   - save state support: quick save/load from in-game overlay
   - conflict resolution: last-write-wins with automatic backup of overwritten save
   - save history: 30 days or 50 versions (browse and restore from settings)
   - save data excluded from LRU eviction (always retained locally)
8. game catalog and discovery UX
   - browse by system, genre, alphabetical, recently played
   - search across all systems
   - game detail pages with metadata, cover art, screenshots, system requirements
   - "Continue Playing" row on home screen (most recent 5 games)
   - "Recently Added" row (newest games in library)
   - age/content rating display
9. in-game overlay menu
   - trigger via Guide/Home button on controller (wiki 48)
   - save state (quick save to numbered slot)
   - load state (select slot to restore)
   - controller settings (remap buttons for this game)
   - exit to game menu
   - display FPS and performance info (optional)
10. per-game settings
    - resolution scaling (1x, 2x, 3x, native)
    - frame skip (auto, off, 1, 2)
    - shader presets (none, CRT scanline, LCD grid, smooth)
    - audio latency adjustment
    - controller profile override (use different mapping for this game)
11. local multiplayer
    - support 2-4 controllers simultaneously
    - per-player controller assignment UI (Player 1 = Xbox controller, Player 2 = 8BitDo, etc.)
    - controller disconnect handling: pause game, show reconnect prompt
12. BIOS file management
    - BIOS status page: list required BIOS files per system with status (present/missing)
    - upload BIOS files via admin panel or settings UI
    - missing BIOS: clear error message on game launch with instructions
13. controller and input mapping
    - Bluetooth controller pairing and management UI
    - per-emulator default controller mappings with known controller database
    - user-customizable button remapping
    - keyboard/mouse fallback mappings
    - on-screen virtual controller for touch devices (mobile)
    - turbo/auto-fire configurable per button
14. legal and compliance framework
    - users must provide their own legally obtained ROM files OR server operator curates homebrew/public-domain library
    - no ROM distribution from nTV project itself
    - first-time game section entry: display legal notice
    - clear terms of service and content policy
    - DMCA/takedown response procedure for server operators

---

## Phase 8 (`v0.8`) — Reliability and Operations

### 8.1 — Failover and Capacity

1. multi-device failover and capacity controls
2. AntBox failover: automatic tuner reassignment on device failure
3. CDN failover: origin retry and cache fallback behavior

### 8.2 — Backup and Restore

4. backup strategy execution (wiki 37)
   - DB incremental: hourly; full snapshot: daily
   - config snapshot: daily
   - media integrity audit: weekly checksum sweep
5. backup restore drill: monthly execution with documented success criteria
   - freeze writes, restore DB to target point-in-time
   - reconcile object storage manifests
   - run post-restore integrity checks
   - re-enable traffic in phases

### 8.3 — Incident Runbooks

6. concrete runbook for each failure mode (wiki 11, wiki 37):
   - API outage triage (identify -> isolate -> recover -> verify)
   - database backup restore drill (scheduled, tested, documented)
   - object storage access failure recovery
   - live ingest failure during active event (tuner reassign, fallback stream, user notification)
   - transcode queue saturation (backpressure, priority reorder, capacity scale)
   - auth/token outage (emergency key bypass, session recovery)
   - device fleet disconnect (mass reconnect, staged recovery)

### 8.4 — SLOs and Monitoring

7. SLO definitions (wiki 11)
   - API availability target (e.g., 99.9%)
   - media playback start-time target (e.g., < 3 seconds)
   - live ingest continuity target (e.g., < 30 seconds gap per event)
   - mean-time-to-recovery target
8. alert thresholds tied to SLO budgets
9. platform-specific crash and ANR monitoring (Android vitals, iOS crash reports, nTV OS syslog)
10. dashboards: API latency/errors, job queue depth, live ingest uptime, storage growth, auth anomalies

### 8.5 — Capacity and Cost

11. cost and growth model validation (wiki 38)
    - monthly forecast vs actual variance report
    - quarterly retention policy review
    - alert when 80% storage quota reached
12. CDN and storage capacity planning for all content types (video, audio, ROMs, saves, artwork)

### 8.6 — Performance and Abuse Protection

13. performance and load testing
    - concurrent stream load test (target: profile-dependent limit)
    - live event ingest stress test
    - media ingest queue throughput test
    - API endpoint latency under load
14. rate limiting at API and CDN layers
    - token issuance rate limiting (wiki 28)
    - API request rate limiting per user/IP
    - abuse detection: token replay, excessive requests, scraping patterns
15. analytics/telemetry pipeline
    - privacy-respecting, opt-in telemetry
    - admin dashboard: playback metrics, active users, bandwidth, popular content
    - no PII in telemetry data; aggregated stats only

---

## Phase 9 (`v0.9`) — nTV OS and Set-Top Box Appliance

### 9.1 — nTV OS Base System

1. immutable Linux base OS (read-only rootfs, overlay for state)
   - based on minimal Debian/Ubuntu or Buildroot custom image
   - A/B partition layout for atomic OS updates
   - automatic rollback on 3 consecutive failed boots
2. boot-to-app kiosk experience
   - GRUB/systemd-boot -> nTV launcher (no desktop environment, no window manager chrome)
   - boot splash with nTV or white-label branding
   - total boot-to-UI target: < 15 seconds on NVMe SSD
3. system services
   - NetworkManager for Wi-Fi/Ethernet with captive portal handling
   - BlueZ Bluetooth daemon for controller pairing
   - PipeWire for audio output (HDMI, Bluetooth, 3.5mm)
   - HDMI-CEC daemon (libcec): TV remote passthrough, TV power/input control, CEC sleep/wake
   - udev rules for peripheral hotplug (controllers, USB drives, IR receivers)
   - LIRC daemon for IR remote receiver support (configurable key-to-action mapping)
4. OTA update system
   - dual-partition update: download to inactive slot, swap on reboot
   - update channels: `stable`, `candidate`, `nightly`
   - delta updates where possible to minimize bandwidth (bsdiff/xdelta)
   - update check interval configurable (default: daily)
   - manual update trigger from settings UI
   - update progress UI with estimated time
5. power management
   - HDMI-CEC standby: TV off -> STB enters low-power suspend
   - resume from suspend < 3 seconds
   - wake-on-LAN enabled (for remote power-on via backend admin)
   - BIOS auto-power-on after power loss
6. factory reset
   - settings menu option: "Factory Reset" (OWNER/ADMIN only)
   - wipes data partition (config, cache, saves, downloads)
   - regenerates device identity (new keypair, re-enrollment required)
   - returns to first-boot setup wizard

### 9.2 — nTV OS First-Run and Configuration

7. first-boot setup wizard (remote/controller navigable)
   - Step 1: language and timezone selection
   - Step 2: Wi-Fi network selection (if no Ethernet) with on-screen keyboard
   - Step 3: backend URL or IP entry with connection test
   - Step 4: account login via device-code flow
   - Step 5: Bluetooth controller pairing with per-controller instructions
   - Step 6: display resolution and audio output configuration (EDID auto-detect with manual override)
   - Step 7: summary and "Start using nTV"
8. white-label provisioning
   - USB provisioning key: JSON config on USB drive auto-applies at first boot
   - headless provisioning via serial/SSH for fleet deployment
   - MDM-like remote configuration push from backend admin panel

### 9.3 — nTV OS Application Layer

9. nTV frontend application (Electron/CEF or native Wayland app)
   - full nTV feature set: Movies, Shows, Live TV, Sports, Podcasts, Games
   - 10-foot UI optimized for TV viewing distance
   - all navigation via remote, controller, or keyboard
10. emulator runtime layer
    - native Linux emulator binaries (RetroArch + standalone cores)
    - GPU-accelerated rendering (Vulkan/OpenGL)
    - per-system performance profiles tuned to detected hardware tier
11. media playback stack
    - native mpv or GStreamer backend for video (hardware decode via VA-API/VDPAU)
    - HLS/DASH adaptive streaming
    - HDR passthrough where hardware supports
    - audio passthrough for surround sound (Dolby, DTS if hardware supports)

### 9.4 — nTV OS Hardware Abstraction

12. reference hardware profiles (wiki 46)
    - Tier 1 "Retro + Media": Intel N100/N150 class (~$200)
    - Tier 2 "Sweet Spot": AMD Ryzen 7840U/7940HS class (~$450-550)
    - Tier 3 "Power": AMD Ryzen 9 / discrete GPU class (~$650-850)
13. hardware detection and capability reporting
    - CPU/GPU capability probe at first boot
    - automatic emulator tier enablement based on detected hardware
    - storage capacity detection and default cache quota calculation
    - EDID parsing for display resolution and refresh rate
14. peripheral support
    - Bluetooth 5.x controllers (Xbox, PlayStation, 8BitDo, generic HID)
    - 2.4 GHz USB dongle controllers (recommended for lowest latency)
    - USB keyboards and mice
    - IR remote receivers (optional, via LIRC)
    - HDMI-CEC for TV remote passthrough

### 9.5 — nTV OS Reliability

15. crash recovery watchdogs
    - systemd watchdog for nTV app (restart on crash, bounded restart delay)
    - emulator crash recovery: return to game menu with save-state preserved
    - media player crash recovery: restart playback from last position
    - network loss detection: reconnect backoff, offline mode fallback
16. SSH diagnostic access
    - disabled by default
    - enable from settings UI or USB provisioning key
    - read-only diagnostic access (system logs, hardware info, network status)
    - admin can request diagnostic bundle from backend admin panel

### 9.6 — nTV OS Image Build and Distribution

17. reproducible image build pipeline
    - CI/CD builds nTV OS images from declarative config
    - output: `.img.gz` for SD/USB flash, `.iso` for bare-metal install
    - image includes: base OS + nTV app + default emulator cores + provisioning tools
    - white-label builds: accept backend URL, branding assets, boot splash as build parameters
18. installation methods
    - USB flash drive installer (guided or headless)
    - network boot (PXE) for fleet provisioning
    - pre-flashed NVMe/SSD for turnkey hardware kits
19. image variants
    - `ntv-os-full`: all emulator cores included
    - `ntv-os-media`: media-only, no game emulation (smaller image)
    - `ntv-os-minimal`: bare launcher, all modules downloaded on demand

---

## Phase 10 (`v0.10`) — Security and Release Automation

### 10.1 — Secrets and Key Governance

1. secrets/key governance and rotation drills (wiki 39)
   - central secret store with no secrets in code or static config
   - key/token rotation schedules defined and tested
   - JWT signing key rotation: key versioning, graceful rollover, multi-key validation
   - CDN signed URL key rotation
2. secrets rotation drill: quarterly execution with documented procedure

### 10.2 — CI/CD Hardening

3. CI/CD pipeline hardening (wiki 39)
   - lint/type/test gates on every PR
   - migration validation gates
   - contract compatibility checks
   - environment-scoped deployment approvals
   - dependency vulnerability scanning (automated, blocking on critical CVEs)
4. resilience automation: canary deploys, automatic rollback on error spike

### 10.3 — Assurance

5. full assurance ticket run (`T-033` to `T-038`)

### 10.4 — Platform Signing and Distribution

6. APK signing key management and rotation (upload key + app signing key)
7. iOS/macOS code signing and notarization (Apple Developer certificates)
8. nTV OS image signing: Ed25519 signatures verified before partition swap
9. secure boot chain: UEFI secure boot with custom keys, shim signing, rootfs verification
10. store submission automation: scripted submission to Google Play, Apple App Store, Roku, Amazon, LG, Samsung, Tizen

---

## Phase 11 (`v0.11`) — RC Freeze and Final Validation

### 11.1 — Code Freeze

1. defect-only freeze: no new features, only bug fixes and polish
2. all known P0/P1 defects resolved before proceeding

### 11.2 — Full Test Suite

3. full regression test run (unit, integration, contract, e2e)
4. security test run (OWASP top 10 scan, auth boundary tests, injection tests)
5. performance/load test run (concurrent streams, ingest throughput, API latency under load)
6. accessibility audit (WCAG 2.1 AA baseline on web, platform-specific audits)

### 11.3 — Platform Certification Matrix

7. web: browser compatibility matrix sign-off (Chrome, Firefox, Safari, Edge — latest 2 versions)
8. desktop: Mac/Win/Linux installer validation (clean install, upgrade, uninstall)
9. mobile: iOS App Store + Android Play Store submission and approval
10. Android TV: Play Store TV approval, sideload validation on reference devices
11. Fire TV: Amazon Appstore approval
12. Roku: channel store certification
13. webOS: LG Content Store approval
14. tvOS: Apple TV App Store approval
15. Samsung Tizen: Samsung app store approval
16. nTV OS: reference hardware validation on all 3 tiers (Tier 1 N100, Tier 2 7840HS, Tier 3 dGPU)

### 11.4 — White-Label Validation

17. verify backend-URL config flow works on every platform (generic app + white-labeled build)
18. verify custom branding renders correctly on every surface (logo, colors, splash)
19. verify feature toggle system correctly hides/shows each vertical
20. verify device-code auth flow works on every TV/STB platform

### 11.5 — Content Vertical Validation

21. VOD: full playback lifecycle on every platform (browse -> detail -> play -> resume -> complete)
22. Live TV: guide -> tune -> timeshift -> record -> archive on every platform with live TV support
23. Sports: schedule -> live event -> commercial skip -> archive on reference AntBox setup
24. Podcasts: subscribe -> play -> speed -> sleep -> resume -> offline on every platform
25. Games: browse -> download ROM -> play -> save -> sync -> resume on every platform with game support

### 11.6 — Operations Validation

26. backup restore drill: full restore from backup, verify data integrity
27. incident runbook drill: simulate each failure mode, execute runbook, verify recovery
28. SLO validation: confirm all targets met under representative load

### 11.7 — Go/No-Go

29. no-miss feature audit: every roadmap item checked against implementation evidence
30. go/no-go package assembled for `v1.0` release decision
31. release notes and changelog for all platforms

---

## Content Vertical Availability Matrix

| Vertical | Web | Desktop | Mobile | Android TV | Fire TV | Roku | webOS | tvOS | Tizen | nTV OS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Movies/Shows | Ph 3 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 9 |
| Live TV | Ph 5 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 9 |
| Sports | Ph 5 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 6 | Ph 9 |
| Podcasts | Ph 7 | Ph 7 | Ph 7 | Ph 7 | Ph 7 | Ph 7 | Ph 7 | Ph 7 | Ph 7 | Ph 9 |
| Games | Ph 7 | Ph 7 | Ph 7* | Ph 7 | Ph 7 | — | — | — | — | Ph 9 |

`*` Mobile games limited to Tier 1 emulators (lightweight systems only).
Games not supported on Roku, webOS, tvOS, Tizen due to platform runtime constraints.

---

## Platform Feature Matrix (v1.0 Target)

| Feature | Web | Desktop | Mobile | AndroidTV | FireTV | Roku | webOS | tvOS | Tizen | nTV OS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Full login auth | yes | yes | yes | — | — | — | — | — | — | — |
| Biometric auth | — | — | yes | — | — | — | — | — | — | — |
| Device code auth | — | — | — | yes | yes | yes | yes | yes | yes | yes |
| Profile switching | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Parental controls | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Download for offline | PWA | yes | yes | limited | limited | no | no | no | no | yes |
| Background audio | tab | tray | yes | — | — | — | — | — | — | yes |
| Chromecast send | yes | yes | yes | — | — | — | — | — | — | — |
| AirPlay send | — | — | iOS | — | — | — | — | — | — | — |
| HDMI-CEC | — | — | — | some | — | — | — | — | — | yes |
| BT controllers | — | — | — | yes | yes | — | — | yes | — | yes |
| Admin panel | yes | yes | — | — | — | — | — | — | — | — |
