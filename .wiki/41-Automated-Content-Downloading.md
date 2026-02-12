# 41 - Automated Content Downloading System

**Status**: Planning Complete
**Last Updated**: 2026-02-11
**Owner**: Platform Engineering Team
**Dependencies**: Plugins (vpn-manager, torrent-manager, content-acquisition, metadata-enrichment, subtitle-manager)

---

## Overview

The Automated Content Downloading system enables nself-tv to automatically acquire, process, and make available movies, TV episodes, music, and podcasts with zero manual intervention. This transforms nself-tv from a passive media server into an active content acquisition platform comparable to premium streaming services.

### Key Capabilities

- **Automated TV Episode Downloads**: Subscribe to shows, monitor RSS feeds, automatically download new episodes
- **Upcoming Movie Monitoring**: Track digital release dates, auto-download on release day
- **Music & Podcast Subscriptions**: Subscribe to artists and podcasts for automatic new content
- **VPN-Secured Downloads**: All torrent traffic routed through VPN with kill-switch
- **Smart Torrent Selection**: Intelligent matching based on quality, seeders, trusted uploaders
- **Multi-Language Subtitles**: Automatic subtitle search and download in user's preferred languages
- **Quality Management**: Source quality preservation with automatic encoding to multiple bitrates
- **Complete Automation**: From detection to availability, no manual steps required

---

## Architecture

### Component Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Automated Download System                     │
└──────────────────────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
     ┌─────────────────┐  ┌─────────────┐  ┌──────────────┐
     │ content-        │  │ metadata-   │  │ vpn-manager  │
     │ acquisition     │  │ enrichment  │  │              │
     │ (Rules Engine)  │  │ (Search)    │  │ (Security)   │
     └────────┬────────┘  └─────────────┘  └──────┬───────┘
              │                                    │
              │         ┌──────────────────────────┘
              │         │
              ▼         ▼
     ┌────────────────────┐
     │ torrent-manager    │
     │ (Downloads)        │
     └─────────┬──────────┘
               │
               ▼
     ┌────────────────────┐
     │ media-processing   │
     │ (Encoding)         │
     └─────────┬──────────┘
               │
               ▼
     ┌────────────────────┐
     │ subtitle-manager   │
     │ (Subtitles)        │
     └─────────┬──────────┘
               │
               ▼
     ┌────────────────────┐
     │ object-storage     │
     │ (Final Storage)    │
     └────────────────────┘
```

### Plugin Responsibilities

#### content-acquisition (Port 3202)
- **Subscriptions**: Manage TV show, artist, podcast subscriptions
- **RSS Monitoring**: Check feeds hourly for new episodes
- **Release Calendar**: Track upcoming movie/episode releases
- **Download Queue**: Prioritize and manage download requests
- **Rules Engine**: Apply user-defined download rules

#### metadata-enrichment (Port 3203)
- **Catalog Sync**: Maintain complete TMDB/TVDB/MusicBrainz databases
- **Search**: Provide fast searching across millions of titles
- **Release Tracking**: Monitor digital release dates for movies
- **Metadata Enrichment**: Fetch posters, backdrops, cast, ratings

#### vpn-manager (Port 3200)
- **Connection Management**: Connect/disconnect VPN automatically
- **Kill-Switch**: Block all non-VPN traffic
- **Server Rotation**: Rotate through P2P-optimized servers
- **Health Monitoring**: Ensure VPN always active during downloads

#### torrent-manager (Port 3201)
- **Search Aggregation**: Search across 4 torrent sources (1337x, TPB, RARBG, YTS)
- **Smart Matching**: Select best torrent based on quality, seeders, source
- **Download Management**: Add, monitor, pause, resume torrents
- **Seeding Policies**: Maintain ratio/time limits, auto-remove after seeding

#### subtitle-manager (Port 3204)
- **Multi-Source Search**: OpenSubtitles, Subscene, Podnapisi, Addic7ed
- **Smart Matching**: Match release names, verify sync
- **Multi-Language**: Download user's preferred languages
- **Format Conversion**: Convert all to WebVTT for web playback

---

## Workflows

### Movie Download Workflow

**Trigger**: User selects movie from search results

```
1. User searches metadata-enrichment
   - Queries TMDB database (millions of movies)
   - Returns: Title, Year, IMDB ID, Release Date, Digital Release Date

