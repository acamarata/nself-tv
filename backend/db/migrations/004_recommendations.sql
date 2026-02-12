-- Migration: 004_recommendations
-- Description: Add recommendation engine tables for personalized discovery
-- Author: AI Planning Agent
-- Date: 2026-02-11

-- User Interactions Table
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Interaction Type
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN (
    'view', 'play', 'complete', 'rate', 'add_to_playlist',
    'search', 'click', 'share', 'download'
  )),

  -- Interaction Data (JSON for flexibility)
  interaction_data JSONB,

  -- Metadata
  device_type VARCHAR(50), -- 'web', 'mobile', 'tv', 'desktop'
  session_id VARCHAR(255),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_user_interactions_family ON user_interactions(family_id);
CREATE INDEX idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_interactions_media ON user_interactions(media_item_id, created_at DESC);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_created ON user_interactions(created_at DESC);

-- Partitioning by month (optional, for large datasets)
-- CREATE TABLE user_interactions_y2026m02 PARTITION OF user_interactions
--   FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Content Recommendations Table
CREATE TABLE IF NOT EXISTS content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Recommendation Score (0-1, higher = more relevant)
  score DECIMAL(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),

  -- Recommendation Reason
  reason VARCHAR(255), -- 'similar_to', 'popular_in_genre', 'trending', 'because_you_watched', 'top_rated'
  reason_media_id UUID REFERENCES media_items(id), -- The media that triggered this recommendation

  -- Metadata
  algorithm_version VARCHAR(50) DEFAULT 'v1.0',

  -- Expiration
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Feedback (did user interact with recommendation?)
  was_clicked BOOLEAN DEFAULT FALSE,
  was_watched BOOLEAN DEFAULT FALSE,
  feedback_score INT CHECK (feedback_score BETWEEN 1 AND 5)
);

-- Indexes for Performance
CREATE INDEX idx_recommendations_user ON content_recommendations(user_id, score DESC);
CREATE INDEX idx_recommendations_media ON content_recommendations(media_item_id);
CREATE INDEX idx_recommendations_expires ON content_recommendations(expires_at);
CREATE INDEX idx_recommendations_score ON content_recommendations(score DESC);
CREATE UNIQUE INDEX idx_recommendations_unique ON content_recommendations(user_id, media_item_id, generated_at);

-- User Preferences Table (for explicit preferences)
CREATE TABLE IF NOT EXISTS user_content_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Genre Preferences (JSON array with weights)
  preferred_genres JSONB, -- {"action": 0.9, "comedy": 0.7, "horror": 0.1}
  disliked_genres VARCHAR(100)[],

  -- Actor/Director Preferences
  favorite_actors UUID[], -- References cast/crew table
  favorite_directors UUID[],

  -- Content Type Preferences
  preferred_content_types VARCHAR(50)[], -- ['movie', 'tv_show', 'documentary']

  -- Rating Preferences
  min_rating DECIMAL(3,1) DEFAULT 0.0,
  prefer_highly_rated BOOLEAN DEFAULT TRUE,

  -- Explicit Dislikes
  blocked_media_ids UUID[], -- Media to never recommend

  -- Auto-updated from interactions
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_user_content_preferences_user ON user_content_preferences(user_id);

-- Trending Content Table
CREATE TABLE IF NOT EXISTS trending_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Trending Score (calculated from recent interactions)
  trending_score DECIMAL(10,2) NOT NULL,

  -- Time Window
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  -- Statistics
  view_count INT DEFAULT 0,
  play_count INT DEFAULT 0,
  complete_count INT DEFAULT 0,
  unique_users INT DEFAULT 0,

  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day')
);

-- Indexes
CREATE INDEX idx_trending_content_media ON trending_content(media_item_id);
CREATE INDEX idx_trending_content_score ON trending_content(trending_score DESC);
CREATE INDEX idx_trending_content_expires ON trending_content(expires_at);
CREATE UNIQUE INDEX idx_trending_content_unique ON trending_content(media_item_id, window_start);

-- Auto-Expire Old Recommendations
CREATE OR REPLACE FUNCTION delete_expired_recommendations()
RETURNS void AS $$
BEGIN
  DELETE FROM content_recommendations
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Scheduled Job (via jobs plugin or cron)
-- SELECT delete_expired_recommendations(); -- Run daily

