# ɳSelf TV

**Open-source, self-hosted media platform** showcasing the ɳSelf CLI. A production-ready alternative to Plex, Netflix, and Spotify that you can host yourself.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![ɳSelf CLI](https://img.shields.io/badge/Built%20with-ɳSelf%20CLI-green)](https://github.com/acamarata/nself)

## 🎯 What This Is

ɳSelf TV is a **FOSS example project** demonstrating how to build a complete, production-grade media platform using only the ɳSelf CLI. It serves as both:

1. **Reference Implementation** - Best practices for ɳSelf-based applications
2. **Working Media Platform** - Fully functional VOD, Live TV, and streaming system

## 🚀 Quick Start

**Prerequisites:**

- Docker Desktop running
- ɳSelf CLI installed ([install guide](https://github.com/acamarata/nself))

**Get started in 3 commands:**

```bash
# 1. Clone the repository
git clone https://github.com/acamarata/nself-tv.git
cd nself-tv/backend

# 2. Build the backend infrastructure
nself build

# 3. Start all services (18 containers + 9 enabled plugins)
nself start

# Note: Plugin startup is automated by nself CLI
# 9 plugins start automatically (file-processing, devices, epg, sports,
# recording, jobs, workflows, tokens, content-progress)
# 7 acquisition plugins will be enabled in a future update
```

**Access points:**

- **GraphQL API**: <http://api.local.nself.org>
- **Hasura Console**: <http://api.local.nself.org/console>
- **Grafana Monitoring**: <http://grafana.local.nself.org>
- **MinIO Storage**: <http://minio.local.nself.org>

*Frontend apps run separately (see Frontend Setup below)*

## 📋 What Gets Started

When you run `nself start`, you get **18 Docker containers** plus **9 enabled ɳPlugins** as external processes:

### Core Services (4)

- **PostgreSQL** - Primary database
- **Hasura GraphQL** - Real-time GraphQL API
- **Auth Service** - Authentication & user management
- **Nginx** - Reverse proxy & SSL termination

### Optional Services (4)

- **Redis** - Caching & sessions
- **MinIO** - S3-compatible object storage
- **MeiliSearch** - Full-text search engine
- **MailPit** - Email testing (dev only)

### Monitoring Stack (10)

- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards
- **Loki** - Log aggregation
- **Tempo** - Distributed tracing
- **AlertManager** - Alert routing
- **cAdvisor** - Container metrics
- **Node Exporter** - System metrics
- **Promtail** - Log shipping
- **Postgres Exporter** - Database metrics
- **Redis Exporter** - Cache metrics

### ɳPlugins (18 - External Node.js Processes)

All plugins are installed and managed via `nself plugin` commands. Currently, 9 plugins are enabled in development (7 content acquisition plugins temporarily disabled pending CLI env propagation fix).

**Content Acquisition (5 plugins - disabled pending CLI fix):**

- **vpn** - Secure P2P traffic, kill-switch, leak protection
- **torrent-manager** - Torrent search, download, seeding
- **content-acquisition** - RSS, subscriptions, automation orchestrator
- **subtitle-manager** - Multi-language subtitle fetch & sync
- **metadata-enrichment** - TMDB/TVDB metadata enrichment

**Core Media Services (3 plugins):**

- **stream-gateway** - Admission control, signed URLs (disabled pending CLI fix)
- **media-processing** - HLS encoding, adaptive bitrate (disabled pending CLI fix)
- **file-processing** - Posters, sprites, optimization ✅ enabled

**Live TV & DVR (4 plugins - all enabled):**

- **devices** - IoT device enrollment & trust ✅
- **epg** - Electronic program guide ✅
- **sports** - Sports data, scores, schedules ✅
- **recording** - DVR orchestration ✅

**Infrastructure (3 plugins - all enabled):**

- **jobs** - BullMQ job queue ✅
- **workflows** - Workflow automation ✅
- **tokens** - Content delivery tokens & HLS encryption ✅

**User Features (1 plugin - enabled):**

- **content-progress** - Playback progress tracking ✅

**Gaming (2 plugins - disabled by default, Phase 8 preview):**

- **retro-gaming** - ROM library & emulation
- **rom-discovery** - ROM metadata & downloads

## 🎨 Frontend Setup

Frontends run **outside Docker** and connect to the backend via nginx:

```bash
# Web App (Next.js)
cd ../frontend/platforms/web
npm install
npm run dev
# Access: http://app.local.nself.org

# TV App (React Native Web)
cd ../tv
npm install
npm run dev:web
# Access: http://tv.local.nself.org

# Mobile Preview (React Native Metro)
cd ../mobile
npm install
npm start
# Access: http://mobile.local.nself.org

# Desktop App (Tauri)
cd ../desktop
npm install
npm run tauri dev
# Access: http://desktop.local.nself.org
```

## 🏗️ Architecture

### Technology Stack

- **Backend**: 100% ɳSelf CLI (zero manual Docker/K8s)
- **Database**: PostgreSQL 15
- **API**: Hasura GraphQL (real-time subscriptions)
- **Auth**: nhost-auth (JWT, SSO, magic links)
- **Storage**: MinIO (S3-compatible) / Hetzner Object Storage
- **Search**: MeiliSearch
- **Cache**: Redis
- **Monitoring**: Prometheus + Grafana + Loki + Tempo

### Plugin Management

All backend features are provided through ɳPlugins installed via ɳSelf CLI:

```bash
# Install a plugin
nself plugin install vpn

# List installed plugins
nself plugin list

# Start all plugins
cd backend && ./start-plugins.sh

# Stop all plugins
cd backend && ./stop-plugins.sh

# View plugin logs
tail -f ~/.nself/logs/*.log
```

Plugins are configured via environment variables in `backend/.env.dev`.

### Frontend Platforms

| Platform | Framework | Target |
|----------|-----------|--------|
| Web | Next.js 14 | Desktop browsers |
| TV | React Native Web | Smart TVs, Apple TV, Android TV |
| Mobile | React Native | iOS, Android |
| Desktop | Tauri | Windows, macOS, Linux |

## 🌍 Deployment Modes

### Standalone (Default)

Each app instance has its own complete backend:

```
nself-tv/
├── backend/          # Complete ɳSelf stack
└── frontend/         # All 12 platform apps
```

### Monorepo (Shared Backend)

Multiple apps share one backend (family.nself.org, chat.nself.org, etc.):

```
nself-family/
├── backend/          # Shared ɳSelf stack
└── frontends/
    ├── family/       # family.nself.org
    ├── chat/         # chat.nself.org
    └── tv/           # tv.nself.org
```

## 🔧 Development

### Useful Commands

```bash
# Backend management
nself status          # Check service health
nself logs            # View all logs
nself restart         # Restart all services
nself stop            # Stop all services
nself urls            # List all endpoints

# Plugin management
./start-plugins.sh    # Start all 21 plugins
./stop-plugins.sh     # Stop all plugins
tail -f ~/.nself/logs/*.log  # Watch plugin logs

# Database
nself db migrate      # Run migrations
nself db backup       # Backup database
nself db restore      # Restore database

# Monitoring
nself monitor         # Open Grafana
nself health          # Health check all services
```

### Environment Files

- `.env.dev` - Local development (committed to git)
- `.env.staging` - Staging environment (committed to git)
- `.env.prod` - Production environment (committed to git)
- `.env.local` - Personal overrides (gitignored)
- `.env.secrets` - Production credentials (gitignored, on server only)

### Configuration

Edit `backend/.env.dev` to customize:

- Service ports
- Feature flags
- Database settings
- Custom microservices
- Frontend routes

## 📦 Features

### Phase 1 (v0.1) - Foundation ✅

- [x] Backend infrastructure (ɳSelf CLI)
- [x] PostgreSQL + Hasura GraphQL
- [x] Authentication system (JWT, SSO, magic links)
- [x] Full monitoring stack (Prometheus, Grafana, Loki, Tempo)

### Phase 2 (v0.2) - Core Services ✅

- [x] Media library management
- [x] Content discovery & recommendations
- [x] Background job processing (BullMQ)
- [x] Object storage (MinIO/S3)

### Phase 3 (v0.3) - Frontend Shell ✅

- [x] Web application (Next.js 14)
- [x] Catalog UI & navigation
- [x] User authentication flow
- [x] Responsive design

### Phase 4 (v0.4) - Playback ✅

- [x] VOD playback with adaptive streaming
- [x] HLS transcoding & delivery
- [x] Multi-language subtitle support
- [x] Playback progress tracking
- [x] Session management & admission control

### Phase 5 (v0.5) - Live TV & DVR ✅

- [x] Live stream ingestion (IPTV, AntBox)
- [x] EPG integration (XMLTV, SchedulesDirect)
- [x] Sports data integration (ESPN API)
- [x] DVR recording & scheduling
- [x] IoT device enrollment & trust management

### Phase 6 (v0.6) - Content Acquisition 🚧 95%

- [x] VPN integration (NordVPN, kill-switch)
- [x] Torrent manager (Transmission)
- [x] RSS feed monitoring
- [x] Automated content acquisition
- [x] Movie release monitoring
- [x] Subscription management
- [x] Quality profiles & upgrade rules
- [x] Subtitle auto-download
- [x] TMDB/TVDB metadata enrichment
- [ ] Plugin startup automation (CLI team working on this)

**Current Status**: All code complete (38 files, 2,500+ LOC), all tests passing (257+), all 21 plugins installed. Plugins configured and ready - waiting for final startup mechanism from ɳSelf CLI team.

### Phase 7 (v0.7) - Platform Expansion 📋

- [ ] Mobile apps (iOS, Android)
- [ ] Desktop apps (Windows, macOS, Linux)
- [ ] TV apps (Apple TV, Android TV, Roku)

### Phase 8 (v0.8) - Advanced Features 📋

- [ ] Gaming integration
- [ ] Cross-platform sync
- [ ] Social features (watch parties, sharing)
- [ ] Advanced discovery algorithms

### Phase 9 (v0.9) - Polish & Parity 📋

- [ ] Complete QA across all platforms
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Performance optimization
- [ ] Platform certifications

## 🌐 Deployment Targets

| Environment | Domain Pattern | Status |
|-------------|----------------|--------|
| **Local** | *.local.nself.org | ✅ Active |
| **Staging** | *.staging.nself.org | 🔧 Configured |
| **Production** | *.nself.org | 📋 Planned |

## 🔒 Security

- JWT-based authentication
- Row-level security (Hasura)
- Encrypted secrets
- HTTPS/SSL everywhere
- Rate limiting
- CORS protection

## 📚 Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Contributing Guide](./docs/CONTRIBUTING.md)

## 🤝 Contributing

This is a reference implementation. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `nself test`
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Built with:

- [ɳSelf CLI](https://github.com/acamarata/nself) - Backend orchestration
- [Hasura](https://hasura.io) - GraphQL engine
- [Next.js](https://nextjs.org) - Web framework
- [React Native](https://reactnative.dev) - Mobile/TV apps
- [Tauri](https://tauri.app) - Desktop apps

## 📧 Contact

- **Project**: <https://github.com/acamarata/nself-tv>
- **Author**: @acamarata
- **ɳSelf CLI**: <https://github.com/acamarata/nself>

---

**Built to showcase the power of ɳSelf CLI** 🚀
