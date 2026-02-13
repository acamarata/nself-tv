-- Migration 006: Live TV, DVR, and EPG tables
-- Supports channels, program guides, live events, DVR recordings,
-- commercial detection markers, device telemetry, and user favorite teams.

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    call_sign VARCHAR(20),
    logo_url TEXT,
    genre VARCHAR(100),
    is_hd BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs (EPG data)
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    genre VARCHAR(100),
    is_new BOOLEAN DEFAULT false,
    is_live BOOLEAN DEFAULT false,
    season_number INT,
    episode_number INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live events
CREATE TABLE IF NOT EXISTS live_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id),
    title VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    league VARCHAR(50),
    home_team VARCHAR(255),
    away_team VARCHAR(255),
    home_score INT,
    away_score INT,
    device_id VARCHAR(255),
    tuner_index INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DVR recordings
CREATE TABLE IF NOT EXISTS dvr_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES live_events(id),
    family_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    channel_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INT,
    file_size BIGINT,
    storage_path TEXT,
    has_commercials BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commercial markers
CREATE TABLE IF NOT EXISTS commercial_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID REFERENCES dvr_recordings(id) ON DELETE CASCADE,
    start_ms BIGINT NOT NULL,
    end_ms BIGINT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'comskip',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device telemetry
CREATE TABLE IF NOT EXISTS device_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL,
    signal_strength INT,
    signal_snr DECIMAL(5,2),
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    uptime_seconds BIGINT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- User favorite teams for auto-recording
CREATE TABLE IF NOT EXISTS user_favorite_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    team_id VARCHAR(255) NOT NULL,
    league VARCHAR(50) NOT NULL,
    auto_record BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_programs_channel_time ON programs(channel_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_live_events_status ON live_events(status);
CREATE INDEX IF NOT EXISTS idx_live_events_time ON live_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_dvr_recordings_family ON dvr_recordings(family_id);
CREATE INDEX IF NOT EXISTS idx_dvr_recordings_status ON dvr_recordings(status);
CREATE INDEX IF NOT EXISTS idx_commercial_markers_recording ON commercial_markers(recording_id);
CREATE INDEX IF NOT EXISTS idx_device_telemetry_device ON device_telemetry(device_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_user_favorite_teams_user ON user_favorite_teams(user_id);
