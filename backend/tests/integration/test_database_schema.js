/**
 * Phase 2 Integration Tests: Database Schema
 *
 * Validates that all migration files exist, are syntactically valid SQL,
 * define the required tables/indexes/foreign keys, and maintain referential
 * integrity — all without connecting to a running database.
 *
 * These tests parse the SQL migration files directly from disk.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../db/migrations');

const EXPECTED_MIGRATIONS = [
  '000_baseline.sql',
  '001_watch_progress.sql',
  '002_playlists.sql',
  '003_ratings_reviews.sql',
  '004_recommendations.sql',
  '005_search_analytics.sql',
];

const REQUIRED_TABLES = [
  'families',
  'users',
  'profiles',
  'media_items',
  'media_variants',
  'subtitle_tracks',
  'audio_tracks',
  'watch_progress',
  'playlists',
  'playlist_items',
  'user_ratings',
  'user_interactions',
  'content_recommendations',
  'trending_content',
  'search_analytics',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read all migration files and concatenate their contents.
 */
function loadAllMigrations() {
  const contents = {};
  let concatenated = '';

  for (const filename of EXPECTED_MIGRATIONS) {
    const filepath = resolve(MIGRATIONS_DIR, filename);
    if (existsSync(filepath)) {
      const sql = readFileSync(filepath, 'utf-8');
      contents[filename] = sql;
      concatenated += sql + '\n';
    }
  }

  return { contents, concatenated };
}

/**
 * Extract CREATE TABLE statements from SQL, returning table names.
 */
function extractTableNames(sql) {
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
  const tables = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    tables.push(match[1].toLowerCase());
  }
  return tables;
}

/**
 * Extract CREATE INDEX statements, returning index names.
 */
function extractIndexNames(sql) {
  const regex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
  const indexes = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    indexes.push(match[1].toLowerCase());
  }
  return indexes;
}

/**
 * Extract REFERENCES clauses, returning { table, column, referencedTable, referencedColumn }.
 */
function extractForeignKeys(sql) {
  const fks = [];

  // Inline FK: column_name TYPE REFERENCES target_table(target_col)
  const inlineRegex = /(\w+)\s+UUID\s+(?:NOT\s+NULL\s+)?REFERENCES\s+(\w+)\((\w+)\)/gi;
  let match;
  while ((match = inlineRegex.exec(sql)) !== null) {
    fks.push({
      column: match[1].toLowerCase(),
      referencedTable: match[2].toLowerCase(),
      referencedColumn: match[3].toLowerCase(),
    });
  }

  // ALTER TABLE FK: ADD CONSTRAINT ... FOREIGN KEY (col) REFERENCES target(col)
  const alterRegex =
    /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+\w+\s+FOREIGN\s+KEY\s*\((\w+)\)\s+REFERENCES\s+(\w+)\((\w+)\)/gi;
  while ((match = alterRegex.exec(sql)) !== null) {
    fks.push({
      sourceTable: match[1].toLowerCase(),
      column: match[2].toLowerCase(),
      referencedTable: match[3].toLowerCase(),
      referencedColumn: match[4].toLowerCase(),
    });
  }

  return fks;
}

/**
 * Basic SQL syntax validation:
 * - No unmatched parentheses
 * - Every CREATE TABLE has a closing );
 * - No obvious syntax errors (empty statement bodies)
 */
