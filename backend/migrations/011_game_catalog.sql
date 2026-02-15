-- Migration: 011_game_catalog
-- Description: Adds game catalog for searchable ROM discovery with popularity scoring,
--              and adds missing columns to game_roms for richer metadata.

-- ============================================================
-- GAME CATALOG (searchable index of all known games per system)
-- ============================================================
-- This is the "database of games" users search when adding a new game.
-- It does NOT mean the user has the ROM — it's metadata only.
-- When the user picks a game, the system downloads the ROM and creates
-- a game_roms entry linked to this catalog entry.
CREATE TABLE IF NOT EXISTS game_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES game_systems(id) ON DELETE CASCADE,

  -- Identity
  title TEXT NOT NULL,
  clean_title TEXT NOT NULL,          -- Normalized: no (USA), no [!], lowercase
  slug TEXT NOT NULL,                 -- URL-safe: tecmo-bowl

  -- Metadata
  year INTEGER,
  genre TEXT,
  publisher TEXT,
  developer TEXT,
  region TEXT DEFAULT 'US',
  players TEXT,                       -- "1", "1-2", "1-4"
  description TEXT,

  -- Popularity scoring (normalized 0.0 - 1.0 per console)
  popularity_score DECIMAL(5,4) DEFAULT 0.0,
  global_sales_millions DECIMAL(8,2),
  critic_score INTEGER,              -- 0-100
  user_rating DECIMAL(3,1),          -- 0.0-10.0

  -- External IDs
  igdb_id INTEGER,
  mobygames_id INTEGER,
  screenscraper_id INTEGER,

  -- Art assets (URLs or storage paths)
  cover_url TEXT,                    -- Box art front
  thumbnail_url TEXT,                -- Small grid preview
  screenshot_urls TEXT[] DEFAULT '{}',
  banner_url TEXT,                   -- Wide banner for featured display

  -- ROM sourcing
  rom_hash_sha256 TEXT,              -- No-Intro verified hash
  rom_file_size BIGINT,
  rom_source_url TEXT,               -- Configurable: archive.org, user repo, etc.

  -- Metadata
  content_rating TEXT,               -- E, E10+, T, M, etc.
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',       -- Extra fields: ESRB details, awards, etc.

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(system_id, slug)
);

CREATE INDEX idx_game_catalog_system ON game_catalog(system_id);
CREATE INDEX idx_game_catalog_title ON game_catalog(clean_title);
CREATE INDEX idx_game_catalog_popularity ON game_catalog(system_id, popularity_score DESC);
CREATE INDEX idx_game_catalog_slug ON game_catalog(slug);
CREATE INDEX idx_game_catalog_igdb ON game_catalog(igdb_id);

-- Full text search on game catalog
ALTER TABLE game_catalog ADD COLUMN search_vector tsvector;
CREATE INDEX idx_game_catalog_search ON game_catalog USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_game_catalog_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.clean_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.publisher, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.developer, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.genre, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_game_catalog_search_vector
  BEFORE INSERT OR UPDATE OF title, clean_title, publisher, developer, genre, description
  ON game_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_game_catalog_search_vector();

-- ============================================================
-- ALTER game_roms: add catalog link and popularity
-- ============================================================
ALTER TABLE game_roms
  ADD COLUMN IF NOT EXISTS catalog_id UUID REFERENCES game_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS popularity_score DECIMAL(5,4) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS developer TEXT,
  ADD COLUMN IF NOT EXISTS players TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_rating TEXT,
  ADD COLUMN IF NOT EXISTS download_status TEXT DEFAULT 'ready'
    CHECK (download_status IN ('pending', 'downloading', 'ready', 'error'));

CREATE INDEX IF NOT EXISTS idx_game_roms_catalog ON game_roms(catalog_id);
CREATE INDEX IF NOT EXISTS idx_game_roms_popularity ON game_roms(family_id, popularity_score DESC);

