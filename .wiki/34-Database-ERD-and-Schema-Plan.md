# 34 - Database Schema and ER Diagram

## Objective

Provide one canonical ERD reference for all services and clients.

## ER Diagram (Canonical Draft)

```mermaid
erDiagram
  FAMILIES ||--o{ USERS : has
  USERS ||--o{ RELATIONSHIPS : links
  FAMILIES ||--o{ POSTS : owns
  POSTS ||--o{ POST_ASSETS : includes
  FAMILIES ||--o{ MEDIA_ITEMS : owns
  MEDIA_ITEMS ||--o{ MEDIA_VARIANTS : has
  FAMILIES ||--o{ LIVE_EVENTS : schedules
  LIVE_EVENTS ||--o{ EVENT_MARKERS : produces
  USERS ||--o{ STREAM_SESSIONS : opens
  MEDIA_ITEMS ||--o{ STREAM_SESSIONS : streams
  FAMILIES ||--o{ DEVICES : registers
  DEVICES ||--o{ DEVICE_HEARTBEATS : emits
  FAMILIES ||--o{ AUDIT_EVENTS : records
  USERS ||--o{ INHERITANCE_SCENARIOS : owns
  FAMILIES ||--|| TENANT_CONFIGS : configures
  FAMILIES ||--o{ PODCAST_SHOWS : subscribes
  PODCAST_SHOWS ||--o{ PODCAST_EPISODES : contains
  USERS ||--o{ PODCAST_SUBSCRIPTIONS : follows
  PODCAST_SUBSCRIPTIONS }o--|| PODCAST_SHOWS : targets
  USERS ||--o{ PODCAST_PROGRESS : tracks
  PODCAST_PROGRESS }o--|| PODCAST_EPISODES : references
  FAMILIES ||--o{ GAME_PLATFORMS : enables
  GAME_PLATFORMS ||--o{ GAME_TITLES : catalogs
  USERS ||--o{ GAME_SAVE_STATES : saves
  GAME_SAVE_STATES }o--|| GAME_TITLES : belongs_to
  USERS ||--o{ GAME_USER_LIBRARY : plays
  GAME_USER_LIBRARY }o--|| GAME_TITLES : references
```

## Table Contract Notes

- All family-scoped tables must include `family_id`.
- Critical mutable entities require `updated_at` and actor attribution.
- Soft-delete policy must be explicit per table.

## Migration Standards

- forward migration and rollback note required
- seed data isolated from schema migration
- avoid irreversible destructive ops without backup checkpoint
