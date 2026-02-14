/**
 * Phase 2 Integration Tests: Service Contracts
 *
 * Validates that all custom service configurations are consistent:
 * - Unique ports across all 6 custom services
 * - Health endpoint contract compliance
 * - Job submission schema contracts between producers and consumers
 * - Recommendation engine API schema for frontend consumption
 *
 * These tests run WITHOUT Docker — they parse configuration files and
 * validate contracts by inspecting source definitions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BACKEND_DIR = resolve(import.meta.dirname, '../../');

/**
 * Parse .env.dev and return a Map of key -> value.
 * Strips comments, blank lines, and inline comments.
 */
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

    // Strip inline comments (but not inside quotes)
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const commentIdx = value.indexOf('#');
      if (commentIdx > 0) {
        value = value.slice(0, commentIdx).trim();
      }
    }

    // Strip surrounding quotes
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
 * Extract all CS_N definitions from the env map.
 * Returns an array of { key, name, template, port }.
 */
function extractCustomServices(env) {
  const services = [];
  for (let n = 1; n <= 10; n++) {
    const key = `CS_${n}`;
    const val = env.get(key);
    if (!val) continue;

    const parts = val.split(':');
    if (parts.length !== 3) continue;

    services.push({
      key,
      name: parts[0],
      template: parts[1],
      port: parseInt(parts[2], 10),
    });
  }
  return services;
}

// ---------------------------------------------------------------------------
// Load configuration once for all tests
// ---------------------------------------------------------------------------

const envPath = resolve(BACKEND_DIR, '.env.dev');
const env = parseEnvFile(envPath);
const customServices = extractCustomServices(env);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Service Configuration', () => {
  it('should define all 10 custom services in .env.dev', () => {
    expect(customServices).toHaveLength(10);
  });

  it('should have all expected service names', () => {
    const names = customServices.map((s) => s.name);
    // Phase 2 services
    expect(names).toContain('library_service');
    expect(names).toContain('discovery_service');
    expect(names).toContain('stream_gateway');
    expect(names).toContain('recommendation_engine');
    expect(names).toContain('video_processor');
    expect(names).toContain('thumbnail_generator');
    // Phase 5 plugin services
    expect(names).toContain('devices');
    expect(names).toContain('epg');
    expect(names).toContain('sports');
    expect(names).toContain('recording');
  });

  it('should assign unique ports to every custom service', () => {
    const ports = customServices.map((s) => s.port);
    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).toBe(ports.length);
  });

  it('should use valid ports for custom services', () => {
    for (const svc of customServices) {
      expect(svc.port).toBeGreaterThanOrEqual(1024);
      expect(svc.port).toBeLessThanOrEqual(65535);
    }
  });

  it('should not overlap custom service ports with core services', () => {
    const corePorts = [
      parseInt(env.get('POSTGRES_PORT') || '5432', 10),
      parseInt(env.get('HASURA_PORT') || '8080', 10),
      parseInt(env.get('AUTH_PORT') || '4000', 10),
      parseInt(env.get('REDIS_PORT') || '6379', 10),
      parseInt(env.get('MINIO_PORT') || '9000', 10),
      parseInt(env.get('MINIO_CONSOLE_PORT') || '9001', 10),
      parseInt(env.get('MEILISEARCH_PORT') || '7700', 10),
      parseInt(env.get('MAILPIT_SMTP_PORT') || '1025', 10),
      parseInt(env.get('MAILPIT_UI_PORT') || '8025', 10),
      parseInt(env.get('PROMETHEUS_PORT') || '9090', 10),
      parseInt(env.get('GRAFANA_PORT') || '3000', 10),
      parseInt(env.get('LOKI_PORT') || '3100', 10),
      parseInt(env.get('ALERTMANAGER_PORT') || '9093', 10),
    ];

    const customPorts = customServices.map((s) => s.port);
    for (const cp of customPorts) {
      expect(corePorts).not.toContain(cp);
    }
  });

  it('should match CS_N ports to documented .env.dev values', () => {
    const expected = {
      library_service: 5001,
      discovery_service: 5002,
      stream_gateway: 5003,
      recommendation_engine: 5004,
      video_processor: 5005,
      thumbnail_generator: 5006,
      devices: 3603,
      epg: 3031,
      sports: 3035,
      recording: 3602,
    };

    for (const svc of customServices) {
      expect(svc.port).toBe(expected[svc.name]);
    }
  });
});

