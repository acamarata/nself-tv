-- Migration: 002_playlists
-- Description: Add playlists and collections tables
-- Author: AI Planning Agent
-- Date: 2026-02-11

-- Playlists Table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Playlist Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Visibility
  is_public BOOLEAN DEFAULT FALSE,
  shared_with_users UUID[], -- Array of user IDs with access

  -- Smart Playlist
  is_smart BOOLEAN DEFAULT FALSE,
  smart_rules JSONB, -- JSON rules for automatic inclusion

  -- Statistics
  item_count INT DEFAULT 0,
  total_duration_seconds INT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Playlist Items Table
CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Position in Playlist
  position INT NOT NULL CHECK (position >= 0),

  -- Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Indexes for Performance
CREATE INDEX idx_playlists_family ON playlists(family_id);
CREATE INDEX idx_playlists_owner ON playlists(owner_id);
CREATE INDEX idx_playlists_public ON playlists(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_playlists_smart ON playlists(is_smart) WHERE is_smart = TRUE;

CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id, position);
CREATE INDEX idx_playlist_items_media ON playlist_items(media_item_id);
CREATE INDEX idx_playlist_items_added_by ON playlist_items(added_by);
CREATE UNIQUE INDEX idx_playlist_items_unique_position ON playlist_items(playlist_id, position);

-- Prevent Duplicate Media in Same Playlist (optional, can be removed if duplicates allowed)
-- CREATE UNIQUE INDEX idx_playlist_items_unique_media ON playlist_items(playlist_id, media_item_id);

-- Updated At Trigger for Playlists
CREATE OR REPLACE FUNCTION update_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_playlists_updated_at();

-- Update Playlist Statistics on Item Add/Remove
CREATE OR REPLACE FUNCTION update_playlist_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_item_count INT;
  v_total_duration INT;
BEGIN
  -- Calculate new statistics
  SELECT
    COUNT(*),
    COALESCE(SUM(mi.duration_seconds), 0)
  INTO v_item_count, v_total_duration
  FROM playlist_items pi
  JOIN media_items mi ON pi.media_item_id = mi.id
  WHERE pi.playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id);

  -- Update playlist
  UPDATE playlists
  SET
    item_count = v_item_count,
    total_duration_seconds = v_total_duration,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.playlist_id, OLD.playlist_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_playlist_items_stats_insert
  AFTER INSERT ON playlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_stats();

CREATE TRIGGER trg_playlist_items_stats_delete
  AFTER DELETE ON playlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_stats();

-- Auto-Reorder Positions on Delete
CREATE OR REPLACE FUNCTION reorder_playlist_positions()
RETURNS TRIGGER AS $$
BEGIN
  -- Shift all positions down after deleted item
  UPDATE playlist_items
  SET position = position - 1
  WHERE playlist_id = OLD.playlist_id
    AND position > OLD.position;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reorder_playlist_positions
  AFTER DELETE ON playlist_items
  FOR EACH ROW
  EXECUTE FUNCTION reorder_playlist_positions();

-- Playlist Views

-- User Playlists View
CREATE OR REPLACE VIEW user_playlists AS
SELECT
  p.*,
  u.display_name AS owner_name,
  u.email AS owner_email,
  f.name AS family_name
FROM playlists p
JOIN users u ON p.owner_id = u.id
JOIN families f ON p.family_id = f.id;

-- Playlist Items View with Media Details
CREATE OR REPLACE VIEW playlist_items_detailed AS
SELECT
  pi.*,
  p.name AS playlist_name,
  p.owner_id AS playlist_owner_id,
  mi.title AS media_title,
  mi.content_type,
  mi.duration_seconds AS media_duration,
  mi.poster_url,
  u.display_name AS added_by_name
FROM playlist_items pi
JOIN playlists p ON pi.playlist_id = p.id
JOIN media_items mi ON pi.media_item_id = mi.id
LEFT JOIN users u ON pi.added_by = u.id
ORDER BY pi.playlist_id, pi.position;

-- Comments
COMMENT ON TABLE playlists IS 'User-created playlists and collections';
COMMENT ON COLUMN playlists.is_smart IS 'If true, playlist auto-populates based on smart_rules';
COMMENT ON COLUMN playlists.smart_rules IS 'JSON rules for smart playlists (e.g., {genre: "action", min_rating: 8.0})';
COMMENT ON COLUMN playlists.shared_with_users IS 'Array of user UUIDs who have access to this playlist';

COMMENT ON TABLE playlist_items IS 'Items within playlists with position ordering';
COMMENT ON COLUMN playlist_items.position IS 'Position in playlist (0-indexed)';

-- Rollback Script
-- DROP TRIGGER IF EXISTS trg_playlists_updated_at ON playlists;
-- DROP TRIGGER IF EXISTS trg_playlist_items_stats_insert ON playlist_items;
-- DROP TRIGGER IF EXISTS trg_playlist_items_stats_delete ON playlist_items;
-- DROP TRIGGER IF EXISTS trg_reorder_playlist_positions ON playlist_items;
-- DROP FUNCTION IF EXISTS update_playlists_updated_at();
-- DROP FUNCTION IF EXISTS update_playlist_stats();
-- DROP FUNCTION IF EXISTS reorder_playlist_positions();
-- DROP VIEW IF EXISTS user_playlists;
-- DROP VIEW IF EXISTS playlist_items_detailed;
-- DROP TABLE IF EXISTS playlist_items;
-- DROP TABLE IF EXISTS playlists;