2. User selects movie + quality profile
   - Quality profile defines: Source quality, encoding targets, languages

3. content-acquisition validates release
   - If theatrical_release_date > NOW(): Queue for future
   - If digital_release_date > NOW(): Schedule cron check
   - If digital_release_date <= NOW(): Proceed immediately

4. vpn-manager check
   - Query VPN status: GET /v1/status
   - If disconnected: POST /v1/connect (5 second timeout)
   - Wait for vpn.connected webhook

5. torrent-manager search
   - POST /v1/search with query: "{title} {year} {quality}"
   - Searches 4 sources in parallel
   - Returns aggregated results with scoring

6. Smart torrent selection
   - Score by: seeders (40%), quality match (30%), source (20%), uploader trust (10%)
   - Select best match above threshold

7. torrent-manager download
   - POST /v1/downloads with magnet URI
   - Transmission/qBittorrent adds torrent
   - Returns download_id for monitoring

8. Monitor download progress
   - Poll GET /v1/downloads/{id} every 10 seconds
   - Track: progress %, download rate, ETA, seeders/leechers
   - VPN health check every 30 seconds
   - If VPN disconnects: Auto-pause download

9. Download complete webhook
   - torrent-manager emits: torrent.completed
   - Payload includes: file path, size, duration

10. media-processing encode
    - POST /v1/encode/hls with source file + quality profiles
    - FFmpeg encodes 5 renditions: 240p, 360p, 480p, 720p, 1080p
    - Hardware acceleration (NVENC/QSV) if available
    - Generates HLS master + variant playlists
    - Creates trickplay thumbnails
    - Duration: ~20-30 minutes for 2-hour 1080p movie (with GPU)

11. subtitle-manager search
    - POST /v1/search with IMDB ID + release name + languages
    - Searches OpenSubtitles (primary), Subscene, Podnapisi
    - Downloads all requested languages
    - Verifies sync against video duration
    - Converts to WebVTT format

12. object-storage upload
    - POST /v1/upload with HLS files, subtitles, posters
    - S3-compatible storage (Hetzner, AWS, Cloudflare R2)
    - Bucket structure: /movies/{movie_id}/hls/, /subtitles/
    - CDN integration with signed URLs

13. database update
    - INSERT INTO media_items (title, content_type, duration, ...)
    - INSERT INTO media_variants (quality, bitrate, url, ...)
    - INSERT INTO subtitle_files (language, url, ...)
    - Link to metadata_movies (TMDB data)

14. library-service rescan
    - POST /v1/library/rescan
    - Updates search index (Elasticsearch)
    - Invalidates caches

15. notifications
    - POST /v1/notify with template: "movie_available"
    - Sends email, push notification, webhook

16. cleanup
    - Remove source file from download directory
    - Continue seeding (or remove based on policy)
    - Disconnect VPN if no other downloads active

Total Duration: ~1-2 hours for 1080p movie (download + encode + upload)
```

### TV Show Subscription Workflow

**Trigger**: User subscribes to TV show

```
1. User searches metadata-enrichment
   - POST /v1/search/tv with query: "The Office"
   - Returns TV show with TVDB ID, seasons, episode count

2. User creates subscription
   - POST /v1/subscriptions
   - Payload: {
       tvdb_id: 73244,
       quality_profile_id: "uuid",
       monitor_seasons: [1, 2, 3, ...],
       backfill_existing: true
     }

3. content-acquisition processes subscription
   - Queries metadata-enrichment for all episodes
   - GET /v1/tv/{tvdb_id}/episodes
   - Returns all seasons/episodes with air dates

4. Backfill existing episodes (if enabled)
   - For each aired episode:
     - Check if already in library (query database)
     - If not: Add to download queue with priority
   - Process queue (rate-limited to avoid overwhelming system)

