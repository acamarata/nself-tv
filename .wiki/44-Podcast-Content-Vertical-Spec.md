# 44 - Podcast Content Vertical Spec

## Objective

Define the full architecture for podcast discovery, ingest, playback, and management as a first-class content vertical within nTV.

## Architecture Overview

```
+-------------------+     +-------------------+     +------------------+
|   nTV Client      |     |   nTV Backend     |     |  External        |
|                   |     |                   |     |                  |
| Podcast UI        |<--->| Feed Ingest Svc   |<--->| RSS/Atom Feeds   |
| Audio Player      |     | Episode Storage   |     | Podcast APIs     |
| Download Queue    |     | Metadata Cache    |     |                  |
| Offline Episodes  |     | Search Index      |     |                  |
+-------------------+     +-------------------+     +------------------+
```

## Data Model

### Database Tables

```
podcast_shows:
  id: uuid
  family_id: FK -> families.id
  feed_url: string (unique per family)
  title: string
  author: string
  description: text
  artwork_url: string (original)
  artwork_cached_path: string (object storage)
  categories: string[]
  language: string
  explicit: boolean
  last_fetched_at: timestamptz
  fetch_interval_minutes: int (default: 60)
  episode_count: int
  status: enum (active, paused, error, removed)
  created_at: timestamptz
  updated_at: timestamptz

podcast_episodes:
  id: uuid
  show_id: FK -> podcast_shows.id
  guid: string (from RSS, unique per show)
  title: string
  description: text
  published_at: timestamptz
  duration_seconds: int
  audio_url: string (original source)
  audio_cached_path: string (object storage, nullable)
  audio_format: string (mp3, m4a, opus, etc.)
  audio_size_bytes: bigint
  season_number: int (nullable)
  episode_number: int (nullable)
  explicit: boolean
  transcript_url: string (nullable)
  chapters: jsonb (nullable, podcast namespace chapters)
  created_at: timestamptz

podcast_subscriptions:
  id: uuid
  user_id: FK -> users.id
  show_id: FK -> podcast_shows.id
  subscribed_at: timestamptz
  notifications_enabled: boolean (default: true)

podcast_progress:
  id: uuid
  user_id: FK -> users.id
  episode_id: FK -> podcast_episodes.id
  position_seconds: int
  completed: boolean
  updated_at: timestamptz
```

### Object Storage Layout

```
/{env}/{family_id}/podcasts/audio/{show_id}/{episode_id}.{ext}
/{env}/{family_id}/podcasts/artwork/{show_id}/cover.jpg
/{env}/{family_id}/podcasts/artwork/{show_id}/cover_thumb.jpg
/{env}/{family_id}/podcasts/transcripts/{show_id}/{episode_id}.vtt
```

## Feed Ingest Pipeline

### Feed Discovery

- User adds podcast by:
  - pasting RSS feed URL directly
  - searching by name (via iTunes Search API or Podcast Index API)
  - importing OPML file (bulk subscription import)

### Feed Parsing

1. Fetch RSS/Atom feed content
2. Parse with robust XML parser (handle malformed feeds gracefully)
3. Extract show metadata: title, author, description, artwork, categories
4. Extract episodes: title, description, date, duration, enclosure URL, GUID
5. Detect podcast namespace extensions (chapters, transcripts, funding)
6. Normalize all timestamps to UTC

### Refresh Schedule

| Show Status | Refresh Interval |
| --- | --- |
| Active (new episodes in last 30 days) | every 60 minutes |
| Dormant (no new episodes in 30-90 days) | every 6 hours |
| Inactive (no new episodes in 90+ days) | daily |
| Paused (user-paused) | no refresh |
| Error (3+ consecutive failures) | daily retry, alert after 7 days |

### Audio Caching Strategy

- Default: stream episodes on demand from source URL
- Optional: cache episodes to object storage for reliability and faster serving
- Caching triggered by:
  - user plays episode (cache after first play)
  - user explicitly downloads for offline
  - admin enables "cache all" per show
- Cached audio served through CDN with signed URLs (same model as video)

## Playback UX

### Audio Player

- persistent mini-player bar (visible while browsing other content)
- expand to full-screen player with artwork, progress, controls
- background playback support (mobile: background audio service, desktop: system tray)

### Playback Controls

| Control | Behavior |
| --- | --- |
| Play/Pause | toggle playback |
| Skip Forward | +30 seconds (configurable) |
| Skip Back | -15 seconds (configurable) |
| Speed | 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x, 2.5x, 3x |
| Sleep Timer | 15m, 30m, 45m, 60m, end of episode |
| Chapter Skip | next/previous chapter (if chapter data available) |

### Progress Tracking

- position saved every 15 seconds during playback
- synced to backend for cross-device continuity
- episode marked "completed" when 95% played
- "mark as played" / "mark as unplayed" manual overrides

### Queue and Playlist

- "Up Next" queue: manually ordered list of episodes to play
- auto-add: optionally add new episodes from subscribed shows to queue
- queue ordering: newest first, oldest first, or manual
- clear queue / remove individual episodes

## Podcast Discovery and Catalog

### Browse Views

- **Subscriptions**: shows the user follows, sorted by most recent episode
- **New Episodes**: reverse-chronological feed of unplayed episodes from subscribed shows
- **Browse Categories**: arts, business, comedy, education, health, news, religion, science, sports, technology, etc.
- **Search**: full-text search across show titles, episode titles, descriptions

### Show Detail Page

- artwork, title, author, description
- episode list (paginated, filterable by season if applicable)
- subscribe/unsubscribe toggle
- "play latest" button
- notification settings per show

### Episode Detail

- title, description, published date, duration
- play button with resume support
- download for offline button
- chapter list (if available)
- transcript viewer (if available)

## Offline Support

### Download for Offline

- download individual episodes or batch-download
- download queue with priority ordering
- auto-download: optionally auto-download newest N episodes per show
- storage quota: configurable limit (default: 2 GB mobile, 10 GB desktop/STB)
- LRU eviction of completed downloaded episodes when quota exceeded

### Offline Playback

- downloaded episodes playable without network
- progress syncs when network restored
- show metadata cached locally for offline browsing

## Platform-Specific Notes

### Mobile

- background audio service (iOS: AVAudioSession, Android: foreground service)
- lock screen controls and notification media controls
- CarPlay / Android Auto integration (future consideration)

### TV / STB / nTV OS

- audio plays over HDMI audio output
- show artwork displayed full-screen during playback
- remote-friendly navigation (D-pad through episodes and controls)

### Web

- standard HTML5 audio element
- media session API for browser media key support
- tab continues playing when navigated away

## Notifications

- new episode alert: push notification when subscribed show publishes
- configurable per show (enable/disable)
- configurable global quiet hours
- delivery via: push (mobile), in-app badge (TV/web/desktop)