-- ============================================================
-- SEED: Popular game catalog entries (top games per system)
-- ============================================================
-- NES Top Games
INSERT INTO game_catalog (system_id, title, clean_title, slug, year, genre, publisher, developer, region, players, popularity_score, global_sales_millions, critic_score, user_rating, description) VALUES
-- NES
((SELECT id FROM game_systems WHERE name = 'nes'), 'Super Mario Bros.', 'super mario bros', 'super-mario-bros', 1985, 'Platformer', 'Nintendo', 'Nintendo', 'US', '1-2', 1.0000, 40.24, 95, 9.2, 'The iconic platformer that defined a generation. Guide Mario through the Mushroom Kingdom to rescue Princess Peach.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'The Legend of Zelda', 'the legend of zelda', 'the-legend-of-zelda', 1986, 'Action-Adventure', 'Nintendo', 'Nintendo', 'US', '1', 0.9500, 6.51, 92, 9.0, 'Explore the land of Hyrule in this groundbreaking action-adventure game.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'Tecmo Bowl', 'tecmo bowl', 'tecmo-bowl', 1989, 'Sports', 'Tecmo', 'Tecmo', 'US', '1-2', 0.8200, 2.60, 78, 8.1, 'The legendary football game featuring real NFL players and fast-paced gameplay.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'Mega Man 2', 'mega man 2', 'mega-man-2', 1988, 'Platformer', 'Capcom', 'Capcom', 'US', '1', 0.8800, 1.51, 89, 9.1, 'Widely considered the best Mega Man game, featuring 8 Robot Masters.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'Contra', 'contra', 'contra', 1988, 'Run and Gun', 'Konami', 'Konami', 'US', '1-2', 0.8500, 1.10, 85, 8.7, 'The legendary co-op shooter known for its intense difficulty and the Konami Code.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'Super Mario Bros. 3', 'super mario bros 3', 'super-mario-bros-3', 1988, 'Platformer', 'Nintendo', 'Nintendo', 'US', '1-2', 0.9800, 17.28, 97, 9.5, 'The masterpiece of NES platformers with world maps, suits, and secrets.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'Metroid', 'metroid', 'metroid', 1986, 'Action-Adventure', 'Nintendo', 'Nintendo R&D1', 'US', '1', 0.8000, 2.73, 86, 8.3, 'Explore planet Zebes as bounty hunter Samus Aran in this genre-defining classic.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'Castlevania', 'castlevania', 'castlevania', 1986, 'Platformer', 'Konami', 'Konami', 'US', '1', 0.7800, 1.05, 84, 8.5, 'Take on Dracula as Simon Belmont wielding the legendary Vampire Killer whip.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'Punch-Out!!', 'punch-out', 'punch-out', 1987, 'Sports', 'Nintendo', 'Nintendo', 'US', '1', 0.8300, 3.00, 88, 8.8, 'Fight your way to the championship as Little Mac in this beloved boxing game.'),
((SELECT id FROM game_systems WHERE name = 'nes'), 'Duck Hunt', 'duck hunt', 'duck-hunt', 1984, 'Shooter', 'Nintendo', 'Nintendo', 'US', '1-2', 0.7500, 28.31, 72, 7.5, 'The classic light gun shooter bundled with millions of NES consoles.'),