function validateSqlSyntax(sql) {
  const errors = [];

  // Strip comments for analysis
  const stripped = sql
    .replace(/--[^\n]*/g, '')    // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // multi-line comments

  // Check balanced parentheses
  let depth = 0;
  for (const ch of stripped) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) {
      errors.push('Unmatched closing parenthesis found');
      break;
    }
  }
  if (depth > 0) {
    errors.push(`${depth} unclosed parenthesis(es) found`);
  }

  // Every CREATE TABLE should have content between ( and );
  const createTableBlocks = stripped.match(
    /CREATE\s+TABLE[\s\S]*?\);/gi,
  );
  if (createTableBlocks) {
    for (const block of createTableBlocks) {
      // Extract content between first ( and final );
      const bodyMatch = block.match(/\(([\s\S]*)\)\s*;/);
      if (bodyMatch) {
        const body = bodyMatch[1].trim();
        if (body.length === 0) {
          errors.push('Empty CREATE TABLE body detected');
        }
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Load migration data
// ---------------------------------------------------------------------------

let migrations;
let allSql;
let allTables;
let allIndexes;
let allForeignKeys;

beforeAll(() => {
  const loaded = loadAllMigrations();
  migrations = loaded.contents;
  allSql = loaded.concatenated;
  allTables = extractTableNames(allSql);
  allIndexes = extractIndexNames(allSql);
  allForeignKeys = extractForeignKeys(allSql);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Migration Files', () => {
  it('should have all 6 migration files (000 through 005)', () => {
    for (const filename of EXPECTED_MIGRATIONS) {
      const filepath = resolve(MIGRATIONS_DIR, filename);
      expect(existsSync(filepath), `Missing migration: ${filename}`).toBe(true);
    }
  });

  it('should have migration files numbered sequentially', () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (let i = 0; i < files.length; i++) {
      const prefix = files[i].slice(0, 3);
      const expectedPrefix = String(i).padStart(3, '0');
      expect(prefix).toBe(expectedPrefix);
    }
  });

  it('should contain valid SQL in each migration file', () => {
    for (const [filename, sql] of Object.entries(migrations)) {
      const errors = validateSqlSyntax(sql);
      expect(errors, `Syntax errors in ${filename}: ${errors.join(', ')}`).toHaveLength(0);
    }
  });

  it('should not have empty migration files', () => {
    for (const [filename, sql] of Object.entries(migrations)) {
      const stripped = sql.replace(/--[^\n]*/g, '').trim();
      expect(stripped.length, `${filename} is effectively empty`).toBeGreaterThan(0);
    }
  });
});

describe('Required Tables', () => {
  it('should define all required tables across migrations', () => {
    for (const table of REQUIRED_TABLES) {
      expect(
        allTables,
        `Missing table definition: ${table}`,
      ).toContain(table);
    }
  });

  it('should define families table in 000_baseline', () => {
    const tables = extractTableNames(migrations['000_baseline.sql']);
    expect(tables).toContain('families');
  });

  it('should define users table in 000_baseline', () => {
    const tables = extractTableNames(migrations['000_baseline.sql']);
    expect(tables).toContain('users');
  });

  it('should define profiles table in 000_baseline', () => {
    const tables = extractTableNames(migrations['000_baseline.sql']);
    expect(tables).toContain('profiles');
  });

  it('should define media_items table in 000_baseline', () => {
    const tables = extractTableNames(migrations['000_baseline.sql']);
    expect(tables).toContain('media_items');
  });

  it('should define media_variants table in 000_baseline', () => {
    const tables = extractTableNames(migrations['000_baseline.sql']);
    expect(tables).toContain('media_variants');
  });

  it('should define subtitle_tracks table in 000_baseline', () => {
    const tables = extractTableNames(migrations['000_baseline.sql']);
    expect(tables).toContain('subtitle_tracks');
  });

  it('should define audio_tracks table in 000_baseline', () => {
    const tables = extractTableNames(migrations['000_baseline.sql']);
    expect(tables).toContain('audio_tracks');
  });

  it('should define watch_progress table in 001_watch_progress', () => {
    const tables = extractTableNames(migrations['001_watch_progress.sql']);
    expect(tables).toContain('watch_progress');
  });

  it('should define playlists and playlist_items in 002_playlists', () => {
    const tables = extractTableNames(migrations['002_playlists.sql']);
    expect(tables).toContain('playlists');
    expect(tables).toContain('playlist_items');
  });

  it('should define user_ratings in 003_ratings_reviews', () => {
    const tables = extractTableNames(migrations['003_ratings_reviews.sql']);
    expect(tables).toContain('user_ratings');
  });

  it('should define user_interactions and content_recommendations in 004_recommendations', () => {
    const tables = extractTableNames(migrations['004_recommendations.sql']);
    expect(tables).toContain('user_interactions');
    expect(tables).toContain('content_recommendations');
    expect(tables).toContain('trending_content');
  });

  it('should define search_analytics in 005_search_analytics', () => {
    const tables = extractTableNames(migrations['005_search_analytics.sql']);
    expect(tables).toContain('search_analytics');
  });
});

describe('Required Indexes', () => {
  const REQUIRED_INDEXES = [
    // 000_baseline
    'idx_families_slug',
    'idx_users_family',
    'idx_users_email',
    'idx_users_role',
    'idx_profiles_user',
    'idx_profiles_family',
    'idx_media_items_family',
    'idx_media_items_type',
    'idx_media_items_status',
    'idx_media_items_title',
    'idx_media_items_parent',
    'idx_media_items_tmdb',
    'idx_media_items_genres',
    'idx_media_items_tags',
    'idx_media_items_added',
    'idx_media_items_search',
    'idx_media_variants_item',
    'idx_media_variants_rendition',
    'idx_subtitles_item',
    'idx_audio_tracks_item',

    // 001_watch_progress
    'idx_watch_progress_user',
    'idx_watch_progress_family',
    'idx_watch_progress_media',
    'idx_watch_progress_completed',
    'idx_watch_progress_user_media',

    // 002_playlists
    'idx_playlists_family',
    'idx_playlists_owner',
    'idx_playlist_items_playlist',
    'idx_playlist_items_media',

    // 003_ratings_reviews
    'idx_user_ratings_family',
    'idx_user_ratings_user',
    'idx_user_ratings_media',
    'idx_user_ratings_rating',
    'idx_user_ratings_unique',

    // 004_recommendations
    'idx_user_interactions_family',
    'idx_user_interactions_user',
    'idx_user_interactions_media',
    'idx_user_interactions_type',
    'idx_recommendations_user',
    'idx_recommendations_media',
    'idx_trending_content_media',
    'idx_trending_content_score',

    // 005_search_analytics
    'idx_search_analytics_family',
    'idx_search_analytics_user',
    'idx_search_analytics_query',
    'idx_search_analytics_created',
    'idx_search_analytics_clicked',
  ];

  it('should define all required indexes', () => {
    for (const idx of REQUIRED_INDEXES) {
      expect(
        allIndexes,
        `Missing index: ${idx}`,
      ).toContain(idx);
    }
  });

  it('should have GIN indexes for array columns (genres, tags)', () => {
    expect(allSql).toMatch(/USING\s+GIN\s*\(\s*genres\s*\)/i);
    expect(allSql).toMatch(/USING\s+GIN\s*\(\s*tags\s*\)/i);
  });

  it('should have a GIN index for full-text search vector', () => {
    expect(allSql).toMatch(/USING\s+GIN\s*\(\s*search_vector\s*\)/i);
  });
});

describe('Foreign Key Relationships', () => {
  it('should reference families(id) from users table', () => {
    const fk = allForeignKeys.find(
      (f) => f.column === 'family_id' && f.referencedTable === 'families',
    );
    expect(fk).toBeDefined();
    expect(fk.referencedColumn).toBe('id');
  });

  it('should reference users(id) from profiles table', () => {
    const fk = allForeignKeys.find(
      (f) => f.column === 'user_id' && f.referencedTable === 'users',
    );
    expect(fk).toBeDefined();
    expect(fk.referencedColumn).toBe('id');
  });

  it('should reference families(id) from profiles table', () => {
    const fks = allForeignKeys.filter(
      (f) => f.column === 'family_id' && f.referencedTable === 'families',
    );
    expect(fks.length).toBeGreaterThanOrEqual(2); // users and profiles at minimum
  });

  it('should reference media_items(id) from media_variants', () => {
    const fk = allForeignKeys.find(
      (f) =>
        f.column === 'media_item_id' &&
        f.referencedTable === 'media_items',
    );
    expect(fk).toBeDefined();
  });

  it('should reference media_items(id) from subtitle_tracks', () => {
    const baselineSql = migrations['000_baseline.sql'];
    expect(baselineSql).toMatch(
      /subtitle_tracks[\s\S]*?media_item_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+media_items\(id\)/i,
    );
  });

  it('should reference media_items(id) from audio_tracks', () => {
    const baselineSql = migrations['000_baseline.sql'];
    expect(baselineSql).toMatch(
      /audio_tracks[\s\S]*?media_item_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+media_items\(id\)/i,
    );
  });

  it('should reference families(id) from watch_progress', () => {
    const sql = migrations['001_watch_progress.sql'];
    expect(sql).toMatch(/family_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+families\(id\)/i);
  });

  it('should reference users(id) from watch_progress', () => {
    const sql = migrations['001_watch_progress.sql'];
    expect(sql).toMatch(/user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+users\(id\)/i);
  });

  it('should reference media_items(id) from watch_progress', () => {
    const sql = migrations['001_watch_progress.sql'];
    expect(sql).toMatch(/media_item_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+media_items\(id\)/i);
  });

  it('should reference playlists(id) from playlist_items', () => {
    const sql = migrations['002_playlists.sql'];
    expect(sql).toMatch(/playlist_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+playlists\(id\)/i);
  });

  it('should reference media_items(id) from playlist_items', () => {
    const sql = migrations['002_playlists.sql'];
    expect(sql).toMatch(/media_item_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+media_items\(id\)/i);
  });

  it('should reference media_items(id) from user_ratings', () => {
    const sql = migrations['003_ratings_reviews.sql'];
    expect(sql).toMatch(/media_item_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+media_items\(id\)/i);
  });

  it('should reference users(id) from content_recommendations', () => {
    const sql = migrations['004_recommendations.sql'];
    expect(sql).toMatch(/user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+users\(id\)/i);
  });

  it('should reference media_items(id) from content_recommendations', () => {
    const sql = migrations['004_recommendations.sql'];
    expect(sql).toMatch(/media_item_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+media_items\(id\)/i);
  });

  it('should reference families(id) from search_analytics', () => {
    const sql = migrations['005_search_analytics.sql'];
    expect(sql).toMatch(/family_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+families\(id\)/i);
  });

  it('should reference media_items(id) from search_analytics (clicked_result_id)', () => {
    const sql = migrations['005_search_analytics.sql'];
    expect(sql).toMatch(/clicked_result_id\s+UUID\s+REFERENCES\s+media_items\(id\)/i);
  });

  it('should use ON DELETE CASCADE for family-scoped tables', () => {
    // All family_id references should cascade on delete
    const cascadePattern = /family_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+families\(id\)\s+ON\s+DELETE\s+CASCADE/gi;
    const matches = allSql.match(cascadePattern);
    // Should appear in: users, profiles, device_registrations, media_items,
    // watch_progress, playlists, user_ratings, user_interactions, search_analytics
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(9);
  });

  it('should support self-referencing parent_id for TV show episodes', () => {
    const baselineSql = migrations['000_baseline.sql'];
    expect(baselineSql).toMatch(
      /parent_id\s+UUID\s+REFERENCES\s+media_items\(id\)/i,
    );
  });
});

describe('Data Integrity Constraints', () => {
  it('should use UUID primary keys on all tables', () => {
    for (const table of REQUIRED_TABLES) {
      const pattern = new RegExp(
        `CREATE\\s+TABLE[\\s\\S]*?${table}[\\s\\S]*?id\\s+UUID\\s+PRIMARY\\s+KEY`,
        'i',
      );
      expect(allSql).toMatch(pattern);
    }
  });

  it('should define CHECK constraints on media_items.type', () => {
    expect(allSql).toMatch(
      /type[\s\S]*?CHECK[\s\S]*?'movie'[\s\S]*?'tv_show'[\s\S]*?'episode'/i,
    );
  });

  it('should define CHECK constraints on media_items.status', () => {
    expect(allSql).toMatch(
      /status[\s\S]*?CHECK[\s\S]*?'pending'[\s\S]*?'processing'[\s\S]*?'ready'[\s\S]*?'error'[\s\S]*?'archived'/i,
    );
  });

  it('should define CHECK constraints on user_interactions.interaction_type', () => {
    expect(allSql).toMatch(
      /interaction_type[\s\S]*?CHECK[\s\S]*?'view'[\s\S]*?'play'[\s\S]*?'complete'/i,
    );
  });

  it('should define CHECK constraints on search_analytics.source', () => {
    expect(allSql).toMatch(
      /source[\s\S]*?CHECK[\s\S]*?'search_bar'[\s\S]*?'voice'[\s\S]*?'suggestion'/i,
    );
  });

  it('should have updated_at triggers for mutable tables', () => {
    const triggeredTables = [
      'families',
      'users',
      'profiles',
      'media_items',
      'watch_progress',
      'playlists',
      'user_ratings',
    ];

    for (const table of triggeredTables) {
      const pattern = new RegExp(
        `CREATE\\s+TRIGGER\\s+\\w+[\\s\\S]*?BEFORE\\s+UPDATE\\s+ON\\s+${table}`,
        'i',
      );
      expect(allSql, `Missing updated_at trigger on ${table}`).toMatch(pattern);
    }
  });

  it('should use TIMESTAMPTZ (not TIMESTAMP) for all timestamp columns', () => {
    // TIMESTAMPTZ is timezone-aware — required for a multi-timezone app
    const timestampMatches = allSql.match(/TIMESTAMP\b(?!TZ)/gi);
    // Filter out false positives from comments
    const stripped = allSql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const bareTimestamp = stripped.match(/\bTIMESTAMP\b(?!TZ)/gi);
    expect(
      bareTimestamp,
      'Found TIMESTAMP without TZ suffix — use TIMESTAMPTZ',
    ).toBeNull();
  });
});