-- Calculate User Preferences from Interactions
CREATE OR REPLACE FUNCTION calculate_user_preferences(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_genre_counts JSONB;
BEGIN
  -- Calculate genre preferences based on highly-rated and completed content
  WITH genre_stats AS (
    SELECT
      genre,
      COUNT(*) AS count,
      AVG(ur.rating) AS avg_rating
    FROM user_interactions ui
    JOIN media_items mi ON ui.media_item_id = mi.id
    CROSS JOIN UNNEST(mi.genres) AS genre
    LEFT JOIN user_ratings ur ON ui.media_item_id = ur.media_item_id AND ui.user_id = ur.user_id
    WHERE ui.user_id = p_user_id
      AND ui.interaction_type IN ('complete', 'rate')
    GROUP BY genre
  )
  SELECT jsonb_object_agg(
    genre,
    LEAST(1.0, (count::DECIMAL / 10) * (COALESCE(avg_rating, 5.0) / 10))
  )
  INTO v_genre_counts
  FROM genre_stats;

  -- Upsert user preferences
  INSERT INTO user_content_preferences (user_id, preferred_genres, last_updated_at)
  VALUES (p_user_id, v_genre_counts, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    preferred_genres = EXCLUDED.preferred_genres,
    last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Calculate Trending Content
CREATE OR REPLACE FUNCTION calculate_trending_content(p_window_hours INT DEFAULT 24)
RETURNS void AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  v_window_end := NOW();
  v_window_start := v_window_end - (p_window_hours || ' hours')::INTERVAL;

  -- Delete old trending data
  DELETE FROM trending_content WHERE expires_at < NOW();

  -- Calculate new trending scores
  INSERT INTO trending_content (
    media_item_id,
    trending_score,
    window_start,
    window_end,
    view_count,
    play_count,
    complete_count,
    unique_users,
    expires_at
  )
  SELECT
    media_item_id,
    -- Trending score formula: (plays * 2 + completes * 5 + unique_users * 3) / hours_since_release
    ((play_count * 2 + complete_count * 5 + unique_users * 3)::DECIMAL /
      GREATEST(1, EXTRACT(EPOCH FROM (NOW() - mi.created_at)) / 3600)) AS trending_score,
    v_window_start,
    v_window_end,
    view_count,
    play_count,
    complete_count,
    unique_users,
    NOW() + INTERVAL '1 day' AS expires_at
  FROM (
    SELECT
      media_item_id,
      COUNT(*) FILTER (WHERE interaction_type = 'view') AS view_count,
      COUNT(*) FILTER (WHERE interaction_type = 'play') AS play_count,
      COUNT(*) FILTER (WHERE interaction_type = 'complete') AS complete_count,
      COUNT(DISTINCT user_id) AS unique_users
    FROM user_interactions
    WHERE created_at >= v_window_start
      AND created_at <= v_window_end
    GROUP BY media_item_id
  ) stats
  JOIN media_items mi ON stats.media_item_id = mi.id
  ON CONFLICT (media_item_id, window_start)
  DO UPDATE SET
    trending_score = EXCLUDED.trending_score,
    view_count = EXCLUDED.view_count,
    play_count = EXCLUDED.play_count,
    complete_count = EXCLUDED.complete_count,
    unique_users = EXCLUDED.unique_users,
    calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Views

-- User Activity Summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  user_id,
  COUNT(*) AS total_interactions,
  COUNT(*) FILTER (WHERE interaction_type = 'view') AS view_count,
  COUNT(*) FILTER (WHERE interaction_type = 'play') AS play_count,
  COUNT(*) FILTER (WHERE interaction_type = 'complete') AS complete_count,
  COUNT(DISTINCT media_item_id) AS unique_media_count,
  MAX(created_at) AS last_interaction_at
FROM user_interactions
GROUP BY user_id;

-- Popular Content (by unique users)
CREATE OR REPLACE VIEW popular_content AS
SELECT
  mi.id,
  mi.title,
  mi.content_type,
  mi.poster_url,
  COUNT(DISTINCT ui.user_id) AS unique_viewers,
  COUNT(*) FILTER (WHERE ui.interaction_type = 'complete') AS completion_count,
  AVG(ur.rating)::DECIMAL(3,1) AS average_rating
FROM media_items mi
JOIN user_interactions ui ON mi.id = ui.media_item_id
LEFT JOIN user_ratings ur ON mi.id = ur.media_item_id
WHERE ui.created_at >= NOW() - INTERVAL '30 days'
GROUP BY mi.id, mi.title, mi.content_type, mi.poster_url
ORDER BY unique_viewers DESC, completion_count DESC;

-- Recommendations with Media Details
CREATE OR REPLACE VIEW user_recommendations_detailed AS
SELECT
  cr.*,
  mi.title,
  mi.content_type,
  mi.poster_url,
  mi.backdrop_url,
  mi.genres,
  mi.user_rating,
  rm.title AS reason_media_title
FROM content_recommendations cr
JOIN media_items mi ON cr.media_item_id = mi.id
LEFT JOIN media_items rm ON cr.reason_media_id = rm.id
WHERE cr.expires_at > NOW()
ORDER BY cr.user_id, cr.score DESC;

-- Comments
COMMENT ON TABLE user_interactions IS 'Tracks all user interactions with media for recommendation engine';
COMMENT ON COLUMN user_interactions.interaction_type IS 'Type of interaction: view, play, complete, rate, etc.';
COMMENT ON COLUMN user_interactions.interaction_data IS 'Additional JSON data specific to interaction type';

COMMENT ON TABLE content_recommendations IS 'Generated content recommendations for users';
COMMENT ON COLUMN content_recommendations.score IS 'Recommendation score 0-1, higher = more relevant';
COMMENT ON COLUMN content_recommendations.reason IS 'Why this was recommended (e.g., "similar_to", "trending")';
COMMENT ON COLUMN content_recommendations.expires_at IS 'When recommendation should be regenerated';

COMMENT ON TABLE user_content_preferences IS 'Explicit and derived user preferences for content';
COMMENT ON TABLE trending_content IS 'Cached trending content calculations updated periodically';

-- Rollback Script
-- DROP VIEW IF EXISTS user_activity_summary;
-- DROP VIEW IF EXISTS popular_content;
-- DROP VIEW IF EXISTS user_recommendations_detailed;
-- DROP FUNCTION IF EXISTS delete_expired_recommendations();
-- DROP FUNCTION IF EXISTS calculate_user_preferences(UUID);
-- DROP FUNCTION IF EXISTS calculate_trending_content(INT);
-- DROP TABLE IF EXISTS trending_content;
-- DROP TABLE IF EXISTS user_content_preferences;
-- DROP TABLE IF EXISTS content_recommendations;
-- DROP TABLE IF EXISTS user_interactions;