5. Subscribe to RSS feed
   - Lookup ShowRSS feed for TVDB ID
   - POST /v1/feeds with URL
   - content-acquisition adds to monitoring list

6. Daily RSS monitoring (cron job)
   - Every hour: Check all RSS feeds
   - Parse new feed items
   - Extract: Show name, S01E01, quality, magnet URI
   - Match against subscriptions
   - If new episode: Add to download queue

7. Download & processing (per episode)
   - Same workflow as movie download (steps 4-16)
   - Organized by season: /tv/{show_id}/S01/E01/hls/

8. Notification
   - Send notification: "New episode available: The Office S09E23"
```

### Upcoming Movie Monitoring

**Trigger**: User adds upcoming movie to watchlist

```
1. User selects upcoming movie
   - Movie has digital_release_date in future

2. content-acquisition schedules monitoring
   - INSERT INTO release_calendar
   - Sets next_check_at = digital_release_date

3. Daily cron job (2am)
   - SELECT * FROM release_calendar WHERE next_check_at <= NOW()
   - For each movie:
     - Query metadata-enrichment to verify release date
     - If released: Trigger download workflow
     - If still upcoming: Reschedule for tomorrow

4. On digital release day
   - Automatic download initiated (movie workflow)
   - User receives notification when ready
```

### VPN Kill-Switch Failsafe

**Trigger**: VPN disconnection during download

```
1. VPN health monitor (runs every 30 seconds)
   - Pings VPN gateway
   - Verifies public IP matches VPN provider
   - If either fails: Emit vpn.disconnected webhook

2. torrent-manager receives webhook
   - Immediately pauses all active downloads
   - Sets status: 'paused_vpn_disconnect'

3. vpn-manager reconnection attempt
   - Attempts reconnect (exponential backoff)
   - Max 5 attempts over 2 minutes
   - If successful: Emit vpn.connected webhook

4. torrent-manager receives vpn.connected
   - Resumes all paused downloads
   - Sets status: 'downloading'

5. If reconnection fails
   - Send notification to admin: "VPN connection failed, downloads paused"
   - Downloads remain paused until manual intervention
   - No traffic leaks (firewall rules block non-VPN)
