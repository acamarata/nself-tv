-- Migration: 001_watch_progress
-- Description: Add watch progress tracking tables for resume functionality
-- Author: AI Planning Agent
-- Date: 2026-02-11

-- Watch Progress Table
CREATE TABLE IF NOT EXISTS watch_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Progress Tracking
  position_seconds INT NOT NULL CHECK (position_seconds >= 0),
  duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN duration_seconds > 0
    THEN (position_seconds::DECIMAL / duration_seconds) * 100
    ELSE 0 END
  ) STORED,

  -- Completion Status
  completed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id UUID REFERENCES device_registrations(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_watch_progress_user ON watch_progress(user_id, last_watched_at DESC);
CREATE INDEX idx_watch_progress_family ON watch_progress(family_id, last_watched_at DESC);
CREATE INDEX idx_watch_progress_media ON watch_progress(media_item_id);
CREATE INDEX idx_watch_progress_completed ON watch_progress(completed);
CREATE UNIQUE INDEX idx_watch_progress_user_media ON watch_progress(user_id, media_item_id);

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_watch_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_watch_progress_updated_at
  BEFORE UPDATE ON watch_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_watch_progress_updated_at();

-- Auto-Complete Trigger (mark as completed when > 90%)
CREATE OR REPLACE FUNCTION auto_complete_watch_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.percentage >= 90.0 AND OLD.completed = FALSE THEN
    NEW.completed = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_complete_watch_progress
  BEFORE UPDATE ON watch_progress
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_watch_progress();

-- Continue Watching View (most recently watched, incomplete)
CREATE OR REPLACE VIEW continue_watching AS
SELECT
  wp.*,
  mi.title AS media_title,
  mi.content_type,
  mi.poster_url,
  mi.backdrop_url,
  f.name AS family_name,
  u.display_name AS user_name
FROM watch_progress wp
JOIN media_items mi ON wp.media_item_id = mi.id
JOIN families f ON wp.family_id = f.id
JOIN users u ON wp.user_id = u.id
WHERE wp.completed = FALSE
  AND wp.percentage > 5.0 -- Started watching (more than 5%)
  AND wp.percentage < 90.0 -- Not yet completed
ORDER BY wp.last_watched_at DESC;

-- Comments
COMMENT ON TABLE watch_progress IS 'Tracks user watch progress for resume functionality across all devices';
COMMENT ON COLUMN watch_progress.position_seconds IS 'Current playback position in seconds';
COMMENT ON COLUMN watch_progress.duration_seconds IS 'Total duration of media in seconds';
COMMENT ON COLUMN watch_progress.percentage IS 'Computed percentage (0-100) of content watched';
COMMENT ON COLUMN watch_progress.completed IS 'Auto-set to true when percentage >= 90%';
COMMENT ON COLUMN watch_progress.device_id IS 'Last device used for watching (nullable)';

-- Rollback Script
-- DROP TRIGGER IF EXISTS trg_watch_progress_updated_at ON watch_progress;
-- DROP TRIGGER IF EXISTS trg_auto_complete_watch_progress ON watch_progress;
-- DROP FUNCTION IF EXISTS update_watch_progress_updated_at();
-- DROP FUNCTION IF EXISTS auto_complete_watch_progress();
-- DROP VIEW IF EXISTS continue_watching;
-- DROP TABLE IF EXISTS watch_progress;