-- SNES
((SELECT id FROM game_systems WHERE name = 'snes'), 'Super Mario World', 'super mario world', 'super-mario-world', 1990, 'Platformer', 'Nintendo', 'Nintendo', 'US', '1-2', 1.0000, 20.61, 96, 9.4, 'The defining SNES platformer introducing Yoshi and the expansive Dinosaur Land.'),
((SELECT id FROM game_systems WHERE name = 'snes'), 'The Legend of Zelda: A Link to the Past', 'the legend of zelda a link to the past', 'zelda-a-link-to-the-past', 1991, 'Action-Adventure', 'Nintendo', 'Nintendo', 'US', '1', 0.9700, 4.61, 95, 9.5, 'The quintessential top-down Zelda adventure with Light and Dark Worlds.'),
((SELECT id FROM game_systems WHERE name = 'snes'), 'Super Metroid', 'super metroid', 'super-metroid', 1994, 'Action-Adventure', 'Nintendo', 'Nintendo R&D1', 'US', '1', 0.9200, 1.42, 96, 9.6, 'One of the greatest games ever made. Return to Zebes for the ultimate Metroid experience.'),
((SELECT id FROM game_systems WHERE name = 'snes'), 'Chrono Trigger', 'chrono trigger', 'chrono-trigger', 1995, 'RPG', 'Square', 'Square', 'US', '1', 0.9500, 2.65, 95, 9.7, 'The time-traveling RPG masterpiece by the Dream Team of Toriyama, Sakaguchi, and Horii.'),
((SELECT id FROM game_systems WHERE name = 'snes'), 'Street Fighter II Turbo', 'street fighter ii turbo', 'street-fighter-ii-turbo', 1993, 'Fighting', 'Capcom', 'Capcom', 'US', '1-2', 0.8800, 4.10, 90, 8.9, 'The definitive version of the game that created the fighting genre.'),
((SELECT id FROM game_systems WHERE name = 'snes'), 'Donkey Kong Country', 'donkey kong country', 'donkey-kong-country', 1994, 'Platformer', 'Nintendo', 'Rare', 'US', '1-2', 0.9300, 9.30, 90, 8.8, 'Revolutionary pre-rendered graphics and unforgettable gameplay from Rare.'),
((SELECT id FROM game_systems WHERE name = 'snes'), 'Final Fantasy VI', 'final fantasy vi', 'final-fantasy-vi', 1994, 'RPG', 'Square', 'Square', 'US', '1', 0.9000, 3.48, 92, 9.4, 'The epic RPG with 14 playable characters and the iconic villain Kefka.'),
((SELECT id FROM game_systems WHERE name = 'snes'), 'Super Mario Kart', 'super mario kart', 'super-mario-kart', 1992, 'Racing', 'Nintendo', 'Nintendo', 'US', '1-2', 0.9100, 8.76, 94, 8.7, 'The game that launched the kart racing genre with Mode 7 graphics.'),

-- Genesis
((SELECT id FROM game_systems WHERE name = 'genesis'), 'Sonic the Hedgehog 2', 'sonic the hedgehog 2', 'sonic-the-hedgehog-2', 1992, 'Platformer', 'Sega', 'Sega Technical Institute', 'US', '1-2', 1.0000, 6.03, 87, 9.0, 'The fastest hedgehog returns with Tails and the iconic Chemical Plant Zone.'),
((SELECT id FROM game_systems WHERE name = 'genesis'), 'Sonic the Hedgehog', 'sonic the hedgehog', 'sonic-the-hedgehog', 1991, 'Platformer', 'Sega', 'Sonic Team', 'US', '1', 0.9500, 15.00, 86, 8.5, 'The game that made Sega a household name. Speed through Green Hill Zone and beyond.'),
((SELECT id FROM game_systems WHERE name = 'genesis'), 'Streets of Rage 2', 'streets of rage 2', 'streets-of-rage-2', 1992, 'Beat-em-up', 'Sega', 'Ancient', 'US', '1-2', 0.8800, 1.65, 91, 9.1, 'The best beat-em-up of the 16-bit era with incredible music by Yuzo Koshiro.'),
((SELECT id FROM game_systems WHERE name = 'genesis'), 'Mortal Kombat II', 'mortal kombat ii', 'mortal-kombat-ii', 1994, 'Fighting', 'Acclaim', 'Midway', 'US', '1-2', 0.8200, 2.50, 84, 8.3, 'The blood-soaked fighting game sequel with more fatalities and fighters.'),

-- Game Boy
((SELECT id FROM game_systems WHERE name = 'gb'), 'Tetris', 'tetris', 'tetris', 1989, 'Puzzle', 'Nintendo', 'Nintendo', 'US', '1-2', 1.0000, 35.84, 88, 9.0, 'The addictive puzzle game that sold millions of Game Boys worldwide.'),
((SELECT id FROM game_systems WHERE name = 'gb'), 'Pokemon Red/Blue', 'pokemon red blue', 'pokemon-red-blue', 1996, 'RPG', 'Nintendo', 'Game Freak', 'US', '1', 0.9800, 31.37, 89, 9.2, 'Gotta catch em all! The phenomenon that started a global franchise.'),
((SELECT id FROM game_systems WHERE name = 'gb'), 'Super Mario Land 2', 'super mario land 2', 'super-mario-land-2', 1992, 'Platformer', 'Nintendo', 'Nintendo', 'US', '1', 0.8000, 11.18, 82, 8.0, 'Mario explores 6 zones to reclaim his castle from the villainous Wario.'),

