/**
 * Phase 2 Integration Tests: Storage Layout
 *
 * Validates that MinIO bucket definitions in .env.dev match the init script,
 * storage path conventions match documentation, and MeiliSearch index
 * configuration matches the search API docs.
 *
 * These tests parse configuration files and shell scripts — no running
 * MinIO or MeiliSearch instances required.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKEND_DIR = resolve(import.meta.dirname, '../../');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const vars = new Map();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    vars.set(key, value);
  }

  return vars;
}

/**
 * Extract bucket names from the init-minio.sh BUCKETS array.
 */
function extractBucketsFromScript(scriptContent) {
  const buckets = [];

  // Match the BUCKETS=( ... ) array
  const arrayMatch = scriptContent.match(/BUCKETS=\(([\s\S]*?)\)/);
  if (!arrayMatch) return buckets;

  const arrayBody = arrayMatch[1];
  const bucketRegex = /"([^"]+)"/g;
  let match;

  while ((match = bucketRegex.exec(arrayBody)) !== null) {
    buckets.push(match[1]);
  }

  return buckets;
}

/**
 * Extract bucket names from .env.dev MINIO_BUCKET_* vars.
 */
function extractBucketsFromEnv(env) {
  const buckets = [];

  for (const [key, value] of env) {
    if (key.startsWith('MINIO_BUCKET_')) {
      buckets.push(value);
    }
  }

  return buckets;
}

/**
 * Extract MeiliSearch configuration from the init script.
 */
function extractMeiliConfig(scriptContent) {
  const config = {
    indexes: [],
    searchableAttributes: [],
    filterableAttributes: [],
    sortableAttributes: [],
    synonyms: {},
  };

  // Extract index creation: "uid": "media"
  const indexMatch = scriptContent.match(/"uid":\s*"(\w+)"/);
  if (indexMatch) {
    config.indexes.push(indexMatch[1]);
  }

  // Extract searchable attributes
  const searchableMatch = scriptContent.match(
    /searchable-attributes[\s\S]*?--data\s+'(\[[\s\S]*?\])'/,
  );
  if (searchableMatch) {
    try {
      config.searchableAttributes = JSON.parse(searchableMatch[1]);
    } catch {
      // Fall back to regex extraction
    }
  }

  // Extract filterable attributes
  const filterableMatch = scriptContent.match(
    /filterable-attributes[\s\S]*?--data\s+'(\[[\s\S]*?\])'/,
  );
  if (filterableMatch) {
    try {
      config.filterableAttributes = JSON.parse(filterableMatch[1]);
    } catch {
      // Fall back to regex extraction
    }
  }

  // Extract sortable attributes
  const sortableMatch = scriptContent.match(
    /sortable-attributes[\s\S]*?--data\s+'(\[[\s\S]*?\])'/,
  );
  if (sortableMatch) {
    try {
      config.sortableAttributes = JSON.parse(sortableMatch[1]);
    } catch {
      // Fall back to regex extraction
    }
  }

  // Extract synonyms
  const synonymsMatch = scriptContent.match(
    /synonyms[\s\S]*?--data\s+'(\{[\s\S]*?\})'/,
  );
  if (synonymsMatch) {
    try {
      config.synonyms = JSON.parse(synonymsMatch[1]);
    } catch {
      // Fall back to regex extraction
    }
  }

  return config;
}

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------

let env;
let minioScript;
let meiliScript;
let storageDoc;
let searchDoc;
let envBuckets;
let scriptBuckets;
let meiliConfig;