```

---

## Database Schema

See migrations:
- `/backend/db/migrations/001_watch_progress.sql`
- `/backend/db/migrations/002_playlists.sql`
- `/backend/db/migrations/003_ratings_reviews.sql`
- `/backend/db/migrations/004_recommendations.sql`

Plus plugin-specific schemas (see individual plugin specs in ~/Sites/nself-plugins/):
- `vpn_*` tables (vpn-manager)
- `torrent_*` tables (torrent-manager)
- `acquisition_*` tables (content-acquisition)
- `metadata_*` tables (metadata-enrichment)
- `subtitle_*` tables (subtitle-manager)

---

## Quality Profiles

Quality profiles define download and encoding preferences.

### Example Profiles

#### Balanced (Default)
```json
{
  "profile_name": "balanced",
  "preferred_quality": "1080p",
  "source_quality": "1080p",
  "fallback_quality_order": ["1080p", "720p", "480p"],
  "preferred_sources": ["bluray", "web-dl", "webrip"],
  "min_seeders": 5,
  "prefer_trusted_uploaders": true,
  "audio_languages": ["eng"],
  "subtitle_languages": ["eng"],
  "encode_to_qualities": ["1080p", "720p", "480p", "360p", "240p"]
}
```

#### 4K Premium
```json
{
  "profile_name": "4k_premium",
  "preferred_quality": "2160p",
  "source_quality": "2160p",
  "fallback_quality_order": ["2160p", "1080p"],
  "preferred_sources": ["bluray", "remux"],
  "min_seeders": 10,
  "prefer_trusted_uploaders": true,
  "audio_languages": ["eng"],
  "subtitle_languages": ["eng", "spa", "fra"],
  "encode_to_qualities": ["2160p", "1080p", "720p", "480p"]
}
```

#### Minimal
```json
{
  "profile_name": "minimal",
  "preferred_quality": "720p",
  "source_quality": "720p",
  "fallback_quality_order": ["720p", "480p", "1080p"],
  "preferred_sources": ["web-dl", "webrip", "hdtv"],
  "min_seeders": 3,
  "prefer_trusted_uploaders": false,
  "audio_languages": ["eng"],
  "subtitle_languages": ["eng"],
  "encode_to_qualities": ["720p", "480p", "360p"]
}
```

---

## User Interface

### Admin Download Management UI

Location: `/downloads` (web app)

**Sections**:

1. **Download Queue**
   - Active downloads with progress bars
   - Download rate, ETA, seeders/leechers
   - Actions: Pause, Resume, Remove, Retry

2. **Subscriptions**
   - List of TV show, artist, podcast subscriptions
   - Status: Active, Paused, Completed
   - Actions: Edit, Pause, Delete, Backfill

3. **Release Calendar**
   - Upcoming movies and episodes
   - Release dates (theatrical vs digital)
   - Actions: Monitor, Ignore, Download Now

4. **Download History**
   - Completed downloads with statistics
   - Success/failure status
   - Duration, size, quality

5. **Quality Profiles**
   - Create/edit quality profiles
   - Set default profile
   - Per-subscription overrides

6. **VPN Status**
   - Connection status indicator
   - Current server location
   - Public IP display
   - Actions: Connect, Disconnect, Rotate Server

7. **Rules Engine**
   - Create download rules
   - Conditions: genre, rating, year, etc.
   - Actions: Auto-download, Notify, Skip
   - Priority ordering

---

## Security & Legal

### VPN Security

**Kill-Switch Implementation**:
```bash
# iptables rules (applied by vpn-manager)
iptables -F OUTPUT
iptables -P OUTPUT DROP
iptables -A OUTPUT -o lo -j ACCEPT  # Allow loopback
iptables -A OUTPUT -o tun+ -j ACCEPT  # Allow VPN interface
iptables -A OUTPUT -d ${VPN_SERVER_IP} -j ACCEPT  # Allow VPN server
iptables -A OUTPUT -d 192.168.0.0/16 -j ACCEPT  # Allow local network (optional)
```

**Verification**:
- Public IP check every 30 seconds
- DNS leak protection
- IPv6 leak protection
- WebRTC leak protection

### Legal Disclaimer

**User Responsibility**:
- Users are responsible for content legality
- VPN required for all torrent downloads (enforced)
- No activity logging (privacy by default)
- DMCA compliance policy available

**Terms of Service**:
- User agreement required before enabling downloads
- Age verification for certain content types
- Acceptable use policy
- Content removal process for rights holders

---

## Performance & Optimization

### Throughput Targets

- **Download Speed**: 50 MB/s on gigabit connection (with VPN overhead ~10%)
- **Encoding Speed**: 1080p 2-hour movie in < 30 minutes (with GPU acceleration)
- **Subtitle Search**: < 5 seconds across all sources
- **Queue Processing**: 3 concurrent downloads (configurable)

### Hardware Recommendations

**Minimum**:
- CPU: 4 cores (Intel i5 or AMD Ryzen 5)
- RAM: 8 GB
- Storage: 500 GB SSD (temporary encoding workspace)
- Network: 100 Mbps

**Recommended**:
- CPU: 8 cores with hardware encoding (Intel with Quick Sync, AMD with VCE, or NVIDIA GPU)
- RAM: 16 GB
- Storage: 1 TB NVMe SSD (workspace) + S3 object storage (long-term)
- Network: 1 Gbps

**Optimal**:
- CPU: 16 cores
- GPU: NVIDIA RTX 3060+ (NVENC hardware encoding)
- RAM: 32 GB
- Storage: 2 TB NVMe SSD + S3/Cloudflare R2
- Network: 1 Gbps with VPN server close to location

### Scaling Strategy

**Horizontal Scaling**:
- Multiple torrent-manager instances (load balanced)
- Multiple encoding workers (queue-based with BullMQ)
- Separate download and encoding servers

**Vertical Scaling**:
- GPU-enabled instances for encoding
- NVMe SSDs for temporary storage
- Redis cluster for job queue

---

## Monitoring & Observability

### Key Metrics

**Download Metrics**:
- `download_success_rate`: % of downloads completed successfully
- `avg_download_duration_seconds`: Average time to download
- `concurrent_downloads`: Number of simultaneous downloads
- `torrent_search_duration_ms`: Time to search across all sources

**Encoding Metrics**:
- `encoding_duration_seconds`: Time to encode (by quality)
- `encoding_success_rate`: % of encodes completed successfully
- `encoding_queue_depth`: Number of items waiting to encode

**VPN Metrics**:
- `vpn_uptime_percentage`: % of time VPN connected
- `vpn_connection_failures`: Number of failed connections
- `vpn_reconnection_attempts`: Number of reconnection attempts

**Subtitle Metrics**:
- `subtitle_match_rate`: % of content with subtitles found
- `subtitle_search_duration_ms`: Time to search all sources

### Alerts

**Critical Alerts**:
- VPN down for > 5 minutes
- Download failure rate > 10%
- Encoding failure rate > 5%
- Disk space < 10%

**Warning Alerts**:
- VPN reconnection attempts > 3
- Download rate < 5 MB/s
- Encoding queue depth > 20
- Subtitle match rate < 80%

---

## Troubleshooting

### Common Issues

#### Downloads Not Starting

**Symptom**: Items stuck in queue with status 'queued'

**Possible Causes**:
1. VPN not connected
2. Concurrent download limit reached
3. Torrent client offline

**Resolution**:
```bash
# Check VPN status
curl http://localhost:3200/v1/status

