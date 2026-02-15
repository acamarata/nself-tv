-- Migration: 008_add_missing_media_columns
-- Description: Add duration sync trigger and ensure columns exist
-- NOTE: columns now defined in 000_baseline.sql; ADD COLUMN IF NOT EXISTS is kept for safety

ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS duration_seconds INT,
  ADD COLUMN IF NOT EXISTS user_rating DECIMAL(3,1),
  ADD COLUMN IF NOT EXISTS user_rating_count INT DEFAULT 0;

-- Create computed column trigger to sync runtime_minutes <-> duration_seconds
CREATE OR REPLACE FUNCTION sync_media_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- If duration_seconds changed, update runtime_minutes
  IF NEW.duration_seconds IS NOT NULL AND (OLD.duration_seconds IS NULL OR NEW.duration_seconds != OLD.duration_seconds) THEN
    NEW.runtime_minutes := ROUND(NEW.duration_seconds / 60.0);
  END IF;

  -- If runtime_minutes changed but duration_seconds didn't, update duration_seconds
  IF NEW.runtime_minutes IS NOT NULL AND NEW.duration_seconds IS NULL THEN
    NEW.duration_seconds := NEW.runtime_minutes * 60;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_media_duration ON media_items;
CREATE TRIGGER trg_sync_media_duration
  BEFORE INSERT OR UPDATE OF runtime_minutes, duration_seconds ON media_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_media_duration();

-- Backfill duration_seconds from existing runtime_minutes
UPDATE media_items
SET duration_seconds = runtime_minutes * 60
WHERE runtime_minutes IS NOT NULL AND duration_seconds IS NULL;

COMMENT ON COLUMN media_items.duration_seconds IS 'Duration in seconds (synced with runtime_minutes)';
COMMENT ON COLUMN media_items.user_rating IS 'Average user rating 0-10 (calculated from user_ratings table)';
COMMENT ON COLUMN media_items.user_rating_count IS 'Number of user ratings';
