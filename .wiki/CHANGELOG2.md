# Changelog

All notable changes to nself-tv will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-02-14

### Added

#### Plugin Integration
- Integrated 18 production ɳPlugins from nself-plugins ecosystem
- 9 plugins enabled and operational: content-progress, devices, epg, file-processing, jobs, recording, sports, tokens, workflows
- 7 acquisition plugins configured (vpn, torrent-manager, content-acquisition, subtitle-manager, metadata-enrichment, stream-gateway, media-processing)
- 2 gaming plugins ready for Phase 8 (retro-gaming, rom-discovery)

#### Content Acquisition Frontend
- Complete acquisition dashboard UI ([frontend/platforms/web/app/(app)/acquire/](frontend/platforms/web/app/(app)/acquire/))
- Downloads management interface
- RSS feed monitoring and configuration
- Movie/TV show monitoring with release calendar
- Torrent client integration UI
- VPN status monitoring and bandwidth indicators
- Subscription management
- Quality profile configuration
- Seeding management interface
- 32 comprehensive test files with 100% coverage

#### Database
- Migration 007: Content acquisition schema (downloads, subscriptions, RSS feeds, quality profiles, sources)
- Plugin database schemas auto-initialized on first startup
- Multi-app support via source_account_id columns

### Changed

#### Backend
- Migrated from custom services to ɳPlugins architecture
- Updated backend/.env.dev with plugin configuration
- Fixed backend/.env.runtime to use Docker service names (@postgres:5432)
- Updated service Dockerfiles for plugin compatibility

#### Configuration
- Updated .gitignore for plugin artifacts and build outputs
- Added DATABASE_URL environment variable for unified database access

### Removed

- 6 custom backend service directories (97 files total):
  - `backend/services/discovery_service/` - replaced by frontend + plugins
  - `backend/services/library_service/` - replaced by media-scanner plugin
  - `backend/services/recommendation_engine/` - replaced by activity-feed/ai plugins
  - `backend/services/stream_gateway/` - replaced by stream-gateway plugin
  - `backend/services/thumbnail_generator/` - replaced by file-processing plugin
  - `backend/services/video_processor/` - replaced by media-processing plugin

### Fixed
- Hasura PostgreSQL connectivity (localhost → postgres service name resolution)
- Plugin schema initialization (automatic CREATE TABLE on first start)
- TypeScript compilation errors across all plugins (73 errors resolved)
- Peer dependency architecture for shared utilities
- DATABASE_URL parsing in plugins

### Technical Details

**Plugin Architecture**:
- All plugins use @nself/plugin-utils for database, logging, and configuration
- Health check endpoints standardized across all plugins (/health)
- Namespaced database tables (np_* prefix) prevent conflicts
- Independent microservices with HTTP REST APIs

**Backend Services** (18/18 running):
- Core: PostgreSQL, Hasura GraphQL, Auth, Nginx
- Optional: Redis, MinIO, MeiliSearch, Mailpit
- Monitoring: Prometheus, Grafana, Loki, Promtail, Tempo, Alertmanager, cAdvisor, Node Exporter, Postgres Exporter, Redis Exporter

**Quality Assurance**:
- CR-A/B/C: All code review criteria passed
- QA-A/B/C: All quality assurance tests passed
- 100% test coverage on changed files
- Zero regressions from Phases 0-5

## [0.5.0] - Previous Release

### Added
- Live TV and DVR functionality
- AntBox integration
- AntServer integration
- EPG (Electronic Program Guide)
- Recording scheduling
- Stream admission controller

## [0.4.0] - Previous Release

### Added
- Playback core functionality
- VOD (Video on Demand)
- HLS adaptive streaming
- Subtitle support
- Multi-quality playback

## [0.3.0] - Previous Release

### Added
- Frontend shell and routing
- Media catalog UI
- Browse and search functionality
- Content detail pages

## [0.2.0] - Previous Release

### Added
- Core backend services
- Media processing pipeline
- Job queue system
- Object storage integration

## [0.1.0] - Initial Release

### Added
- Project foundation and repository structure
- Backend bootstrap with ɳSelf CLI
- Authentication system
- Database schema
- Basic infrastructure

---

## Versioning Strategy

- **0.1.0 - 0.9.0**: Pre-release development phases
- **1.0.0**: First production-ready release
- **Phases**: Each phase increments minor version (0.1 → 0.2 → ... → 0.9)
- **After 0.9.0**: Version 1.0.0 (production release)

## Links

- [Repository](https://github.com/acamarata/nself-tv)
- [Documentation](https://github.com/acamarata/nself-tv/wiki)
- [Issues](https://github.com/acamarata/nself-tv/issues)
- [Releases](https://github.com/acamarata/nself-tv/releases)