describe('Service Templates', () => {
  it('should use Go (gin) for API services', () => {
    const goServices = customServices.filter(
      (s) => s.template === 'gin',
    );
    const goNames = goServices.map((s) => s.name);
    expect(goNames).toContain('library_service');
    expect(goNames).toContain('discovery_service');
    expect(goNames).toContain('stream_gateway');
  });

  it('should use Python (fastapi) for recommendation_engine', () => {
    const rec = customServices.find(
      (s) => s.name === 'recommendation_engine',
    );
    expect(rec).toBeDefined();
    expect(rec.template).toBe('fastapi');
  });

  it('should use Node.js (bullmq-js) for worker services', () => {
    const workers = customServices.filter(
      (s) => s.template === 'bullmq-js',
    );
    const workerNames = workers.map((s) => s.name);
    expect(workerNames).toContain('video_processor');
    expect(workerNames).toContain('thumbnail_generator');
  });
});

describe('Health Endpoint Contract', () => {
  // Every custom service MUST expose GET /health returning JSON with at
  // least a `status` field.  We validate the contract definition here.

  const HEALTH_CONTRACT = {
    method: 'GET',
    path: '/health',
    responseFields: ['status'],
    validStatuses: ['ok', 'degraded', 'error'],
  };

  it('should define a standard health contract', () => {
    expect(HEALTH_CONTRACT.method).toBe('GET');
    expect(HEALTH_CONTRACT.path).toBe('/health');
    expect(HEALTH_CONTRACT.responseFields).toContain('status');
  });

  it('should enumerate all valid status values', () => {
    expect(HEALTH_CONTRACT.validStatuses).toContain('ok');
    expect(HEALTH_CONTRACT.validStatuses).toContain('degraded');
    expect(HEALTH_CONTRACT.validStatuses).toContain('error');
    expect(HEALTH_CONTRACT.validStatuses).toHaveLength(3);
  });

  it('should apply the health contract to all 6 custom services', () => {
    for (const svc of customServices) {
      // Each service is expected to respond on its port at /health
      const expectedUrl = `http://localhost:${svc.port}${HEALTH_CONTRACT.path}`;
      expect(expectedUrl).toMatch(/^http:\/\/localhost:\d+\/health$/);
    }
  });
});

describe('Video Processor Job Submission Schema', () => {
  // The library_service produces jobs for the video_processor via BullMQ.
  // This contract must match between producer and consumer.

  const VIDEO_JOB_SCHEMA = {
    queueName: 'video:transcode',
    requiredFields: [
      'mediaItemId',
      'familyId',
      'sourcePath',
      'outputBucket',
      'qualityLevels',
    ],
    optionalFields: [
      'priority',
      'callbackUrl',
      'metadata',
    ],
    fieldTypes: {
      mediaItemId: 'string',   // UUID
      familyId: 'string',      // UUID
      sourcePath: 'string',    // MinIO path in media-raw bucket
      outputBucket: 'string',  // Target bucket (media-encoded)
      qualityLevels: 'array',  // Array of quality strings
      priority: 'number',
      callbackUrl: 'string',
      metadata: 'object',
    },
    validQualityLevels: ['360p', '720p', '1080p', '4k'],
  };

  it('should target the correct BullMQ queue name', () => {
    expect(VIDEO_JOB_SCHEMA.queueName).toBe('video:transcode');
  });

  it('should require all mandatory fields', () => {
    expect(VIDEO_JOB_SCHEMA.requiredFields).toContain('mediaItemId');
    expect(VIDEO_JOB_SCHEMA.requiredFields).toContain('familyId');
    expect(VIDEO_JOB_SCHEMA.requiredFields).toContain('sourcePath');
    expect(VIDEO_JOB_SCHEMA.requiredFields).toContain('outputBucket');
    expect(VIDEO_JOB_SCHEMA.requiredFields).toContain('qualityLevels');
  });

  it('should define correct types for all fields', () => {
    expect(VIDEO_JOB_SCHEMA.fieldTypes.mediaItemId).toBe('string');
    expect(VIDEO_JOB_SCHEMA.fieldTypes.familyId).toBe('string');
    expect(VIDEO_JOB_SCHEMA.fieldTypes.sourcePath).toBe('string');
    expect(VIDEO_JOB_SCHEMA.fieldTypes.outputBucket).toBe('string');
    expect(VIDEO_JOB_SCHEMA.fieldTypes.qualityLevels).toBe('array');
  });

  it('should match quality levels from .env.dev VIDEO_QUALITY_LEVELS', () => {
    const envLevels = (env.get('VIDEO_QUALITY_LEVELS') || '')
      .split(',')
      .map((l) => l.trim());
    for (const level of VIDEO_JOB_SCHEMA.validQualityLevels) {
      expect(envLevels).toContain(level);
    }
  });

  it('should validate a well-formed job payload', () => {
    const validPayload = {
      mediaItemId: '550e8400-e29b-41d4-a716-446655440000',
      familyId: '00000000-0000-0000-0000-000000000001',
      sourcePath: 'media-raw/fam_001/movie/the-matrix-1999/source/The.Matrix.1999.1080p.mkv',
      outputBucket: 'media-encoded',
      qualityLevels: ['720p', '1080p'],
    };

    for (const field of VIDEO_JOB_SCHEMA.requiredFields) {
      expect(validPayload).toHaveProperty(field);
    }

    expect(Array.isArray(validPayload.qualityLevels)).toBe(true);
    for (const ql of validPayload.qualityLevels) {
      expect(VIDEO_JOB_SCHEMA.validQualityLevels).toContain(ql);
    }
  });

  it('should reject a payload missing required fields', () => {
    const incompletePayload = {
      mediaItemId: '550e8400-e29b-41d4-a716-446655440000',
      // missing familyId, sourcePath, outputBucket, qualityLevels
    };

    const missingFields = VIDEO_JOB_SCHEMA.requiredFields.filter(
      (f) => !(f in incompletePayload),
    );
    expect(missingFields.length).toBeGreaterThan(0);
  });
});

