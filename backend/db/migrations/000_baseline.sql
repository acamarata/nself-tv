-- Migration: 000_baseline
-- Description: Core tables for nself-tv media platform
-- Creates: families, users, profiles, media_items, media_variants, device_registrations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- FAMILIES
-- ============================================================
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID,  -- set after users table exists
  max_profiles INT NOT NULL DEFAULT 10,
  max_concurrent_streams INT NOT NULL DEFAULT 10,
  storage_quota_gb INT NOT NULL DEFAULT 500,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_families_slug ON families(slug);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'adult_member'
    CHECK (role IN ('owner', 'admin', 'adult_member', 'youth_member', 'child_member', 'device')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  auth_provider VARCHAR(50) DEFAULT 'local',
  auth_provider_id VARCHAR(255),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_family ON users(family_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Set owner_id FK on families now that users exists
ALTER TABLE families ADD CONSTRAINT fk_families_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  content_rating_limit VARCHAR(20) NOT NULL DEFAULT 'TV-MA'
    CHECK (content_rating_limit IN ('TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA')),
  pin_hash VARCHAR(255),
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  subtitle_language VARCHAR(10) DEFAULT 'en',
  audio_language VARCHAR(10) DEFAULT 'en',
  autoplay_next BOOLEAN NOT NULL DEFAULT true,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_profiles_family ON profiles(family_id);

-- ============================================================
-- DEVICE REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL DEFAULT 'unknown'
    CHECK (device_type IN ('web', 'mobile', 'tablet', 'tv', 'desktop', 'stb', 'unknown')),
  platform VARCHAR(100),
  user_agent TEXT,
  ip_address INET,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  capabilities JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_family ON device_registrations(family_id);
CREATE INDEX idx_devices_user ON device_registrations(user_id);

-- ============================================================
-- MEDIA ITEMS (the core catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- Content classification
  type VARCHAR(50) NOT NULL DEFAULT 'movie'
    CHECK (type IN ('movie', 'tv_show', 'episode', 'music', 'podcast', 'game', 'live_event')),

  -- Basic metadata
  title VARCHAR(500) NOT NULL,
  original_title VARCHAR(500),
  slug VARCHAR(500),
  overview TEXT,
  tagline VARCHAR(500),

  -- Media info
  year INT,
  release_date DATE,
  runtime_minutes INT,
  content_rating VARCHAR(20) DEFAULT 'TV-MA',

  -- Categorization
  genres TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- External IDs
  tmdb_id INT,
  imdb_id VARCHAR(20),
  tvdb_id INT,

  -- TV Show specific
  parent_id UUID REFERENCES media_items(id) ON DELETE CASCADE,  -- episode -> show
  season_number INT,
  episode_number INT,

  -- Ratings
  community_rating DECIMAL(3,1),
  vote_count INT DEFAULT 0,
  user_rating DECIMAL(3,1),
  user_rating_count INT DEFAULT 0,

  -- Duration (synced with runtime_minutes via trigger in 008)
  duration_seconds INT,

  -- Cast/Crew (stored as JSONB for flexibility)
  credits JSONB DEFAULT '[]',

  -- Media files
  poster_url TEXT,
  backdrop_url TEXT,
  thumbnail_url TEXT,

  -- Processing status
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'error', 'archived')),

  -- Storage
  source_path TEXT,
  hls_master_url TEXT,
  trickplay_url TEXT,

  -- Metrics
  view_count INT NOT NULL DEFAULT 0,

  -- Timestamps
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_items_family ON media_items(family_id);
CREATE INDEX idx_media_items_type ON media_items(type);
CREATE INDEX idx_media_items_status ON media_items(status);
CREATE INDEX idx_media_items_title ON media_items(title);
CREATE INDEX idx_media_items_parent ON media_items(parent_id);
CREATE INDEX idx_media_items_tmdb ON media_items(tmdb_id);
CREATE INDEX idx_media_items_genres ON media_items USING GIN(genres);
CREATE INDEX idx_media_items_tags ON media_items USING GIN(tags);
CREATE INDEX idx_media_items_added ON media_items(added_at DESC);

-- Full text search vector
ALTER TABLE media_items ADD COLUMN search_vector tsvector;

CREATE INDEX idx_media_items_search ON media_items USING GIN(search_vector);

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_media_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.original_title, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.overview, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.genres, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_media_items_search_vector
  BEFORE INSERT OR UPDATE OF title, original_title, overview, genres
  ON media_items
  FOR EACH ROW
  EXECUTE FUNCTION update_media_search_vector();

-- ============================================================
-- MEDIA VARIANTS (renditions / quality levels)
-- ============================================================
CREATE TABLE IF NOT EXISTS media_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Quality info
  rendition VARCHAR(20) NOT NULL,  -- r240, r360, r480, r720, r1080, r2160, r4320
  quality_tier VARCHAR(20) NOT NULL
    CHECK (quality_tier IN ('LD', 'SD', 'HD', 'FHD', 'UHD', 'UHD8K')),
  width INT NOT NULL,
  height INT NOT NULL,
  bitrate_kbps INT,

  -- Codec info
  video_codec VARCHAR(50) DEFAULT 'h264',
  audio_codec VARCHAR(50) DEFAULT 'aac',
  audio_bitrate_kbps INT,

  -- Storage
  hls_playlist_url TEXT NOT NULL,
  segment_count INT,
  total_size_bytes BIGINT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_variants_item ON media_variants(media_item_id);
CREATE INDEX idx_media_variants_rendition ON media_variants(rendition);

-- ============================================================
-- SUBTITLE TRACKS
-- ============================================================
CREATE TABLE IF NOT EXISTS subtitle_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  label VARCHAR(100),
  format VARCHAR(20) NOT NULL DEFAULT 'webvtt',
  url TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_forced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subtitles_item ON subtitle_tracks(media_item_id);

-- ============================================================
-- AUDIO TRACKS
-- ============================================================
CREATE TABLE IF NOT EXISTS audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  label VARCHAR(100),
  codec VARCHAR(50) NOT NULL DEFAULT 'aac',
  channels INT NOT NULL DEFAULT 2,
  bitrate_kbps INT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audio_tracks_item ON audio_tracks(media_item_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_families_updated_at BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_devices_updated_at BEFORE UPDATE ON device_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_media_items_updated_at BEFORE UPDATE ON media_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA (development only)
-- ============================================================
-- Default family
INSERT INTO families (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Family', 'demo-family')
ON CONFLICT DO NOTHING;

-- Default users (passwords handled by nhost-auth, these are app-level records)
INSERT INTO users (id, family_id, email, display_name, role) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'owner@nself.org', 'Owner', 'owner'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'admin@nself.org', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'helper@nself.org', 'Helper', 'adult_member'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'user@nself.org', 'User', 'adult_member')
ON CONFLICT DO NOTHING;

-- Set family owner
UPDATE families SET owner_id = '00000000-0000-0000-0000-000000000010' WHERE id = '00000000-0000-0000-0000-000000000001';

-- Default profiles
INSERT INTO profiles (id, user_id, family_id, name, is_default, content_rating_limit) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Owner', true, 'TV-MA'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Admin', true, 'TV-MA'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Helper', true, 'TV-14'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'User', true, 'TV-14')
ON CONFLICT DO NOTHING;
