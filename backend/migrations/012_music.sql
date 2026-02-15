-- Migration: 012_music
-- Description: Complete music schema — artists, albums, tracks, playlists, and progress tracking.

-- ============================================================
-- MUSIC ARTISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS music_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_name TEXT,                      -- "Beatles, The" for alphabetical
  musicbrainz_id TEXT,
  biography TEXT,
  artwork_url TEXT,
  genres TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, name)
);

CREATE INDEX idx_music_artists_family ON music_artists(family_id);
CREATE INDEX idx_music_artists_name ON music_artists(name);
CREATE INDEX idx_music_artists_mbid ON music_artists(musicbrainz_id);

-- ============================================================
-- MUSIC ALBUMS
-- ============================================================
CREATE TABLE IF NOT EXISTS music_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES music_artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  album_type TEXT DEFAULT 'album'
    CHECK (album_type IN ('album', 'single', 'ep', 'compilation', 'live', 'soundtrack')),
  track_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  musicbrainz_id TEXT,
  cover_url TEXT,
  thumbnail_url TEXT,
  release_date DATE,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'ready'
    CHECK (status IN ('pending', 'downloading', 'ready', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, artist_id, title)
);

CREATE INDEX idx_music_albums_family ON music_albums(family_id);
CREATE INDEX idx_music_albums_artist ON music_albums(artist_id);
CREATE INDEX idx_music_albums_year ON music_albums(year DESC);

-- ============================================================
-- MUSIC TRACKS
-- ============================================================
CREATE TABLE IF NOT EXISTS music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES music_albums(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES music_artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  track_number INTEGER NOT NULL,
  disc_number INTEGER DEFAULT 1,
  duration_seconds INTEGER,
  file_path TEXT,                     -- Path in object storage
  file_size BIGINT,
  file_format TEXT DEFAULT 'mp3',     -- mp3, flac, ogg, aac, opus
  bitrate_kbps INTEGER,
  sample_rate INTEGER,
  musicbrainz_id TEXT,
  lyrics TEXT,
  explicit BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_music_tracks_album ON music_tracks(album_id, disc_number, track_number);
CREATE INDEX idx_music_tracks_artist ON music_tracks(artist_id);

-- ============================================================
-- MUSIC PLAYLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS music_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  track_count INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_music_playlists_user ON music_playlists(user_id);
CREATE INDEX idx_music_playlists_family ON music_playlists(family_id);

-- ============================================================
-- MUSIC PLAYLIST TRACKS (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS music_playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES music_playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(playlist_id, position)
);

CREATE INDEX idx_music_playlist_tracks_playlist ON music_playlist_tracks(playlist_id, position);

-- ============================================================
-- MUSIC PROGRESS (per-user listening progress)
-- ============================================================
CREATE TABLE IF NOT EXISTS music_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_music_progress_user ON music_progress(user_id, last_played_at DESC);

-- ============================================================
-- MUSIC SUBSCRIPTIONS (artist follow for new releases)
-- ============================================================
CREATE TABLE IF NOT EXISTS music_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES music_artists(id) ON DELETE CASCADE,
  auto_download BOOLEAN DEFAULT true,
  notify_new_releases BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, artist_id)
);

CREATE INDEX idx_music_subscriptions_user ON music_subscriptions(user_id);

-- ============================================================
-- Full text search on music
-- ============================================================
ALTER TABLE music_artists ADD COLUMN search_vector tsvector;
CREATE INDEX idx_music_artists_search ON music_artists USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_music_artist_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.biography, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.genres, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_music_artists_search_vector
  BEFORE INSERT OR UPDATE OF name, biography, genres
  ON music_artists
  FOR EACH ROW
  EXECUTE FUNCTION update_music_artist_search_vector();

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER trg_music_artists_updated_at BEFORE UPDATE ON music_artists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_music_albums_updated_at BEFORE UPDATE ON music_albums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_music_playlists_updated_at BEFORE UPDATE ON music_playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
