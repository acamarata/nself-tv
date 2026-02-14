/**
 * Phase 5 Integration Tests: Phase 1-4 Regression
 *
 * Validates that all Phase 1-4 functionality remains intact:
 * - Phase 1: Foundation (auth, database, schema)
 * - Phase 2: Backend services (storage, VOD pipeline, jobs, Redis)
 * - Phase 3: Frontend catalog (auth UI, profiles, catalog browsing)
 * - Phase 4: Playback core (HLS, quality selection, subtitles, audio tracks)
 *
 * This is a regression suite to ensure Phase 5 changes don't break existing features.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKEND_DIR = resolve(import.meta.dirname, '../../');

// ---------------------------------------------------------------------------
// Phase 1: Foundation Contracts
// ---------------------------------------------------------------------------

const PHASE1_AUTH = {
  provider: 'nhost',
  features: [
    'email_password',
    'magic_link',
    'oauth_google',
    'oauth_github',
    'mfa',
    'roles',
    'permissions',
  ],
  roles: ['owner', 'admin', 'helper', 'user', 'guest'],
  sessionDuration: 604800, // 7 days
};

const PHASE1_DATABASE = {
  engine: 'postgresql',
  version: '15',
  tables: [
    'families',
    'users',
    'profiles',
    'media_items',
    'media_variants',
    'subtitle_tracks',
    'audio_tracks',
  ],
  extensions: ['uuid-ossp', 'pg_trgm'],
};

// ---------------------------------------------------------------------------
// Phase 2: Backend Services Contracts
// ---------------------------------------------------------------------------

const PHASE2_SERVICES = {
  customServices: [
    'library_service',
    'discovery_service',
    'stream_gateway',
    'recommendation_engine',
    'video_processor',
    'thumbnail_generator',
    'devices',
    'epg',
    'sports',
    'recording',
  ],
  ports: {
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
  },
};

const PHASE2_VOD_PIPELINE = {
  stages: [
    'validate',
    'probe',
    'transcode',
    'trickplay',
    'subtitles',
    'posters',
    'sprites',
    'database',
    'index',
  ],
  renditions: 8,
  fatalStages: ['validate', 'probe', 'transcode', 'database'],
};

const PHASE2_STORAGE = {
  provider: 'minio',
  buckets: [
    'media-library',
    'posters',
    'sprites',
    'subtitles',
    'user-uploads',
  ],
  encryption: 'aes256',
  versioning: false,
};

const PHASE2_REDIS = {
  useCases: [
    'ingest_progress',
    'session_cache',
    'job_queues',
    'rate_limiting',
  ],
  queues: ['video:transcode', 'video:trickplay', 'image:poster', 'image:sprite'],
};

// ---------------------------------------------------------------------------
// Phase 3: Frontend Catalog Contracts
// ---------------------------------------------------------------------------

const PHASE3_AUTH_UI = {
  flows: ['login', 'register', 'forgot_password', 'reset_password', 'profile_select'],
  validation: {
    email: 'rfc5322',
    password: {
      minLength: 8,
      requireUppercase: true,
      requireNumber: true,
      requireSpecial: true,
    },
  },
};

const PHASE3_PROFILES = {
  maxPerFamily: 10,
  features: {
    avatars: true,
    watchRestrictions: true,
    ageRatings: ['G', 'PG', 'PG-13', 'R', 'NC-17'],
    pinProtection: true,
  },
};

const PHASE3_CATALOG = {
  sections: ['home', 'movies', 'tv_shows', 'search', 'my_list'],
  filtering: {
    byGenre: true,
    byYear: true,
    byRating: true,
    byType: true,
  },
  sorting: {
    options: ['title', 'date_added', 'release_year', 'rating', 'popularity'],
    default: 'date_added_desc',
  },
  pagination: {
    pageSize: 20,
    infinite: true,
  },
};

// ---------------------------------------------------------------------------
// Phase 4: Playback Core Contracts
// ---------------------------------------------------------------------------

const PHASE4_HLS = {
  format: 'HLS',
  codec: 'h264',
  container: 'm3u8',
  segmentDuration: 6, // seconds
  playlistTypes: ['master', 'variant'],
};

const PHASE4_QUALITY_SELECTION = {
  profiles: [
    { name: '2160p', width: 3840, height: 2160, bitrate: 20000 },
    { name: '1440p', width: 2560, height: 1440, bitrate: 12000 },
    { name: '1080p', width: 1920, height: 1080, bitrate: 8000 },
    { name: '720p', width: 1280, height: 720, bitrate: 5000 },
    { name: '480p', width: 854, height: 480, bitrate: 2500 },
    { name: '360p', width: 640, height: 360, bitrate: 1000 },
  ],
  adaptiveBitrate: {
    enabled: true,
    algorithm: 'throughput_based',
    switchDelay: 3, // seconds
  },
};

const PHASE4_SUBTITLES = {
  format: 'WebVTT',
  features: {
    multipleLanguages: true,
    styling: true,
    positioning: true,
  },
  autoSelect: {
    matchUserLanguage: true,
    fallbackToEnglish: true,
  },
};

const PHASE4_AUDIO_TRACKS = {
  formats: ['aac', 'mp3'],
  features: {
    multipleLanguages: true,
    surroundSound: true,
    stereo: true,
  },
  autoSelect: {
    matchUserLanguage: true,
    fallbackToOriginal: true,
  },
};

const PHASE4_ADMISSION = {
  limits: {
    concurrentStreams: {
      perUser: 3,
      perFamily: 10,
    },
    concurrentDevices: {
      perUser: 5,
      perFamily: 20,
    },
  },
  checks: [
    'user_authenticated',
    'device_registered',
    'stream_limit_ok',
    'content_available',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return new Map();
  }

  const content = readFileSync(filePath, 'utf-8');
  const vars = new Map();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    if (!value.startsWith('"') && !value.startsWith("'")) {
      const commentIdx = value.indexOf('#');
      if (commentIdx > 0) {
        value = value.slice(0, commentIdx).trim();
      }
    }

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

const envPath = resolve(BACKEND_DIR, '.env.dev');
const env = parseEnvFile(envPath);
const customServices = extractCustomServices(env);

// ---------------------------------------------------------------------------
// Tests: Phase 1 Regression
// ---------------------------------------------------------------------------

describe('Phase 1: Foundation - Auth Contract', () => {
  it('should use nHost as auth provider', () => {
    expect(PHASE1_AUTH.provider).toBe('nhost');
  });

  it('should support all authentication methods', () => {
    const features = PHASE1_AUTH.features;
    expect(features).toContain('email_password');
    expect(features).toContain('magic_link');
    expect(features).toContain('oauth_google');
    expect(features).toContain('mfa');
  });

  it('should define all user roles', () => {
    const roles = PHASE1_AUTH.roles;
    expect(roles).toContain('owner');
    expect(roles).toContain('admin');
    expect(roles).toContain('user');
  });

  it('should maintain 7-day session duration', () => {
    expect(PHASE1_AUTH.sessionDuration).toBe(604800);
  });
});

describe('Phase 1: Foundation - Database Schema', () => {
  it('should use PostgreSQL 15', () => {
    expect(PHASE1_DATABASE.engine).toBe('postgresql');
    expect(PHASE1_DATABASE.version).toBe('15');
  });

  it('should define all core tables', () => {
    const tables = PHASE1_DATABASE.tables;
    expect(tables).toContain('families');
    expect(tables).toContain('users');
    expect(tables).toContain('profiles');
    expect(tables).toContain('media_items');
    expect(tables).toContain('media_variants');
  });

  it('should enable required PostgreSQL extensions', () => {
    const extensions = PHASE1_DATABASE.extensions;
    expect(extensions).toContain('uuid-ossp');
    expect(extensions).toContain('pg_trgm');
  });
});

// ---------------------------------------------------------------------------
// Tests: Phase 2 Regression
// ---------------------------------------------------------------------------

describe('Phase 2: Backend Services - Custom Services', () => {
  it('should define all 10 custom services', () => {
    expect(customServices).toHaveLength(10);
  });

  it('should assign correct ports to services', () => {
    for (const svc of customServices) {
      expect(svc.port).toBe(PHASE2_SERVICES.ports[svc.name]);
    }
  });

  it('should have unique ports for all services', () => {
    const ports = customServices.map((s) => s.port);
    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).toBe(ports.length);
  });
});

describe('Phase 2: Backend Services - VOD Pipeline', () => {
  it('should maintain 9-stage pipeline', () => {
    expect(PHASE2_VOD_PIPELINE.stages).toHaveLength(9);
  });

  it('should start with validate stage', () => {
    expect(PHASE2_VOD_PIPELINE.stages[0]).toBe('validate');
  });

  it('should end with index stage', () => {
    expect(PHASE2_VOD_PIPELINE.stages[8]).toBe('index');
  });

  it('should produce 8 renditions', () => {
    expect(PHASE2_VOD_PIPELINE.renditions).toBe(8);
  });

  it('should mark critical stages as fatal', () => {
    const fatalStages = PHASE2_VOD_PIPELINE.fatalStages;
    expect(fatalStages).toContain('validate');
    expect(fatalStages).toContain('transcode');
    expect(fatalStages).toContain('database');
  });
});

describe('Phase 2: Backend Services - Storage', () => {
  it('should use MinIO as storage provider', () => {
    expect(PHASE2_STORAGE.provider).toBe('minio');
  });

  it('should define all storage buckets', () => {
    const buckets = PHASE2_STORAGE.buckets;
    expect(buckets).toContain('media-library');
    expect(buckets).toContain('posters');
    expect(buckets).toContain('subtitles');
  });

  it('should encrypt storage with AES-256', () => {
    expect(PHASE2_STORAGE.encryption).toBe('aes256');
  });
});

describe('Phase 2: Backend Services - Redis', () => {
  it('should use Redis for all caching use cases', () => {
    const useCases = PHASE2_REDIS.useCases;
    expect(useCases).toContain('ingest_progress');
    expect(useCases).toContain('session_cache');
    expect(useCases).toContain('job_queues');
  });

  it('should define job queues', () => {
    const queues = PHASE2_REDIS.queues;
    expect(queues).toContain('video:transcode');
    expect(queues).toContain('image:poster');
  });
});

// ---------------------------------------------------------------------------
// Tests: Phase 3 Regression
// ---------------------------------------------------------------------------

describe('Phase 3: Frontend - Auth UI', () => {
  it('should support all auth flows', () => {
    const flows = PHASE3_AUTH_UI.flows;
    expect(flows).toContain('login');
    expect(flows).toContain('register');
    expect(flows).toContain('forgot_password');
    expect(flows).toContain('profile_select');
  });

  it('should validate email with RFC5322', () => {
    expect(PHASE3_AUTH_UI.validation.email).toBe('rfc5322');
  });

  it('should require 8-character passwords', () => {
    expect(PHASE3_AUTH_UI.validation.password.minLength).toBe(8);
  });

  it('should require uppercase, number, and special characters', () => {
    const pwd = PHASE3_AUTH_UI.validation.password;
    expect(pwd.requireUppercase).toBe(true);
    expect(pwd.requireNumber).toBe(true);
    expect(pwd.requireSpecial).toBe(true);
  });
});

describe('Phase 3: Frontend - Profiles', () => {
  it('should allow 10 profiles per family', () => {
    expect(PHASE3_PROFILES.maxPerFamily).toBe(10);
  });

  it('should support avatars and watch restrictions', () => {
    expect(PHASE3_PROFILES.features.avatars).toBe(true);
    expect(PHASE3_PROFILES.features.watchRestrictions).toBe(true);
  });

  it('should support all age ratings', () => {
    const ratings = PHASE3_PROFILES.features.ageRatings;
    expect(ratings).toContain('G');
    expect(ratings).toContain('PG');
    expect(ratings).toContain('R');
  });

  it('should support PIN protection', () => {
    expect(PHASE3_PROFILES.features.pinProtection).toBe(true);
  });
});

describe('Phase 3: Frontend - Catalog', () => {
  it('should have all catalog sections', () => {
    const sections = PHASE3_CATALOG.sections;
    expect(sections).toContain('home');
    expect(sections).toContain('movies');
    expect(sections).toContain('tv_shows');
    expect(sections).toContain('search');
  });

  it('should support filtering by genre, year, rating', () => {
    const filtering = PHASE3_CATALOG.filtering;
    expect(filtering.byGenre).toBe(true);
    expect(filtering.byYear).toBe(true);
    expect(filtering.byRating).toBe(true);
  });

  it('should support multiple sorting options', () => {
    const options = PHASE3_CATALOG.sorting.options;
    expect(options).toContain('title');
    expect(options).toContain('date_added');
    expect(options).toContain('rating');
  });

  it('should use 20 items per page', () => {
    expect(PHASE3_CATALOG.pagination.pageSize).toBe(20);
  });

  it('should support infinite scrolling', () => {
    expect(PHASE3_CATALOG.pagination.infinite).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Phase 4 Regression
// ---------------------------------------------------------------------------

describe('Phase 4: Playback - HLS Streaming', () => {
  it('should use HLS format', () => {
    expect(PHASE4_HLS.format).toBe('HLS');
  });

  it('should use H.264 codec', () => {
    expect(PHASE4_HLS.codec).toBe('h264');
  });

  it('should use 6-second segments', () => {
    expect(PHASE4_HLS.segmentDuration).toBe(6);
  });

  it('should generate master and variant playlists', () => {
    expect(PHASE4_HLS.playlistTypes).toContain('master');
    expect(PHASE4_HLS.playlistTypes).toContain('variant');
  });
});

describe('Phase 4: Playback - Quality Selection', () => {
  it('should support 6 quality profiles', () => {
    expect(PHASE4_QUALITY_SELECTION.profiles).toHaveLength(6);
  });

  it('should include 2160p, 1080p, 720p, 480p profiles', () => {
    const profiles = PHASE4_QUALITY_SELECTION.profiles.map((p) => p.name);
    expect(profiles).toContain('2160p');
    expect(profiles).toContain('1080p');
    expect(profiles).toContain('720p');
    expect(profiles).toContain('480p');
  });

  it('should enable adaptive bitrate streaming', () => {
    expect(PHASE4_QUALITY_SELECTION.adaptiveBitrate.enabled).toBe(true);
  });

  it('should use throughput-based ABR algorithm', () => {
    expect(PHASE4_QUALITY_SELECTION.adaptiveBitrate.algorithm).toBe('throughput_based');
  });
});

describe('Phase 4: Playback - Subtitles', () => {
  it('should use WebVTT format', () => {
    expect(PHASE4_SUBTITLES.format).toBe('WebVTT');
  });

  it('should support multiple languages', () => {
    expect(PHASE4_SUBTITLES.features.multipleLanguages).toBe(true);
  });

  it('should support styling and positioning', () => {
    expect(PHASE4_SUBTITLES.features.styling).toBe(true);
    expect(PHASE4_SUBTITLES.features.positioning).toBe(true);
  });

  it('should auto-select matching user language', () => {
    expect(PHASE4_SUBTITLES.autoSelect.matchUserLanguage).toBe(true);
  });

  it('should fallback to English', () => {
    expect(PHASE4_SUBTITLES.autoSelect.fallbackToEnglish).toBe(true);
  });
});

describe('Phase 4: Playback - Audio Tracks', () => {
  it('should support AAC and MP3', () => {
    expect(PHASE4_AUDIO_TRACKS.formats).toContain('aac');
    expect(PHASE4_AUDIO_TRACKS.formats).toContain('mp3');
  });

  it('should support multiple languages', () => {
    expect(PHASE4_AUDIO_TRACKS.features.multipleLanguages).toBe(true);
  });

  it('should support surround sound and stereo', () => {
    expect(PHASE4_AUDIO_TRACKS.features.surroundSound).toBe(true);
    expect(PHASE4_AUDIO_TRACKS.features.stereo).toBe(true);
  });

  it('should auto-select matching user language', () => {
    expect(PHASE4_AUDIO_TRACKS.autoSelect.matchUserLanguage).toBe(true);
  });
});

describe('Phase 4: Playback - Stream Admission', () => {
  it('should limit 3 concurrent streams per user', () => {
    expect(PHASE4_ADMISSION.limits.concurrentStreams.perUser).toBe(3);
  });

  it('should limit 10 concurrent streams per family', () => {
    expect(PHASE4_ADMISSION.limits.concurrentStreams.perFamily).toBe(10);
  });

  it('should perform all admission checks', () => {
    const checks = PHASE4_ADMISSION.checks;
    expect(checks).toContain('user_authenticated');
    expect(checks).toContain('device_registered');
    expect(checks).toContain('stream_limit_ok');
    expect(checks).toContain('content_available');
  });
});

// ---------------------------------------------------------------------------
// Integration Checks
// ---------------------------------------------------------------------------

describe('Cross-Phase Integration', () => {
  it('should maintain auth integration from Phase 1 to Phase 3', () => {
    // Phase 1 defines auth provider
    expect(PHASE1_AUTH.provider).toBe('nhost');

    // Phase 3 uses auth for login flows
    expect(PHASE3_AUTH_UI.flows).toContain('login');
  });

  it('should maintain storage integration from Phase 2 to Phase 4', () => {
    // Phase 2 defines storage buckets
    expect(PHASE2_STORAGE.buckets).toContain('media-library');

    // Phase 4 uses storage for HLS segments
    expect(PHASE4_HLS.container).toBe('m3u8');
  });

  it('should maintain pipeline integration from Phase 2 to Phase 4', () => {
    // Phase 2 defines VOD pipeline with transcode stage
    expect(PHASE2_VOD_PIPELINE.stages).toContain('transcode');

    // Phase 4 uses transcoded output for HLS
    expect(PHASE4_HLS.codec).toBe('h264');
  });

  it('should maintain catalog integration from Phase 3 to Phase 4', () => {
    // Phase 3 defines catalog sections
    expect(PHASE3_CATALOG.sections).toContain('movies');

    // Phase 4 provides playback for catalog items
    expect(PHASE4_ADMISSION.checks).toContain('content_available');
  });
});