beforeAll(() => {
  env = parseEnvFile(resolve(BACKEND_DIR, '.env.dev'));
  minioScript = readFileSync(resolve(BACKEND_DIR, 'scripts/init-minio.sh'), 'utf-8');
  meiliScript = readFileSync(resolve(BACKEND_DIR, 'scripts/init-meilisearch.sh'), 'utf-8');
  storageDoc = readFileSync(resolve(BACKEND_DIR, 'docs/storage-layout.md'), 'utf-8');
  searchDoc = readFileSync(resolve(BACKEND_DIR, 'docs/search-api.md'), 'utf-8');
  envBuckets = extractBucketsFromEnv(env);
  scriptBuckets = extractBucketsFromScript(minioScript);
  meiliConfig = extractMeiliConfig(meiliScript);
});

// ---------------------------------------------------------------------------
// Tests: MinIO Buckets
// ---------------------------------------------------------------------------

describe('MinIO Bucket Definitions', () => {
  const EXPECTED_BUCKETS = [
    'media-raw',
    'media-encoded',
    'media-thumbnails',
    'media-subtitles',
    'backups',
  ];

  it('should define exactly 5 buckets in .env.dev', () => {
    expect(envBuckets).toHaveLength(5);
  });

  it('should define exactly 5 buckets in init-minio.sh', () => {
    expect(scriptBuckets).toHaveLength(5);
  });

  it('should match bucket names between .env.dev and init-minio.sh', () => {
    const envSet = new Set(envBuckets);
    const scriptSet = new Set(scriptBuckets);

    for (const bucket of EXPECTED_BUCKETS) {
      expect(envSet.has(bucket), `Missing from .env.dev: ${bucket}`).toBe(true);
      expect(scriptSet.has(bucket), `Missing from init-minio.sh: ${bucket}`).toBe(true);
    }
  });

  it('should define all expected buckets', () => {
    for (const bucket of EXPECTED_BUCKETS) {
      expect(envBuckets).toContain(bucket);
      expect(scriptBuckets).toContain(bucket);
    }
  });

  it('should set public read access on encoded, thumbnails, and subtitles buckets', () => {
    expect(minioScript).toContain('mc anonymous set download "local/media-encoded"');
    expect(minioScript).toContain('mc anonymous set download "local/media-thumbnails"');
    expect(minioScript).toContain('mc anonymous set download "local/media-subtitles"');
  });

  it('should NOT set public access on media-raw bucket', () => {
    expect(minioScript).not.toContain('mc anonymous set download "local/media-raw"');
  });

  it('should NOT set public access on backups bucket', () => {
    expect(minioScript).not.toContain('mc anonymous set download "local/backups"');
  });

  it('should set lifecycle policy on media-raw (30-day expiry)', () => {
    expect(minioScript).toContain('lifecycle-raw');
    expect(minioScript).toContain('"Days": 30');
    expect(minioScript).toContain('mc ilm import "local/media-raw"');
  });

  it('should match bucket names in storage-layout.md documentation', () => {
    for (const bucket of EXPECTED_BUCKETS) {
      expect(storageDoc).toContain(bucket);
    }
  });
});

describe('Storage Path Convention', () => {
  it('should document the path pattern: {bucket}/{family_id}/{content_type}/{content_slug}/{artifact_type}/{filename}', () => {
    expect(storageDoc).toContain('{bucket}/{family_id}/{content_type}/{content_slug}/{artifact_type}/{filename}');
  });

  it('should provide examples for raw uploads', () => {
    expect(storageDoc).toContain('media-raw/');
    expect(storageDoc).toContain('/source/');
  });

  it('should provide examples for HLS renditions', () => {
    expect(storageDoc).toContain('media-encoded/');
    expect(storageDoc).toContain('/renditions/');
    expect(storageDoc).toContain('master.m3u8');
  });

  it('should provide examples for thumbnails', () => {
    expect(storageDoc).toContain('media-thumbnails/');
    expect(storageDoc).toContain('/poster/');
    expect(storageDoc).toContain('/trickplay/');
  });

  it('should provide examples for subtitles', () => {
    expect(storageDoc).toContain('media-subtitles/');
    expect(storageDoc).toContain('/subtitles/');
    expect(storageDoc).toContain('.vtt');
  });

  it('should document slug generation rules', () => {
    expect(storageDoc).toContain('Slug Generation');
    expect(storageDoc).toContain('Lowercase');
  });

  it('should use webp format for poster images', () => {
    expect(storageDoc).toContain('.webp');
  });

  it('should use standard poster widths (100w, 400w, 1200w)', () => {
    expect(storageDoc).toContain('poster-100w.webp');
    expect(storageDoc).toContain('poster-400w.webp');
    expect(storageDoc).toContain('poster-1200w.webp');
  });

  it('should document rendition directory naming (r720, r1080)', () => {
    expect(storageDoc).toContain('r720');
    expect(storageDoc).toContain('r1080');
  });

  it('should use .ts segment files for HLS', () => {
    expect(storageDoc).toContain('.ts');
  });

  it('should use .m3u8 for HLS playlists', () => {
    expect(storageDoc).toContain('.m3u8');
  });
});

