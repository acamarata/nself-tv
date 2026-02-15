-- Phase 8 Task 04: Games ROM Management
-- Creates tables for retro gaming systems, ROMs, save states, and play sessions

CREATE TABLE game_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  manufacturer TEXT,
  release_year INTEGER,
  tier INTEGER NOT NULL DEFAULT 1,
  core_name TEXT NOT NULL,
  bios_required BOOLEAN DEFAULT FALSE,
  bios_files JSONB DEFAULT '[]',
  file_extensions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE game_roms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES game_systems(id),
  title TEXT NOT NULL,
  cover_url TEXT,
  year INTEGER,
  genre TEXT,
  publisher TEXT,
  region TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  min_tier INTEGER,
  recommended_tier INTEGER,
  required_capabilities JSONB DEFAULT '{}',
  known_issues JSONB DEFAULT '[]',
  storage_source TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE game_save_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rom_id UUID NOT NULL REFERENCES game_roms(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL DEFAULT 0,
  data_path TEXT NOT NULL,
  screenshot_path TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, rom_id, slot)
);

CREATE TABLE game_save_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rom_id UUID NOT NULL REFERENCES game_roms(id) ON DELETE CASCADE,
  save_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE game_play_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rom_id UUID NOT NULL REFERENCES game_roms(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_game_roms_family ON game_roms(family_id);
CREATE INDEX idx_game_roms_system ON game_roms(system_id);
CREATE INDEX idx_game_saves_user ON game_save_states(user_id, rom_id);
CREATE INDEX idx_game_save_history_user_rom ON game_save_history(user_id, rom_id);
CREATE INDEX idx_game_sessions_recent ON game_play_sessions(user_id, started_at DESC);

-- Seed game systems (Tier 1: Guaranteed on all devices)
INSERT INTO game_systems (name, full_name, manufacturer, release_year, tier, core_name, file_extensions, bios_required) VALUES
('nes', 'Nintendo Entertainment System', 'Nintendo', 1983, 1, 'fceumm', ARRAY['.nes', '.zip'], false),
('snes', 'Super Nintendo Entertainment System', 'Nintendo', 1990, 1, 'snes9x', ARRAY['.sfc', '.smc', '.zip'], false),
('gb', 'Game Boy', 'Nintendo', 1989, 1, 'gambatte', ARRAY['.gb', '.zip'], false),
('gbc', 'Game Boy Color', 'Nintendo', 1998, 1, 'gambatte', ARRAY['.gbc', '.zip'], false),
('gba', 'Game Boy Advance', 'Nintendo', 2001, 1, 'mgba', ARRAY['.gba', '.zip'], false),
('genesis', 'Sega Genesis', 'Sega', 1988, 1, 'genesis_plus_gx', ARRAY['.md', '.bin', '.zip'], false),
('sms', 'Sega Master System', 'Sega', 1985, 1, 'genesis_plus_gx', ARRAY['.sms', '.zip'], false);

-- Tier 2: Device-dependent (CPU/GPU requirements)
INSERT INTO game_systems (name, full_name, manufacturer, release_year, tier, core_name, file_extensions, bios_required) VALUES
('ps1', 'PlayStation', 'Sony', 1994, 2, 'pcsx_rearmed', ARRAY['.bin', '.cue', '.iso', '.zip'], true),
('n64', 'Nintendo 64', 'Nintendo', 1996, 2, 'mupen64plus', ARRAY['.n64', '.z64', '.v64', '.zip'], false),
('nds', 'Nintendo DS', 'Nintendo', 2004, 2, 'desmume', ARRAY['.nds', '.zip'], false),
('psp', 'PlayStation Portable', 'Sony', 2004, 2, 'ppsspp', ARRAY['.iso', '.cso'], false),
('dreamcast', 'Sega Dreamcast', 'Sega', 1998, 2, 'flycast', ARRAY['.gdi', '.chd'], true);

-- Tier 3: Mini-PC/STB only (heavy emulation)
INSERT INTO game_systems (name, full_name, manufacturer, release_year, tier, core_name, file_extensions, bios_required) VALUES
('ps2', 'PlayStation 2', 'Sony', 2000, 3, 'pcsx2', ARRAY['.iso', '.bin'], true),
('gamecube', 'Nintendo GameCube', 'Nintendo', 2001, 3, 'dolphin', ARRAY['.gcm', '.iso'], false),
('wii', 'Nintendo Wii', 'Nintendo', 2006, 3, 'dolphin', ARRAY['.wbfs', '.iso'], false);