-- GBA
((SELECT id FROM game_systems WHERE name = 'gba'), 'Pokemon Emerald', 'pokemon emerald', 'pokemon-emerald', 2004, 'RPG', 'Nintendo', 'Game Freak', 'US', '1', 1.0000, 7.06, 85, 9.0, 'The definitive Hoenn Pokemon adventure with Battle Frontier.'),
((SELECT id FROM game_systems WHERE name = 'gba'), 'The Legend of Zelda: The Minish Cap', 'the legend of zelda the minish cap', 'zelda-minish-cap', 2004, 'Action-Adventure', 'Nintendo', 'Capcom/Flagship', 'US', '1', 0.8500, 1.76, 89, 8.8, 'Link shrinks to Minish size in this charming Zelda adventure by Capcom.'),
((SELECT id FROM game_systems WHERE name = 'gba'), 'Metroid Fusion', 'metroid fusion', 'metroid-fusion', 2002, 'Action-Adventure', 'Nintendo', 'Nintendo R&D1', 'US', '1', 0.8700, 1.60, 92, 9.1, 'Samus faces the deadly X parasites in this intense GBA Metroid entry.'),
((SELECT id FROM game_systems WHERE name = 'gba'), 'Advance Wars', 'advance wars', 'advance-wars', 2001, 'Strategy', 'Nintendo', 'Intelligent Systems', 'US', '1-4', 0.8200, 0.62, 92, 9.0, 'The tactical war strategy game that defined handheld turn-based combat.'),
((SELECT id FROM game_systems WHERE name = 'gba'), 'Mario Kart: Super Circuit', 'mario kart super circuit', 'mario-kart-super-circuit', 2001, 'Racing', 'Nintendo', 'Intelligent Systems', 'US', '1-4', 0.8800, 5.91, 84, 8.2, 'Mario Kart on the go with all-new tracks and classic SNES courses.'),

-- GBC
((SELECT id FROM game_systems WHERE name = 'gbc'), 'Pokemon Crystal', 'pokemon crystal', 'pokemon-crystal', 2000, 'RPG', 'Nintendo', 'Game Freak', 'US', '1', 1.0000, 6.39, 84, 9.1, 'The definitive Gen 2 Pokemon game with animated sprites and Suicune storyline.'),
((SELECT id FROM game_systems WHERE name = 'gbc'), 'The Legend of Zelda: Oracle of Ages', 'the legend of zelda oracle of ages', 'zelda-oracle-of-ages', 2001, 'Action-Adventure', 'Nintendo', 'Capcom/Flagship', 'US', '1', 0.8500, 3.96, 87, 8.7, 'Time-traveling Zelda adventure that links with Oracle of Seasons.'),

-- PS1
((SELECT id FROM game_systems WHERE name = 'ps1'), 'Final Fantasy VII', 'final fantasy vii', 'final-fantasy-vii', 1997, 'RPG', 'Square', 'Square', 'US', '1', 1.0000, 13.00, 92, 9.5, 'The RPG that changed everything. Follow Cloud Strife on an unforgettable journey.'),
((SELECT id FROM game_systems WHERE name = 'ps1'), 'Metal Gear Solid', 'metal gear solid', 'metal-gear-solid', 1998, 'Stealth', 'Konami', 'Konami', 'US', '1', 0.9500, 7.00, 94, 9.4, 'Solid Snake infiltrates Shadow Moses in this cinematic stealth masterpiece.'),
((SELECT id FROM game_systems WHERE name = 'ps1'), 'Castlevania: Symphony of the Night', 'castlevania symphony of the night', 'castlevania-sotn', 1997, 'Action-RPG', 'Konami', 'Konami', 'US', '1', 0.9200, 1.27, 93, 9.6, 'The game that defined Metroidvania. Explore Draculas inverted castle as Alucard.'),
((SELECT id FROM game_systems WHERE name = 'ps1'), 'Crash Bandicoot: Warped', 'crash bandicoot warped', 'crash-bandicoot-warped', 1998, 'Platformer', 'Sony', 'Naughty Dog', 'US', '1', 0.8800, 7.13, 91, 8.8, 'Crash travels through time in the best entry of the original trilogy.'),
((SELECT id FROM game_systems WHERE name = 'ps1'), 'Resident Evil 2', 'resident evil 2', 'resident-evil-2', 1998, 'Survival Horror', 'Capcom', 'Capcom', 'US', '1', 0.8700, 4.96, 89, 9.0, 'The defining survival horror game. Leon and Claire survive Raccoon City.'),
((SELECT id FROM game_systems WHERE name = 'ps1'), 'Tekken 3', 'tekken 3', 'tekken-3', 1998, 'Fighting', 'Namco', 'Namco', 'US', '1-2', 0.9000, 8.30, 96, 9.1, 'The greatest PlayStation fighting game with a massive roster and fluid combat.'),