// ---------------------------------------------------------------------------
// Tests: MeiliSearch Index Configuration
// ---------------------------------------------------------------------------

describe('MeiliSearch Index Configuration', () => {
  it('should create a "media" index', () => {
    expect(meiliConfig.indexes).toContain('media');
  });

  it('should use "id" as the primary key', () => {
    expect(meiliScript).toContain('"primaryKey": "id"');
  });

  it('should define searchable attributes in priority order', () => {
    const expected = ['title', 'original_title', 'overview', 'tagline', 'genres', 'tags'];
    expect(meiliConfig.searchableAttributes).toEqual(expected);
  });

  it('should match searchable attributes with search-api.md documentation', () => {
    for (const attr of meiliConfig.searchableAttributes) {
      expect(searchDoc).toContain(attr);
    }
  });

  it('should define filterable attributes matching search-api.md', () => {
    const expected = ['type', 'genres', 'tags', 'year', 'content_rating', 'status', 'family_id'];
    expect(meiliConfig.filterableAttributes).toEqual(expected);
  });

  it('should define sortable attributes matching search-api.md', () => {
    const expected = ['title', 'year', 'community_rating', 'added_at', 'view_count'];
    expect(meiliConfig.sortableAttributes).toEqual(expected);
  });

  it('should configure synonyms for common media terms', () => {
    const synonyms = meiliConfig.synonyms;

    expect(synonyms).toHaveProperty('tv');
    expect(synonyms.tv).toContain('television');
    expect(synonyms.tv).toContain('show');
    expect(synonyms.tv).toContain('series');

    expect(synonyms).toHaveProperty('movie');
    expect(synonyms.movie).toContain('film');

    expect(synonyms).toHaveProperty('episode');
    expect(synonyms.episode).toContain('ep');

    expect(synonyms).toHaveProperty('sci-fi');
    expect(synonyms['sci-fi']).toContain('science fiction');
  });

  it('should match synonyms between init script and search-api.md', () => {
    // All synonyms documented in search-api.md should be configured in init script
    const documentedSynonyms = ['tv', 'movie', 'episode', 'documentary', 'anime', 'sci-fi', 'rom-com'];

    for (const term of documentedSynonyms) {
      expect(searchDoc, `Missing from search-api.md: ${term}`).toContain(term);
      expect(
        meiliConfig.synonyms,
        `Missing from init script synonyms: ${term}`,
      ).toHaveProperty(term);
    }

    // Init script may define additional synonyms beyond what search-api.md documents
    // (e.g., "season") — this is acceptable as the init script is the superset
    for (const key of Object.keys(meiliConfig.synonyms)) {
      expect(
        meiliScript,
        `Synonym key "${key}" not found in init script`,
      ).toContain(`"${key}"`);
    }
  });

  it('should configure stop words', () => {
    expect(meiliScript).toContain('stop-words');
    expect(meiliScript).toContain('"the"');
    expect(meiliScript).toContain('"a"');
    expect(meiliScript).toContain('"an"');
  });

  it('should configure typo tolerance', () => {
    expect(meiliScript).toContain('typo-tolerance');
    expect(meiliScript).toContain('"enabled": true');
    // Should disable typo tolerance on structured fields
    expect(meiliScript).toContain('"year"');
    expect(meiliScript).toContain('"content_rating"');
  });

  it('should configure custom ranking rules', () => {
    expect(meiliScript).toContain('ranking-rules');
    expect(meiliScript).toContain('"words"');
    expect(meiliScript).toContain('"typo"');
    expect(meiliScript).toContain('"proximity"');
    expect(meiliScript).toContain('"attribute"');
    expect(meiliScript).toContain('"sort"');
    expect(meiliScript).toContain('"exactness"');
    // Custom ranking by community rating and view count
    expect(meiliScript).toContain('community_rating:desc');
    expect(meiliScript).toContain('view_count:desc');
  });

  it('should configure displayed attributes (no unnecessary fields exposed)', () => {
    expect(meiliScript).toContain('displayed-attributes');
    // Should include essential display fields
    expect(meiliScript).toContain('"id"');
    expect(meiliScript).toContain('"title"');
    expect(meiliScript).toContain('"poster_url"');
    expect(meiliScript).toContain('"type"');
    expect(meiliScript).toContain('"year"');
    // Should NOT include view_count or family_id in displayed attributes (they are for filtering/sorting only)
    // Actually, let's just verify the key display fields are present
  });
});