# Check torrent client
curl http://localhost:3201/v1/clients

# Check queue
curl http://localhost:3202/v1/queue
```

#### VPN Keeps Disconnecting

**Symptom**: Frequent vpn.disconnected webhooks

**Possible Causes**:
1. Network instability
2. VPN server overloaded
3. Incorrect credentials

**Resolution**:
```bash
# Rotate to different server
curl -X POST http://localhost:3200/v1/rotate

# Check connection logs
nself-vpn-manager logs --follow

# Try different provider
nself-vpn-manager connect --provider nordvpn
```

#### Subtitles Not Found

**Symptom**: Content available but no subtitles

**Possible Causes**:
1. Release name mismatch
2. OpenSubtitles API rate limit
3. Content too new (subtitles not yet uploaded)

**Resolution**:
```bash
# Manual search with specific release name
nself-subtitle-manager search --imdb-id tt0133093 --release "The.Matrix.1999.1080p.BluRay.x264-GROUP"

# Check API status
curl http://localhost:3204/v1/sources

# Backfill later
nself-subtitle-manager backfill --content-id <uuid>
```

---

## Future Enhancements

### Phase 2+ Features

- **Usenet Integration**: Support for NZB downloads (more reliable than torrents)
- **Multi-Source Redundancy**: Automatically try multiple sources if primary fails
- **Predictive Pre-downloading**: ML model predicts what user will watch next
- **Quality Upgrading**: Automatically replace 720p with 1080p when better quality available
- **Bandwidth Scheduling**: Download during off-peak hours only
- **Mobile App**: Manage downloads from mobile device
- **Voice Control**: "Alexa, download the latest episode of The Office"

---

## References

- [PROP3.md](/Users/admin/Sites/nself-plugins/PROP3.md) - nTV media plugin review feedback and acceptance criteria
- [PROP1.md](/Users/admin/Sites/nself-plugins/PROP1.md) - ROM discovery plugin (P24) specification
- [PROP2.md](/Users/admin/Sites/nself-plugins/PROP2.md) - Retro gaming plugin (P23) specification
- [VISION.md](.claude/VISION.md) - Overall vision and strategy
- [MISSION.md](.claude/MISSION.md) - Project mission and objectives
- Database migrations in `/backend/db/migrations/`

---

**Document Status**: ✅ Complete
**Last Review**: 2026-02-11
**Next Review**: After Phase 5.5 completion
