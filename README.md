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

# 3. Start all services (24 containers)
nself start
```

**Access points:**
- **GraphQL API**: http://api.local.nself.org
- **Hasura Console**: http://api.local.nself.org/console
- **Grafana Monitoring**: http://grafana.local.nself.org
- **MinIO Storage**: http://minio.local.nself.org

*Frontend apps run separately (see Frontend Setup below)*

## 📋 What Gets Started

When you run `nself start`, you get **24 containers**:

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

### Custom Microservices (6)
- **library-service** (Go/Gin) - Media library management
- **discovery-service** (Go/Gin) - Content discovery & recommendations
- **stream-gateway** (Go/Gin) - Video streaming & CDN
- **recommendation-engine** (Python/FastAPI) - ML-based recommendations
- **video-processor** (Node.js/BullMQ) - Video transcoding worker
- **thumbnail-generator** (Node.js/BullMQ) - Thumbnail generation worker

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

### Microservices

| Service | Language | Framework | Purpose |
|---------|----------|-----------|---------|
| library-service | Go | Gin | Media CRUD operations |
| discovery-service | Go | Gin | Content recommendations |
| stream-gateway | Go | Gin | Video streaming & CDN |
| recommendation-engine | Python | FastAPI | ML recommendations |
| video-processor | Node.js | BullMQ | Video transcoding |
| thumbnail-generator | Node.js | BullMQ | Thumbnail generation |

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
nself logs api        # View API logs
nself restart         # Restart all services
nself stop            # Stop all services
nself urls            # List all endpoints

# Database
nself db backup       # Backup database
nself db restore      # Restore database
nself db migrate      # Run migrations

# Monitoring
nself monitor         # Open Grafana
nself metrics         # View Prometheus
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

### Phase 1 (v0.1) - Foundation ✓
- [x] Backend infrastructure (ɳSelf CLI)
- [x] PostgreSQL + Hasura GraphQL
- [x] Authentication system
- [x] Basic monitoring

### Phase 2 (v0.2) - Core Services
- [ ] Media library management
- [ ] Content discovery
- [ ] Video streaming gateway
- [ ] Background job processing

### Phase 3 (v0.3) - Frontend Shell
- [ ] Web application (Next.js)
- [ ] Catalog UI
- [ ] User authentication flow

### Phase 4 (v0.4) - Playback
- [ ] VOD playback
- [ ] HLS adaptive streaming
- [ ] Subtitle support
- [ ] Playback tracking

### Phase 5 (v0.5) - Live TV
- [ ] Live stream ingestion
- [ ] EPG integration
- [ ] DVR recording
- [ ] Time-shifting

### Phase 6 (v0.6) - Content Acquisition
- [ ] Torrent integration
- [ ] RSS feeds
- [ ] VPN support
- [ ] Automated downloads

### Phase 7 (v0.7) - Platform Expansion
- [ ] Mobile apps (iOS, Android)
- [ ] Desktop apps (Windows, macOS, Linux)
- [ ] TV apps (Apple TV, Android TV, Roku)

### Phase 8 (v0.8) - Advanced Features
- [ ] Gaming integration
- [ ] Cross-platform sync
- [ ] Social features
- [ ] Advanced discovery

### Phase 9 (v0.9) - Polish & Parity
- [ ] Complete QA
- [ ] Accessibility (WCAG 2.1)
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

- **Project**: https://github.com/acamarata/nself-tv
- **Author**: @acamarata
- **ɳSelf CLI**: https://github.com/acamarata/nself

---

**Built to showcase the power of ɳSelf CLI** 🚀
