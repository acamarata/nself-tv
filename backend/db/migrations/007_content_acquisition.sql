-- Migration: 007_content_acquisition
-- Description: App-layer tables for content acquisition (Phase 6).
-- Plugin tables (subscriptions, downloads, rules, feeds, seeding, VPN state)
-- are created and managed by nself plugins. This migration covers only
-- app-specific tables that bridge plugin data to the nself-tv domain.

-- ============================================================
-- ACQUISITION PREFERENCES (per-family acquisition settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS acquisition_preferences (
    family_id UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
    default_quality_profile VARCHAR(20) NOT NULL DEFAULT 'balanced'
        CHECK (default_quality_profile IN ('minimal', 'balanced', '4k_premium')),
    auto_download_enabled BOOLEAN NOT NULL DEFAULT true,
    max_concurrent_downloads INT NOT NULL DEFAULT 3,
    preferred_subtitle_languages TEXT[] NOT NULL DEFAULT '{en}',
    vpn_required BOOLEAN NOT NULL DEFAULT true,
    seed_ratio_target DECIMAL(4,2) NOT NULL DEFAULT 2.0,
    bandwidth_schedule_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACQUISITION HISTORY (links plugin downloads to media_items)
-- ============================================================
-- When a download completes and media is ingested into the library,
-- this table tracks the provenance: which download produced which media item.
CREATE TABLE IF NOT EXISTS acquisition_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    media_item_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
    download_id VARCHAR(255) NOT NULL,       -- ID from content-acquisition plugin
    content_type VARCHAR(20) NOT NULL
        CHECK (content_type IN ('episode', 'movie')),
    title VARCHAR(500) NOT NULL,
    source_quality VARCHAR(20) NOT NULL DEFAULT 'unknown'
        CHECK (source_quality IN ('remux', 'bluray', 'web-dl', 'webrip', 'hdtv', 'unknown')),
    source_size_bytes BIGINT,
    encoded_size_bytes BIGINT,
    download_duration_seconds INT,
    encode_duration_seconds INT,
    subtitle_languages TEXT[] DEFAULT '{}',
    audio_tracks_count INT DEFAULT 0,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acq_history_family ON acquisition_history(family_id);
CREATE INDEX idx_acq_history_media ON acquisition_history(media_item_id);
CREATE INDEX idx_acq_history_download ON acquisition_history(download_id);
CREATE INDEX idx_acq_history_acquired ON acquisition_history(acquired_at DESC);

-- ============================================================
-- ACQUISITION NOTIFICATIONS (per-user notification preferences)
-- ============================================================
CREATE TABLE IF NOT EXISTS acquisition_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL
        CHECK (event_type IN (
            'download_complete', 'download_failed',
            'subscription_added', 'movie_released',
            'episode_detected', 'quality_upgrade',
            'seeding_complete', 'vpn_disconnected'
        )),
    enabled BOOLEAN NOT NULL DEFAULT true,
    notify_method VARCHAR(20) NOT NULL DEFAULT 'in_app'
        CHECK (notify_method IN ('in_app', 'email', 'push', 'all')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, event_type)
);

CREATE INDEX idx_acq_notifications_user ON acquisition_notifications(user_id);

-- ============================================================
-- ALTER media_items: add acquisition tracking columns
-- ============================================================
ALTER TABLE media_items
    ADD COLUMN IF NOT EXISTS acquisition_source VARCHAR(20) DEFAULT NULL
        CHECK (acquisition_source IS NULL OR acquisition_source IN ('manual', 'subscription', 'movie_monitor', 'rule')),
    ADD COLUMN IF NOT EXISTS acquisition_download_id VARCHAR(255) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_media_items_acq_source ON media_items(acquisition_source)
    WHERE acquisition_source IS NOT NULL;

-- ============================================================
-- DEFAULT PREFERENCES for demo family
-- ============================================================
INSERT INTO acquisition_preferences (family_id, default_quality_profile, max_concurrent_downloads)
VALUES ('00000000-0000-0000-0000-000000000001', 'balanced', 3)
ON CONFLICT DO NOTHING;

-- Default notification preferences for demo users
INSERT INTO acquisition_notifications (user_id, event_type, enabled, notify_method) VALUES
    ('00000000-0000-0000-0000-000000000010', 'download_complete', true, 'in_app'),
    ('00000000-0000-0000-0000-000000000010', 'download_failed', true, 'in_app'),
    ('00000000-0000-0000-0000-000000000010', 'movie_released', true, 'in_app'),
    ('00000000-0000-0000-0000-000000000010', 'episode_detected', true, 'in_app'),
    ('00000000-0000-0000-0000-000000000010', 'quality_upgrade', true, 'in_app')
ON CONFLICT DO NOTHING;

-- ============================================================
-- UPDATED_AT TRIGGER for acquisition_preferences
-- ============================================================
CREATE TRIGGER trg_acq_preferences_updated_at
    BEFORE UPDATE ON acquisition_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