-- N64
((SELECT id FROM game_systems WHERE name = 'n64'), 'Super Mario 64', 'super mario 64', 'super-mario-64', 1996, 'Platformer', 'Nintendo', 'Nintendo', 'US', '1', 1.0000, 11.91, 96, 9.3, 'The revolutionary 3D platformer that redefined gaming. 120 stars await.'),
((SELECT id FROM game_systems WHERE name = 'n64'), 'The Legend of Zelda: Ocarina of Time', 'the legend of zelda ocarina of time', 'zelda-ocarina-of-time', 1998, 'Action-Adventure', 'Nintendo', 'Nintendo', 'US', '1', 0.9900, 7.60, 99, 9.8, 'Often called the greatest game ever made. Links journey from child to hero.'),
((SELECT id FROM game_systems WHERE name = 'n64'), 'GoldenEye 007', 'goldeneye 007', 'goldeneye-007', 1997, 'FPS', 'Nintendo', 'Rare', 'US', '1-4', 0.9500, 8.09, 96, 9.0, 'The FPS that proved consoles could do shooters. Legendary 4-player split-screen.'),
((SELECT id FROM game_systems WHERE name = 'n64'), 'Mario Kart 64', 'mario kart 64', 'mario-kart-64', 1996, 'Racing', 'Nintendo', 'Nintendo', 'US', '1-4', 0.9300, 9.87, 83, 8.8, 'The definitive party racer with iconic tracks like Rainbow Road.'),
((SELECT id FROM game_systems WHERE name = 'n64'), 'Super Smash Bros.', 'super smash bros', 'super-smash-bros', 1999, 'Fighting', 'Nintendo', 'HAL Laboratory', 'US', '1-4', 0.8800, 5.55, 79, 8.7, 'The original crossover fighter that started the Smash phenomenon.'),

-- PSP
((SELECT id FROM game_systems WHERE name = 'psp'), 'God of War: Chains of Olympus', 'god of war chains of olympus', 'god-of-war-chains-of-olympus', 2008, 'Action', 'Sony', 'Ready at Dawn', 'US', '1', 0.9200, 3.20, 91, 8.9, 'Kratos on the go in a stunning PSP action game that rivals console quality.'),
((SELECT id FROM game_systems WHERE name = 'psp'), 'Monster Hunter Freedom Unite', 'monster hunter freedom unite', 'monster-hunter-freedom-unite', 2008, 'Action-RPG', 'Capcom', 'Capcom', 'US', '1-4', 0.9500, 5.50, 83, 9.0, 'The definitive portable Monster Hunter with hundreds of hours of content.'),

-- NDS
((SELECT id FROM game_systems WHERE name = 'nds'), 'Mario Kart DS', 'mario kart ds', 'mario-kart-ds', 2005, 'Racing', 'Nintendo', 'Nintendo', 'US', '1-8', 0.9500, 23.60, 91, 8.9, 'The best-selling DS game with online play and retro tracks.'),
((SELECT id FROM game_systems WHERE name = 'nds'), 'Pokemon HeartGold/SoulSilver', 'pokemon heartgold soulsilver', 'pokemon-heartgold-soulsilver', 2009, 'RPG', 'Nintendo', 'Game Freak', 'US', '1', 1.0000, 12.72, 87, 9.3, 'The beloved Gen 2 remakes with Pokemon following you and the Pokewalker.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- UPDATED_AT TRIGGER for game_catalog
-- ============================================================
CREATE TRIGGER trg_game_catalog_updated_at
  BEFORE UPDATE ON game_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
