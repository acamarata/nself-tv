import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helper: load config with a clean require cache so env vars take effect
// ---------------------------------------------------------------------------

function loadConfig(envOverrides = {}) {
  // Save original env
  const saved = {};
  for (const key of Object.keys(envOverrides)) {
    saved[key] = process.env[key];
    process.env[key] = envOverrides[key];
  }

  // Bust the require cache for config so it re-reads process.env
  const configPath = require.resolve('../src/config');
  delete require.cache[configPath];
  const config = require(configPath);

  // Restore original env
  for (const key of Object.keys(envOverrides)) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }

  return config;
}

// ---------------------------------------------------------------------------
// Redis defaults
// ---------------------------------------------------------------------------

describe('config — redis', () => {
  it('uses default host "redis" when REDIS_HOST is not set', () => {
    const config = loadConfig({});
    expect(config.redis.host).toBe('redis');
  });

  it('uses default port 6379 when REDIS_PORT is not set', () => {
    const config = loadConfig({});
    expect(config.redis.port).toBe(6379);
  });

  it('uses undefined password when REDIS_PASSWORD is not set', () => {
    const config = loadConfig({});
    expect(config.redis.password).toBeUndefined();
  });

  it('uses default db 0 when REDIS_DB is not set', () => {
    const config = loadConfig({});
    expect(config.redis.db).toBe(0);
  });

  it('sets maxRetriesPerRequest to null (required by BullMQ)', () => {
    const config = loadConfig({});
    expect(config.redis.maxRetriesPerRequest).toBeNull();
  });

  it('overrides host from REDIS_HOST env var', () => {
    const config = loadConfig({ REDIS_HOST: 'my-redis.local' });
    expect(config.redis.host).toBe('my-redis.local');
  });

  it('overrides port from REDIS_PORT env var', () => {
    const config = loadConfig({ REDIS_PORT: '6380' });
    expect(config.redis.port).toBe(6380);
  });

  it('overrides password from REDIS_PASSWORD env var', () => {
    const config = loadConfig({ REDIS_PASSWORD: 'secret123' });
    expect(config.redis.password).toBe('secret123');
  });

  it('overrides db from REDIS_DB env var', () => {
    const config = loadConfig({ REDIS_DB: '3' });
    expect(config.redis.db).toBe(3);
  });

  it('provides a retryStrategy that caps at 5000ms', () => {
    const config = loadConfig({});
    // After many retries, should cap at 5000
    expect(config.redis.retryStrategy(1)).toBe(200);
    expect(config.redis.retryStrategy(10)).toBe(2000);
    expect(config.redis.retryStrategy(100)).toBe(5000);
    expect(config.redis.retryStrategy(1000)).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Queue names
// ---------------------------------------------------------------------------

describe('config — queues', () => {
  it('uses default queue names', () => {
    const config = loadConfig({});
    expect(config.queues.poster).toBe('image-poster');
    expect(config.queues.sprite).toBe('image-sprite');
    expect(config.queues.optimize).toBe('image-optimize');
  });

  it('overrides poster queue from QUEUE_POSTER env var', () => {
    const config = loadConfig({ QUEUE_POSTER: 'custom:poster' });
    expect(config.queues.poster).toBe('custom:poster');
  });

  it('overrides sprite queue from QUEUE_SPRITE env var', () => {
    const config = loadConfig({ QUEUE_SPRITE: 'custom:sprite' });
    expect(config.queues.sprite).toBe('custom:sprite');
  });

  it('overrides optimize queue from QUEUE_OPTIMIZE env var', () => {
    const config = loadConfig({ QUEUE_OPTIMIZE: 'custom:optimize' });
    expect(config.queues.optimize).toBe('custom:optimize');
  });
});

// ---------------------------------------------------------------------------
// Worker settings
// ---------------------------------------------------------------------------

describe('config — worker', () => {
  it('uses default concurrency of 2', () => {
    const config = loadConfig({});
    expect(config.worker.concurrency).toBe(2);
  });

  it('overrides concurrency from WORKER_CONCURRENCY env var', () => {
    const config = loadConfig({ WORKER_CONCURRENCY: '8' });
    expect(config.worker.concurrency).toBe(8);
  });

  it('sets removeOnComplete to keep latest 200 jobs', () => {
    const config = loadConfig({});
    expect(config.worker.removeOnComplete).toEqual({ count: 200 });
  });

  it('sets removeOnFail to keep latest 100 failed jobs', () => {
    const config = loadConfig({});
    expect(config.worker.removeOnFail).toEqual({ count: 100 });
  });
});

// ---------------------------------------------------------------------------
// MinIO settings
// ---------------------------------------------------------------------------

describe('config — minio', () => {
  it('uses default endpoint "minio"', () => {
    const config = loadConfig({});
    expect(config.minio.endPoint).toBe('minio');
  });

  it('uses default port 9000', () => {
    const config = loadConfig({});
    expect(config.minio.port).toBe(9000);
  });

  it('uses SSL false by default', () => {
    const config = loadConfig({});
    expect(config.minio.useSSL).toBe(false);
  });

  it('enables SSL when MINIO_USE_SSL is "true"', () => {
    const config = loadConfig({ MINIO_USE_SSL: 'true' });
    expect(config.minio.useSSL).toBe(true);
  });

  it('keeps SSL false for any value other than "true"', () => {
    const config = loadConfig({ MINIO_USE_SSL: 'yes' });
    expect(config.minio.useSSL).toBe(false);
  });

  it('uses default credentials minioadmin/minioadmin', () => {
    const config = loadConfig({});
    expect(config.minio.accessKey).toBe('minioadmin');
    expect(config.minio.secretKey).toBe('minioadmin');
  });

  it('overrides credentials from env vars', () => {
    const config = loadConfig({
      MINIO_ACCESS_KEY: 'myaccess',
      MINIO_SECRET_KEY: 'mysecret',
    });
    expect(config.minio.accessKey).toBe('myaccess');
    expect(config.minio.secretKey).toBe('mysecret');
  });

  it('has three default bucket names', () => {
    const config = loadConfig({});
    expect(config.minio.buckets.source).toBe('media-source');
    expect(config.minio.buckets.output).toBe('media-output');
    expect(config.minio.buckets.thumbnails).toBe('media-thumbnails');
  });

  it('overrides bucket names from env vars', () => {
    const config = loadConfig({
      MINIO_BUCKET_SOURCE: 'custom-source',
      MINIO_BUCKET_OUTPUT: 'custom-output',
      MINIO_BUCKET_THUMBNAILS: 'custom-thumbs',
    });
    expect(config.minio.buckets.source).toBe('custom-source');
    expect(config.minio.buckets.output).toBe('custom-output');
    expect(config.minio.buckets.thumbnails).toBe('custom-thumbs');
  });

  it('overrides endpoint and port from env vars', () => {
    const config = loadConfig({
      MINIO_ENDPOINT: 's3.amazonaws.com',
      MINIO_PORT: '443',
    });
    expect(config.minio.endPoint).toBe('s3.amazonaws.com');
    expect(config.minio.port).toBe(443);
  });
});

// ---------------------------------------------------------------------------
// Server settings
// ---------------------------------------------------------------------------

describe('config — server', () => {
  it('uses default port 5006', () => {
    const config = loadConfig({});
    expect(config.server.port).toBe(5006);
  });

  it('uses default host 0.0.0.0', () => {
    const config = loadConfig({});
    expect(config.server.host).toBe('0.0.0.0');
  });

  it('overrides port from PORT env var', () => {
    const config = loadConfig({ PORT: '9090' });
    expect(config.server.port).toBe(9090);
  });

  it('overrides host from HOST env var', () => {
    const config = loadConfig({ HOST: '127.0.0.1' });
    expect(config.server.host).toBe('127.0.0.1');
  });
});

// ---------------------------------------------------------------------------
// Temp directory
// ---------------------------------------------------------------------------

describe('config — tempDir', () => {
  it('uses default temp directory /tmp/thumbnail_generator', () => {
    const config = loadConfig({});
    expect(config.tempDir).toBe('/tmp/thumbnail_generator');
  });

  it('overrides from TEMP_DIR env var', () => {
    const config = loadConfig({ TEMP_DIR: '/var/data/tmp' });
    expect(config.tempDir).toBe('/var/data/tmp');
  });
});

// ---------------------------------------------------------------------------
// Default image processing settings
// ---------------------------------------------------------------------------

describe('config — defaults', () => {
  it('has poster sizes [100, 400, 1200]', () => {
    const config = loadConfig({});
    expect(config.defaults.posterSizes).toEqual([100, 400, 1200]);
  });

  it('has sprite grid size [10, 10]', () => {
    const config = loadConfig({});
    expect(config.defaults.spriteGridSize).toEqual([10, 10]);
  });

  it('has sprite thumb dimensions 320x180', () => {
    const config = loadConfig({});
    expect(config.defaults.spriteThumbWidth).toBe(320);
    expect(config.defaults.spriteThumbHeight).toBe(180);
  });

  it('has webpQuality of 85', () => {
    const config = loadConfig({});
    expect(config.defaults.webpQuality).toBe(85);
  });

  it('has outputFormat "webp"', () => {
    const config = loadConfig({});
    expect(config.defaults.outputFormat).toBe('webp');
  });
});

// ---------------------------------------------------------------------------
// Log level & node env
// ---------------------------------------------------------------------------

describe('config — logLevel and nodeEnv', () => {
  it('uses default log level "info"', () => {
    const config = loadConfig({});
    expect(config.logLevel).toBe('info');
  });

  it('overrides log level from LOG_LEVEL env var', () => {
    const config = loadConfig({ LOG_LEVEL: 'debug' });
    expect(config.logLevel).toBe('debug');
  });

  it('uses NODE_ENV from environment (vitest sets "test")', () => {
    const config = loadConfig({});
    // When running under vitest, NODE_ENV is "test"; the default fallback is "development"
    expect(config.nodeEnv).toBe(process.env.NODE_ENV || 'development');
  });

  it('overrides node env from NODE_ENV env var', () => {
    const config = loadConfig({ NODE_ENV: 'production' });
    expect(config.nodeEnv).toBe('production');
  });
});
