-- Phase 8 Task 01: Podcast Feed Ingestion
-- Creates tables for podcast shows, episodes, subscriptions, and progress tracking

CREATE TABLE podcast_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  artwork_url TEXT,
  language TEXT,
  explicit BOOLEAN DEFAULT false,
  categories TEXT[], -- Array of category strings
  last_build_date TIMESTAMPTZ,
  last_fetched_at TIMESTAMPTZ,
  fetch_status TEXT DEFAULT 'active', -- active, dormant, inactive, error
  error_message TEXT,
  metadata JSONB DEFAULT '{}', -- podcast namespace extensions, ETag, Last-Modified
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, feed_url)
);

CREATE TABLE podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES podcast_shows(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  pub_date TIMESTAMPTZ NOT NULL,
  duration INTEGER, -- seconds
  enclosure_url TEXT NOT NULL,
  enclosure_type TEXT,
  enclosure_length BIGINT,
  artwork_url TEXT,
  season INTEGER,
  episode INTEGER,
  explicit BOOLEAN DEFAULT false,
  chapters JSONB, -- podcast namespace chapters
  transcript_url TEXT,
  funding_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(show_id, guid)
);

CREATE TABLE podcast_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES podcast_shows(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  auto_download BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, show_id)
);

CREATE TABLE podcast_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  duration INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

-- Indexes for query performance
CREATE INDEX idx_podcast_shows_family ON podcast_shows(family_id);
CREATE INDEX idx_podcast_shows_status ON podcast_shows(fetch_status);
CREATE INDEX idx_podcast_episodes_show ON podcast_episodes(show_id);
CREATE INDEX idx_podcast_episodes_pub_date ON podcast_episodes(pub_date DESC);
CREATE INDEX idx_podcast_subscriptions_user ON podcast_subscriptions(user_id);
CREATE INDEX idx_podcast_progress_user ON podcast_progress(user_id);
