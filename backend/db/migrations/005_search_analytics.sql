-- Migration: 005_search_analytics
-- Description: Search analytics for tracking queries and click-through

CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Search Data
  query TEXT NOT NULL,
  results_count INT NOT NULL DEFAULT 0,
  filters JSONB DEFAULT '{}',

  -- Click-through Tracking
  clicked_result_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  clicked_position INT,

  -- Context
  source VARCHAR(50) DEFAULT 'search_bar'
    CHECK (source IN ('search_bar', 'voice', 'suggestion', 'browse', 'api')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_analytics_family ON search_analytics(family_id);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_query ON search_analytics(query);
CREATE INDEX idx_search_analytics_created ON search_analytics(created_at DESC);
CREATE INDEX idx_search_analytics_clicked ON search_analytics(clicked_result_id) WHERE clicked_result_id IS NOT NULL;