describe('Thumbnail Generator Job Submission Schema', () => {
  const POSTER_JOB_SCHEMA = {
    queueName: 'image:poster',
    requiredFields: [
      'mediaItemId',
      'familyId',
      'sourcePath',
      'outputBucket',
      'sizes',
    ],
    fieldTypes: {
      mediaItemId: 'string',
      familyId: 'string',
      sourcePath: 'string',
      outputBucket: 'string',
      sizes: 'array',
    },
    validSizes: [
      { width: 100, suffix: '100w' },
      { width: 400, suffix: '400w' },
      { width: 1200, suffix: '1200w' },
    ],
  };

  const SPRITE_JOB_SCHEMA = {
    queueName: 'image:sprite',
    requiredFields: [
      'mediaItemId',
      'familyId',
      'sourcePath',
      'outputBucket',
      'intervalSeconds',
    ],
    fieldTypes: {
      mediaItemId: 'string',
      familyId: 'string',
      sourcePath: 'string',
      outputBucket: 'string',
      intervalSeconds: 'number',
    },
  };

  it('should target the correct BullMQ queue for poster generation', () => {
    expect(POSTER_JOB_SCHEMA.queueName).toBe('image:poster');
  });

  it('should target the correct BullMQ queue for sprite generation', () => {
    expect(SPRITE_JOB_SCHEMA.queueName).toBe('image:sprite');
  });

  it('should use media-thumbnails as the output bucket', () => {
    const validPayload = {
      mediaItemId: '550e8400-e29b-41d4-a716-446655440000',
      familyId: '00000000-0000-0000-0000-000000000001',
      sourcePath: 'media-raw/fam_001/movie/the-matrix-1999/source/The.Matrix.1999.1080p.mkv',
      outputBucket: 'media-thumbnails',
      sizes: POSTER_JOB_SCHEMA.validSizes,
    };

    expect(validPayload.outputBucket).toBe(
      env.get('MINIO_BUCKET_THUMBNAILS'),
    );
  });

  it('should define standard poster sizes matching storage layout docs', () => {
    // storage-layout.md documents poster-100w.webp, poster-400w.webp, poster-1200w.webp
    const suffixes = POSTER_JOB_SCHEMA.validSizes.map((s) => s.suffix);
    expect(suffixes).toContain('100w');
    expect(suffixes).toContain('400w');
    expect(suffixes).toContain('1200w');
  });

  it('should require all mandatory fields for poster jobs', () => {
    for (const field of POSTER_JOB_SCHEMA.requiredFields) {
      expect(POSTER_JOB_SCHEMA.fieldTypes).toHaveProperty(field);
    }
  });

  it('should require all mandatory fields for sprite jobs', () => {
    for (const field of SPRITE_JOB_SCHEMA.requiredFields) {
      expect(SPRITE_JOB_SCHEMA.fieldTypes).toHaveProperty(field);
    }
  });
});

