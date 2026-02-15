-- Migration: 003_ratings_reviews
-- Description: Add user ratings and reviews tables
-- Author: AI Planning Agent
-- Date: 2026-02-11

-- User Ratings Table
CREATE TABLE IF NOT EXISTS user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Rating (0-10 scale, allows half-stars)
  rating DECIMAL(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),

  -- Review Text (optional)
  review TEXT,
  review_title VARCHAR(255),

  -- Spoilers
  contains_spoilers BOOLEAN DEFAULT FALSE,

  -- Helpful Votes
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_user_ratings_family ON user_ratings(family_id);
CREATE INDEX idx_user_ratings_user ON user_ratings(user_id);
CREATE INDEX idx_user_ratings_media ON user_ratings(media_item_id);
CREATE INDEX idx_user_ratings_rating ON user_ratings(rating);
CREATE INDEX idx_user_ratings_created ON user_ratings(created_at DESC);
CREATE UNIQUE INDEX idx_user_ratings_unique ON user_ratings(user_id, media_item_id);

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_user_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_ratings_updated_at
  BEFORE UPDATE ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ratings_updated_at();

-- Update Media Average Rating
CREATE OR REPLACE FUNCTION update_media_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating DECIMAL(3,1);
  v_rating_count INT;
BEGIN
  -- Calculate new average rating
  SELECT
    AVG(rating)::DECIMAL(3,1),
    COUNT(*)
  INTO v_avg_rating, v_rating_count
  FROM user_ratings
  WHERE media_item_id = COALESCE(NEW.media_item_id, OLD.media_item_id);

  -- Update media_items table (assumes these columns exist)
  UPDATE media_items
  SET
    user_rating = v_avg_rating,
    user_rating_count = v_rating_count,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.media_item_id, OLD.media_item_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_media_rating_insert
  AFTER INSERT ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_media_average_rating();

CREATE TRIGGER trg_update_media_rating_update
  AFTER UPDATE ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_media_average_rating();

CREATE TRIGGER trg_update_media_rating_delete
  AFTER DELETE ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_media_average_rating();

-- Helpful Votes Table
CREATE TABLE IF NOT EXISTS rating_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES user_ratings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Vote Type
  is_helpful BOOLEAN NOT NULL, -- TRUE = helpful, FALSE = not helpful

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rating_helpful_votes_rating ON rating_helpful_votes(rating_id);
CREATE INDEX idx_rating_helpful_votes_user ON rating_helpful_votes(user_id);
CREATE UNIQUE INDEX idx_rating_helpful_votes_unique ON rating_helpful_votes(rating_id, user_id);

-- Update Helpful Counts on Vote
CREATE OR REPLACE FUNCTION update_rating_helpful_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_helpful_count INT;
  v_not_helpful_count INT;
BEGIN
  -- Calculate new counts
  SELECT
    COUNT(*) FILTER (WHERE is_helpful = TRUE),
    COUNT(*) FILTER (WHERE is_helpful = FALSE)
  INTO v_helpful_count, v_not_helpful_count
  FROM rating_helpful_votes
  WHERE rating_id = COALESCE(NEW.rating_id, OLD.rating_id);

  -- Update user_ratings
  UPDATE user_ratings
  SET
    helpful_count = v_helpful_count,
    not_helpful_count = v_not_helpful_count,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.rating_id, OLD.rating_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_helpful_counts_insert
  AFTER INSERT ON rating_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_helpful_counts();

CREATE TRIGGER trg_update_helpful_counts_update
  AFTER UPDATE ON rating_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_helpful_counts();

CREATE TRIGGER trg_update_helpful_counts_delete
  AFTER DELETE ON rating_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_helpful_counts();

-- Views

-- Top Rated Content
CREATE OR REPLACE VIEW top_rated_content AS
SELECT
  mi.id,
  mi.title,
  mi.type,
  mi.poster_url,
  AVG(ur.rating)::DECIMAL(3,1) AS average_rating,
  COUNT(ur.id) AS rating_count,
  COUNT(ur.review) AS review_count
FROM media_items mi
JOIN user_ratings ur ON mi.id = ur.media_item_id
GROUP BY mi.id, mi.title, mi.type, mi.poster_url
HAVING COUNT(ur.id) >= 5 -- Minimum 5 ratings to appear in top rated
ORDER BY AVG(ur.rating) DESC, COUNT(ur.id) DESC;

-- Recent Reviews
CREATE OR REPLACE VIEW recent_reviews AS
SELECT
  ur.*,
  u.display_name AS user_name,
  u.avatar_url AS user_avatar,
  mi.title AS media_title,
  mi.type,
  mi.poster_url
FROM user_ratings ur
JOIN users u ON ur.user_id = u.id
JOIN media_items mi ON ur.media_item_id = mi.id
WHERE ur.review IS NOT NULL
ORDER BY ur.created_at DESC;

-- User Reviews with Helpful Ratio
CREATE OR REPLACE VIEW user_reviews_with_helpfulness AS
SELECT
  ur.*,
  u.display_name AS user_name,
  mi.title AS media_title,
  mi.type,
  CASE
    WHEN (ur.helpful_count + ur.not_helpful_count) > 0
    THEN (ur.helpful_count::DECIMAL / (ur.helpful_count + ur.not_helpful_count)) * 100
    ELSE 0
  END AS helpfulness_percentage
FROM user_ratings ur
JOIN users u ON ur.user_id = u.id
JOIN media_items mi ON ur.media_item_id = mi.id
WHERE ur.review IS NOT NULL;

-- Comments
COMMENT ON TABLE user_ratings IS 'User ratings and reviews for media content';
COMMENT ON COLUMN user_ratings.rating IS 'Rating on 0-10 scale (allows half-stars like 8.5)';
COMMENT ON COLUMN user_ratings.contains_spoilers IS 'TRUE if review contains spoilers';
COMMENT ON COLUMN user_ratings.helpful_count IS 'Number of users who found this review helpful';

COMMENT ON TABLE rating_helpful_votes IS 'Tracks which users found reviews helpful';

-- Rollback Script
-- DROP TRIGGER IF EXISTS trg_user_ratings_updated_at ON user_ratings;
-- DROP TRIGGER IF EXISTS trg_update_media_rating_insert ON user_ratings;
-- DROP TRIGGER IF EXISTS trg_update_media_rating_update ON user_ratings;
-- DROP TRIGGER IF EXISTS trg_update_media_rating_delete ON user_ratings;
-- DROP TRIGGER IF EXISTS trg_update_helpful_counts_insert ON rating_helpful_votes;
-- DROP TRIGGER IF EXISTS trg_update_helpful_counts_update ON rating_helpful_votes;
-- DROP TRIGGER IF EXISTS trg_update_helpful_counts_delete ON rating_helpful_votes;
-- DROP FUNCTION IF EXISTS update_user_ratings_updated_at();
-- DROP FUNCTION IF EXISTS update_media_average_rating();
-- DROP FUNCTION IF EXISTS update_rating_helpful_counts();
-- DROP VIEW IF EXISTS top_rated_content;
-- DROP VIEW IF EXISTS recent_reviews;
-- DROP VIEW IF EXISTS user_reviews_with_helpfulness;
-- DROP TABLE IF EXISTS rating_helpful_votes;
-- DROP TABLE IF EXISTS user_ratings;