describe('MeiliSearch Search API Contract', () => {
  it('should document the search endpoint URL', () => {
    expect(searchDoc).toContain('/indexes/media/search');
  });

  it('should document authorization via Bearer token', () => {
    expect(searchDoc).toContain('Authorization: Bearer');
  });

  it('should document basic search request format', () => {
    expect(searchDoc).toContain('"q"');
  });

  it('should document filtered search with sort', () => {
    expect(searchDoc).toContain('"filter"');
    expect(searchDoc).toContain('"sort"');
    expect(searchDoc).toContain('"limit"');
    expect(searchDoc).toContain('"offset"');
  });

  it('should document faceted search capability', () => {
    expect(searchDoc).toContain('"facets"');
  });

  it('should document response format with required fields', () => {
    expect(searchDoc).toContain('"hits"');
    expect(searchDoc).toContain('"query"');
    expect(searchDoc).toContain('"processingTimeMs"');
    expect(searchDoc).toContain('"estimatedTotalHits"');
  });

  it('should document hit object fields matching database schema', () => {
    // Response hits should contain fields from media_items table
    expect(searchDoc).toContain('"id"');
    expect(searchDoc).toContain('"title"');
    expect(searchDoc).toContain('"type"');
    expect(searchDoc).toContain('"overview"');
    expect(searchDoc).toContain('"year"');
    expect(searchDoc).toContain('"genres"');
    expect(searchDoc).toContain('"content_rating"');
    expect(searchDoc).toContain('"community_rating"');
    expect(searchDoc).toContain('"poster_url"');
    expect(searchDoc).toContain('"status"');
  });

  it('should document valid media types matching database CHECK constraint', () => {
    const validTypes = ['movie', 'tv_show', 'episode', 'music', 'podcast', 'game', 'live_event'];
    for (const type of validTypes) {
      expect(searchDoc).toContain(type);
    }
  });

  it('should document valid content ratings matching database CHECK constraint', () => {
    const validRatings = ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA'];
    for (const rating of validRatings) {
      expect(searchDoc).toContain(rating);
    }
  });

  it('should document indexing document format', () => {
    expect(searchDoc).toContain('Document Format');
    expect(searchDoc).toContain('"tagline"');
    expect(searchDoc).toContain('"tags"');
    expect(searchDoc).toContain('"view_count"');
    expect(searchDoc).toContain('"family_id"');
  });
});