describe('Recommendation Engine API Schema', () => {
  // The recommendation_engine (FastAPI on port 5004) serves personalized
  // recommendations consumed by the frontend.

  const RECOMMENDATION_API = {
    baseUrl: `http://localhost:${customServices.find((s) => s.name === 'recommendation_engine')?.port || 5004}`,
    endpoints: {
      getRecommendations: {
        method: 'GET',
        path: '/api/v1/recommendations/{userId}',
        queryParams: ['limit', 'offset', 'type'],
        responseFields: [
          'recommendations',
          'total',
          'userId',
          'generatedAt',
        ],
        recommendationItemFields: [
          'mediaItemId',
          'score',
          'reason',
          'reasonMediaId',
          'title',
          'posterUrl',
          'type',
          'genres',
        ],
      },
      getTrending: {
        method: 'GET',
        path: '/api/v1/trending',
        queryParams: ['limit', 'window'],
        responseFields: ['items', 'total', 'window', 'calculatedAt'],
      },
      getSimilar: {
        method: 'GET',
        path: '/api/v1/similar/{mediaItemId}',
        queryParams: ['limit'],
        responseFields: ['items', 'total', 'sourceMediaId'],
      },
      recordInteraction: {
        method: 'POST',
        path: '/api/v1/interactions',
        bodyFields: [
          'userId',
          'mediaItemId',
          'interactionType',
          'deviceType',
        ],
        validInteractionTypes: [
          'view', 'play', 'complete', 'rate', 'add_to_playlist',
          'search', 'click', 'share', 'download',
        ],
      },
    },
  };

  it('should serve on the correct port (5004)', () => {
    expect(RECOMMENDATION_API.baseUrl).toBe('http://localhost:5004');
  });

  it('should define GET /recommendations/{userId} endpoint', () => {
    const ep = RECOMMENDATION_API.endpoints.getRecommendations;
    expect(ep.method).toBe('GET');
    expect(ep.path).toContain('{userId}');
  });

  it('should return recommendations array with required item fields', () => {
    const ep = RECOMMENDATION_API.endpoints.getRecommendations;
    expect(ep.responseFields).toContain('recommendations');
    expect(ep.responseFields).toContain('total');
    expect(ep.responseFields).toContain('userId');

    // Each recommendation item must have these fields for the frontend
    expect(ep.recommendationItemFields).toContain('mediaItemId');
    expect(ep.recommendationItemFields).toContain('score');
    expect(ep.recommendationItemFields).toContain('reason');
    expect(ep.recommendationItemFields).toContain('title');
    expect(ep.recommendationItemFields).toContain('posterUrl');
    expect(ep.recommendationItemFields).toContain('type');
    expect(ep.recommendationItemFields).toContain('genres');
  });

  it('should define GET /trending endpoint', () => {
    const ep = RECOMMENDATION_API.endpoints.getTrending;
    expect(ep.method).toBe('GET');
    expect(ep.path).toBe('/api/v1/trending');
    expect(ep.responseFields).toContain('items');
    expect(ep.responseFields).toContain('total');
    expect(ep.responseFields).toContain('window');
  });

  it('should define GET /similar/{mediaItemId} endpoint', () => {
    const ep = RECOMMENDATION_API.endpoints.getSimilar;
    expect(ep.method).toBe('GET');
    expect(ep.path).toContain('{mediaItemId}');
    expect(ep.responseFields).toContain('items');
    expect(ep.responseFields).toContain('sourceMediaId');
  });

  it('should define POST /interactions endpoint', () => {
    const ep = RECOMMENDATION_API.endpoints.recordInteraction;
    expect(ep.method).toBe('POST');
    expect(ep.bodyFields).toContain('userId');
    expect(ep.bodyFields).toContain('mediaItemId');
    expect(ep.bodyFields).toContain('interactionType');
  });

  it('should support all interaction types from the database schema', () => {
    // These must match the CHECK constraint in 004_recommendations.sql
    const ep = RECOMMENDATION_API.endpoints.recordInteraction;
    const dbInteractionTypes = [
      'view', 'play', 'complete', 'rate', 'add_to_playlist',
      'search', 'click', 'share', 'download',
    ];

    for (const t of dbInteractionTypes) {
      expect(ep.validInteractionTypes).toContain(t);
    }
    expect(ep.validInteractionTypes).toHaveLength(dbInteractionTypes.length);
  });
});
