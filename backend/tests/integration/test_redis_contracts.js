/**
 * Phase 2 Integration Tests: Redis Contracts
 *
 * Validates that Redis key namespaces, queue names, TTL values, and session
 * formats are consistent between the documentation (redis-usage.md) and the
 * service configurations.
 *
 * These tests parse documentation and configuration files — no running
 * Redis instance required.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKEND_DIR = resolve(import.meta.dirname, '../../');
const REDIS_DOC_PATH = resolve(BACKEND_DIR, 'docs/redis-usage.md');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadRedisDoc() {
  return readFileSync(REDIS_DOC_PATH, 'utf-8');
}

/**
 * Extract key prefix patterns from the redis-usage.md documentation.
 * Parses the markdown table under "Namespace Convention".
 */
function extractDocumentedNamespaces(doc) {
  const namespaces = [];

  // Match table rows with prefix patterns: | `prefix` | purpose | service |
  const tableRowRegex = /\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/g;
  let match;

  while ((match = tableRowRegex.exec(doc)) !== null) {
    const prefix = match[1].trim();
    const purpose = match[2].trim();
    const service = match[3].trim();

    // Skip header rows
    if (prefix === 'Prefix' || prefix.startsWith('---')) continue;

    namespaces.push({ prefix, purpose, service });
  }

  return namespaces;
}

/**
 * Extract queue definitions from the redis-usage.md documentation.
 * Parses the queue tables under "Job Queues (BullMQ)".
 */
