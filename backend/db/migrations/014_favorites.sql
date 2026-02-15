-- Favorites Migration
-- Adds support for marking content as favorite (distinct from watchlist)

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT, -- Optional user notes about why they favorited
  UNIQUE(user_id, profile_id, content_id)
);

-- Indexes
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_profile_id ON favorites(profile_id);
CREATE INDEX idx_favorites_content_id ON favorites(content_id);
CREATE INDEX idx_favorites_added_at ON favorites(added_at DESC);

-- Favorite collections (custom groupings of favorites)
CREATE TABLE IF NOT EXISTS favorite_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- Emoji or icon identifier
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for collections
CREATE INDEX idx_favorite_collections_user_id ON favorite_collections(user_id);
CREATE INDEX idx_favorite_collections_profile_id ON favorite_collections(profile_id);

-- Collection items (many-to-many between favorites and collections)
CREATE TABLE IF NOT EXISTS favorite_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES favorite_collections(id) ON DELETE CASCADE,
  favorite_id UUID NOT NULL REFERENCES favorites(id) ON DELETE CASCADE,
  position INT, -- For custom ordering within collection
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, favorite_id)
);

-- Indexes for collection items
CREATE INDEX idx_favorite_collection_items_collection_id ON favorite_collection_items(collection_id);
CREATE INDEX idx_favorite_collection_items_favorite_id ON favorite_collection_items(favorite_id);

-- Updated_at trigger for collections
CREATE TRIGGER update_favorite_collections_updated_at
  BEFORE UPDATE ON favorite_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_favorite(
  p_user_id UUID,
  p_profile_id UUID,
  p_content_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if already favorited
  SELECT EXISTS(
    SELECT 1 FROM favorites
    WHERE user_id = p_user_id
      AND (profile_id = p_profile_id OR (profile_id IS NULL AND p_profile_id IS NULL))
      AND content_id = p_content_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove from favorites
    DELETE FROM favorites
    WHERE user_id = p_user_id
      AND (profile_id = p_profile_id OR (profile_id IS NULL AND p_profile_id IS NULL))
      AND content_id = p_content_id;
    RETURN FALSE;
  ELSE
    -- Add to favorites
    INSERT INTO favorites (user_id, profile_id, content_id, notes)
    VALUES (p_user_id, p_profile_id, p_content_id, p_notes)
    ON CONFLICT (user_id, profile_id, content_id) DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get favorite count by content
CREATE OR REPLACE FUNCTION get_favorite_count(p_content_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM favorites
    WHERE content_id = p_content_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if content is favorited by user
CREATE OR REPLACE FUNCTION is_favorited(
  p_user_id UUID,
  p_profile_id UUID,
  p_content_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM favorites
    WHERE user_id = p_user_id
      AND (profile_id = p_profile_id OR (profile_id IS NULL AND p_profile_id IS NULL))
      AND content_id = p_content_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's favorite genres (for better recommendations)
CREATE OR REPLACE FUNCTION get_favorite_genres(
  p_user_id UUID,
  p_profile_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  genre VARCHAR(50),
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    UNNEST(m.genres) AS genre,
    COUNT(*) AS count
  FROM favorites f
  JOIN media m ON m.id = f.content_id
  WHERE f.user_id = p_user_id
    AND (p_profile_id IS NULL OR f.profile_id = p_profile_id)
  GROUP BY genre
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- View for favorites with content details
CREATE OR REPLACE VIEW favorites_with_content AS
SELECT
  f.id,
  f.user_id,
  f.profile_id,
  f.content_id,
  f.added_at,
  f.notes,
  m.title,
  m.media_type,
  m.year,
  m.genres,
  m.rating,
  m.poster_url,
  m.backdrop_url,
  m.overview,
  -- Check if currently in watchlist
  EXISTS(
    SELECT 1 FROM watchlist w
    WHERE w.user_id = f.user_id
      AND w.content_id = f.content_id
  ) AS in_watchlist,
  -- Get watch progress
  (
    SELECT progress
    FROM watch_history wh
    WHERE wh.user_id = f.user_id
      AND wh.content_id = f.content_id
    ORDER BY wh.watched_at DESC
    LIMIT 1
  ) AS watch_progress
FROM favorites f
JOIN media m ON m.id = f.content_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON favorites TO hasura;
GRANT SELECT, INSERT, UPDATE, DELETE ON favorite_collections TO hasura;
GRANT SELECT, INSERT, UPDATE, DELETE ON favorite_collection_items TO hasura;
GRANT SELECT ON favorites_with_content TO hasura;

GRANT EXECUTE ON FUNCTION toggle_favorite TO hasura;
GRANT EXECUTE ON FUNCTION get_favorite_count TO hasura;
GRANT EXECUTE ON FUNCTION is_favorited TO hasura;
GRANT EXECUTE ON FUNCTION get_favorite_genres TO hasura;

-- Example usage:
-- Add/remove favorite:
--   SELECT toggle_favorite('user-uuid', 'profile-uuid', 'content-uuid', 'Classic film!');
--
-- Check if favorited:
--   SELECT is_favorited('user-uuid', 'profile-uuid', 'content-uuid');
--
-- Get favorite count:
--   SELECT get_favorite_count('content-uuid');
--
-- Get user's favorite genres:
--   SELECT * FROM get_favorite_genres('user-uuid', 'profile-uuid');