function extractDocumentedQueues(doc) {
  const queues = [];

  // Match queue table rows: | `queue_name` | consumer | concurrency | retry |
  const queueRowRegex = /\|\s*`([^`]+)`\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*([^|]+)\|/g;
  let match;

  while ((match = queueRowRegex.exec(doc)) !== null) {
    const queue = match[1].trim();
    const consumer = match[2].trim();
    const concurrency = parseInt(match[3].trim(), 10);
    const retry = match[4].trim();

    // Skip header rows
    if (queue === 'Queue' || queue.startsWith('---')) continue;

    queues.push({ queue, consumer, concurrency, retry });
  }

  return queues;
}

/**
 * Extract TTL values from the redis-usage.md documentation.
 */
function extractDocumentedTTLs(doc) {
  const ttls = [];

  // Match TTL table rows: | `key_pattern` | TTL | Rationale |
  const ttlRowRegex = /\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/g;
  let match;

  // Focus on the TTL Configuration section
  const ttlSection = doc.split('### TTL Configuration')[1]?.split('##')[0] || '';

  while ((match = ttlRowRegex.exec(ttlSection)) !== null) {
    const keyPattern = match[1].trim();
    const ttlStr = match[2].trim();
    const rationale = match[3].trim();

    if (keyPattern === 'Key Pattern' || keyPattern.startsWith('---')) continue;

    ttls.push({ keyPattern, ttlStr, rationale });
  }

  return ttls;
}

/**
 * Parse a human-readable TTL string into seconds.
 * Examples: "15 min" -> 900, "1 hour" -> 3600, "5 min" -> 300
 */
function parseTTLToSeconds(ttlStr) {
  const normalized = ttlStr.toLowerCase().trim();

  const minuteMatch = normalized.match(/(\d+)\s*min/);
  if (minuteMatch) return parseInt(minuteMatch[1], 10) * 60;

  const hourMatch = normalized.match(/(\d+)\s*hour/);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 3600;

  const dayMatch = normalized.match(/(\d+)\s*day/);
  if (dayMatch) return parseInt(dayMatch[1], 10) * 86400;

  const secMatch = normalized.match(/(\d+)\s*sec/);
  if (secMatch) return parseInt(secMatch[1], 10);

  return null;
}

// ---------------------------------------------------------------------------
// Load documentation
// ---------------------------------------------------------------------------

let redisDoc;
let namespaces;
let queues;
let ttls;

beforeAll(() => {
  redisDoc = loadRedisDoc();
  namespaces = extractDocumentedNamespaces(redisDoc);
  queues = extractDocumentedQueues(redisDoc);
  ttls = extractDocumentedTTLs(redisDoc);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Redis Namespace Convention', () => {
  it('should document all required key namespaces', () => {
    const prefixes = namespaces.map((n) => n.prefix);

    // BullMQ queue namespaces
    expect(prefixes).toContainEqual(expect.stringContaining('bull:video'));
    expect(prefixes).toContainEqual(expect.stringContaining('bull:image'));

    // Cache namespaces
    expect(prefixes).toContainEqual(expect.stringContaining('cache:trending'));
    expect(prefixes).toContainEqual(expect.stringContaining('cache:popular'));
    expect(prefixes).toContainEqual(expect.stringContaining('cache:recent'));
    expect(prefixes).toContainEqual(expect.stringContaining('cache:recommendations'));
    expect(prefixes).toContainEqual(expect.stringContaining('cache:search'));

    // Session namespace
    expect(prefixes).toContainEqual(expect.stringContaining('session:'));

    // Ingest pipeline namespace
    expect(prefixes).toContainEqual(expect.stringContaining('ingest:'));
  });

  it('should assign each namespace to a specific service', () => {
    for (const ns of namespaces) {
      expect(ns.service).toBeTruthy();
      expect(ns.service.length).toBeGreaterThan(0);
    }
  });

  it('should use colon-separated hierarchical keys', () => {
    for (const ns of namespaces) {
      // All namespaces should use colon as separator
      expect(ns.prefix).toMatch(/^\w+:/);
    }
  });

  it('should assign video queue namespaces to video_processor', () => {
    const videoNs = namespaces.find((n) => n.prefix.startsWith('bull:video'));
    expect(videoNs).toBeDefined();
    expect(videoNs.service).toBe('video_processor');
  });

  it('should assign image queue namespaces to thumbnail_generator', () => {
    const imageNs = namespaces.find((n) => n.prefix.startsWith('bull:image'));
    expect(imageNs).toBeDefined();
    expect(imageNs.service).toBe('thumbnail_generator');
  });

  it('should assign cache:trending to discovery_service', () => {
    const trendingNs = namespaces.find((n) => n.prefix === 'cache:trending');
    expect(trendingNs).toBeDefined();
    expect(trendingNs.service).toBe('discovery_service');
  });

  it('should assign cache:recommendations to recommendation_engine', () => {
    const recNs = namespaces.find((n) =>
      n.prefix.startsWith('cache:recommendations'),
    );
    expect(recNs).toBeDefined();
    expect(recNs.service).toBe('recommendation_engine');
  });

  it('should assign session namespace to stream_gateway', () => {
    const sessionNs = namespaces.find((n) =>
      n.prefix.startsWith('session:'),
    );
    expect(sessionNs).toBeDefined();
    expect(sessionNs.service).toBe('stream_gateway');
  });

  it('should assign ingest namespace to library_service', () => {
    const ingestNs = namespaces.find((n) =>
      n.prefix.startsWith('ingest:'),
    );
    expect(ingestNs).toBeDefined();
    expect(ingestNs.service).toBe('library_service');
  });
});

describe('BullMQ Queue Contracts', () => {
  it('should define exactly 6 queues (3 video + 3 image)', () => {
    expect(queues).toHaveLength(6);
  });

  it('should define video:transcode queue consumed by video_processor', () => {
    const q = queues.find((q) => q.queue === 'video:transcode');
    expect(q).toBeDefined();
    expect(q.consumer).toBe('video_processor');
  });

  it('should define video:trickplay queue consumed by video_processor', () => {
    const q = queues.find((q) => q.queue === 'video:trickplay');
    expect(q).toBeDefined();
    expect(q.consumer).toBe('video_processor');
  });

  it('should define video:subtitle queue consumed by video_processor', () => {
    const q = queues.find((q) => q.queue === 'video:subtitle');
    expect(q).toBeDefined();
    expect(q.consumer).toBe('video_processor');
  });

  it('should define image:poster queue consumed by thumbnail_generator', () => {
    const q = queues.find((q) => q.queue === 'image:poster');
    expect(q).toBeDefined();
    expect(q.consumer).toBe('thumbnail_generator');
  });

  it('should define image:sprite queue consumed by thumbnail_generator', () => {
    const q = queues.find((q) => q.queue === 'image:sprite');
    expect(q).toBeDefined();
    expect(q.consumer).toBe('thumbnail_generator');
  });

  it('should define image:optimize queue consumed by thumbnail_generator', () => {
    const q = queues.find((q) => q.queue === 'image:optimize');
    expect(q).toBeDefined();
    expect(q.consumer).toBe('thumbnail_generator');
  });

  it('should have concurrency >= 1 for all queues', () => {
    for (const q of queues) {
      expect(q.concurrency).toBeGreaterThanOrEqual(1);
    }
  });

  it('should have retry policy for all queues', () => {
    for (const q of queues) {
      expect(q.retry).toBeTruthy();
      expect(q.retry.toLowerCase()).toContain('attempt');
    }
  });

  it('should use exponential backoff for retry on all queues', () => {
    for (const q of queues) {
      expect(q.retry.toLowerCase()).toContain('exponential');
    }
  });

  it('should match queue names between producer and consumer documentation', () => {
    // Queue names produced by library_service must match what consumers listen on
    const videoQueues = queues
      .filter((q) => q.consumer === 'video_processor')
      .map((q) => q.queue);

    expect(videoQueues).toContain('video:transcode');
    expect(videoQueues).toContain('video:trickplay');
    expect(videoQueues).toContain('video:subtitle');

    const imageQueues = queues
      .filter((q) => q.consumer === 'thumbnail_generator')
      .map((q) => q.queue);

    expect(imageQueues).toContain('image:poster');
    expect(imageQueues).toContain('image:sprite');
    expect(imageQueues).toContain('image:optimize');
  });
});

describe('Default Job Options Contract', () => {
  it('should document default job options', () => {
    expect(redisDoc).toContain('attempts: 3');
    expect(redisDoc).toContain("type: 'exponential'");
    expect(redisDoc).toContain('delay: 2000');
  });

  it('should specify removeOnComplete policy', () => {
    expect(redisDoc).toContain('removeOnComplete');
    // Should keep completed jobs for reasonable duration
    expect(redisDoc).toContain('86400'); // 24 hours in seconds
    expect(redisDoc).toContain('1000');  // max count
  });

  it('should specify removeOnFail policy', () => {
    expect(redisDoc).toContain('removeOnFail');
    expect(redisDoc).toContain('604800'); // 7 days in seconds
  });
});

describe('Cache TTL Values', () => {
  it('should document TTL values for all cache keys', () => {
    expect(ttls.length).toBeGreaterThanOrEqual(5);
  });

  it('should have reasonable TTL for trending cache (5-30 min)', () => {
    const trending = ttls.find((t) => t.keyPattern === 'cache:trending');
    expect(trending).toBeDefined();

    const seconds = parseTTLToSeconds(trending.ttlStr);
    expect(seconds).not.toBeNull();
    expect(seconds).toBeGreaterThanOrEqual(5 * 60);   // at least 5 min
    expect(seconds).toBeLessThanOrEqual(30 * 60);      // at most 30 min
  });

  it('should have reasonable TTL for popular cache (30 min - 2 hours)', () => {
    const popular = ttls.find((t) => t.keyPattern === 'cache:popular');
    expect(popular).toBeDefined();

    const seconds = parseTTLToSeconds(popular.ttlStr);
    expect(seconds).not.toBeNull();
    expect(seconds).toBeGreaterThanOrEqual(30 * 60);   // at least 30 min
    expect(seconds).toBeLessThanOrEqual(2 * 3600);      // at most 2 hours
  });

  it('should have short TTL for recent cache (1-10 min)', () => {
    const recent = ttls.find((t) => t.keyPattern === 'cache:recent');
    expect(recent).toBeDefined();

    const seconds = parseTTLToSeconds(recent.ttlStr);
    expect(seconds).not.toBeNull();
    expect(seconds).toBeGreaterThanOrEqual(60);         // at least 1 min
    expect(seconds).toBeLessThanOrEqual(10 * 60);       // at most 10 min
  });

  it('should have reasonable TTL for recommendations cache (30 min - 2 hours)', () => {
    const recs = ttls.find((t) =>
      t.keyPattern.startsWith('cache:recommendations'),
    );
    expect(recs).toBeDefined();

    const seconds = parseTTLToSeconds(recs.ttlStr);
    expect(seconds).not.toBeNull();
    expect(seconds).toBeGreaterThanOrEqual(30 * 60);   // at least 30 min
    expect(seconds).toBeLessThanOrEqual(2 * 3600);      // at most 2 hours
  });

  it('should have reasonable TTL for search cache (5-30 min)', () => {
    const search = ttls.find((t) =>
      t.keyPattern.startsWith('cache:search'),
    );
    expect(search).toBeDefined();

    const seconds = parseTTLToSeconds(search.ttlStr);
    expect(seconds).not.toBeNull();
    expect(seconds).toBeGreaterThanOrEqual(5 * 60);    // at least 5 min
    expect(seconds).toBeLessThanOrEqual(30 * 60);       // at most 30 min
  });

  it('should have no TTL exceeding 24 hours for any cache key', () => {
    for (const ttl of ttls) {
      const seconds = parseTTLToSeconds(ttl.ttlStr);
      if (seconds !== null) {
        expect(
          seconds,
          `TTL for ${ttl.keyPattern} exceeds 24 hours`,
        ).toBeLessThanOrEqual(86400);
      }
    }
  });
});

describe('Session Key Format', () => {
  it('should document session key format as session:{sessionId}', () => {
    expect(redisDoc).toContain('session:{sessionId}');
  });

  it('should document session value fields', () => {
    const requiredSessionFields = [
      'userId',
      'mediaId',
      'deviceId',
      'familyId',
      'startedAt',
      'lastHeartbeat',
    ];

    for (const field of requiredSessionFields) {
      expect(redisDoc).toContain(field);
    }
  });

  it('should document session TTL as 300 seconds (5 minutes)', () => {
    expect(redisDoc).toContain('300');
    expect(redisDoc.toLowerCase()).toContain('heartbeat');
  });

  it('should document concurrent stream tracking keys', () => {
    expect(redisDoc).toContain('family_streams:{familyId}');
    expect(redisDoc).toContain('device_streams:{deviceId}');
  });

  it('should document concurrent stream limits', () => {
    // Family: max 10 concurrent streams
    expect(redisDoc).toContain('max 10 concurrent streams');
    // Device: max 2 concurrent streams
    expect(redisDoc).toContain('max 2 concurrent streams');
  });

  it('should use SET type for concurrent stream tracking', () => {
    expect(redisDoc).toContain('SET of sessionIds');
  });
});

describe('Redis Connection Configuration', () => {
  it('should document Redis host and port', () => {
    expect(redisDoc).toContain('REDIS_HOST');
    expect(redisDoc).toContain('REDIS_PORT');
    expect(redisDoc).toContain('6379');
  });

  it('should match REDIS_PORT in .env.dev', () => {
    const envContent = readFileSync(
      resolve(BACKEND_DIR, '.env.dev'),
      'utf-8',
    );
    expect(envContent).toContain('REDIS_PORT=6379');
  });

  it('should document the Docker service name for Redis', () => {
    expect(redisDoc).toContain('redis');
  });
});
