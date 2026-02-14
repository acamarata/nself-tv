/**
 * Poster worker tests.
 *
 * Uses Module._load override to intercept CJS require() calls, since vitest v1.x
 * vi.mock() cannot intercept native CJS require() in Node v24.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';

// ---------------------------------------------------------------------------
// Mock definitions
// ---------------------------------------------------------------------------

const mockToBuffer = vi.fn();
const mockWebp = vi.fn(() => ({ toBuffer: mockToBuffer }));
const mockResize = vi.fn(() => ({ webp: mockWebp }));
const mockSharpFn = vi.fn(() => ({ resize: mockResize }));

const mockDownloadBuffer = vi.fn();
const mockUploadBuffer = vi.fn();
const mockStorage = {
  downloadBuffer: mockDownloadBuffer,
  uploadBuffer: mockUploadBuffer,
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// ---------------------------------------------------------------------------
// Module._load override — intercepts CJS require() calls
// ---------------------------------------------------------------------------

const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  if (request === 'sharp') return mockSharpFn;
  if (request === 'bullmq') return { Worker: vi.fn(), Queue: vi.fn() };
  if (request === 'winston') {
    return {
      createLogger: () => mockLogger,
      format: { combine: vi.fn(), timestamp: vi.fn(), errors: vi.fn(), json: vi.fn(), colorize: vi.fn(), printf: vi.fn() },
      transports: { Console: vi.fn() },
    };
  }
  if (request === 'minio') {
    return { Client: vi.fn(() => ({})) };
  }
  try {
    const resolved = Module._resolveFilename(request, parent, isMain);
    if (resolved.endsWith('/storage.js')) return mockStorage;
    if (resolved.endsWith('/logger.js')) return mockLogger;
  } catch (_) { /* let original handle it */ }
  return originalLoad.call(this, request, parent, isMain);
};

// ---------------------------------------------------------------------------
// Load module under test (uses our overridden requires)
// ---------------------------------------------------------------------------

const _require = createRequire(import.meta.url);
// Clear require cache to force re-loading with mocked dependencies
for (const key of Object.keys(_require.cache)) {
  if (key.includes('thumbnail_generator/src/')) delete _require.cache[key];
}
const { processPosterJob } = _require('../src/workers/poster-worker.js');

afterAll(() => { Module._load = originalLoad; });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(data, id = 'poster-test-1') {
  return { id, data, updateProgress: vi.fn() };
}

function setupSharpReturns(results) {
  let callIdx = 0;
  mockToBuffer.mockImplementation(() => {
    const r = results[callIdx] || results[results.length - 1];
    callIdx++;
    return Promise.resolve(r);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDownloadBuffer.mockResolvedValue(Buffer.alloc(50_000, 0xff));
  mockUploadBuffer.mockImplementation((_bucket, key) => Promise.resolve(key));
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('processPosterJob — validation', () => {
  it('throws when sourceBucket is missing', async () => {
    const job = makeJob({ sourceKey: 'img.jpg', outputBucket: 'out', outputPrefix: 'posters/' });
    await expect(processPosterJob(job)).rejects.toThrow('sourceBucket and sourceKey are required');
  });

  it('throws when sourceKey is missing', async () => {
    const job = makeJob({ sourceBucket: 'src', outputBucket: 'out', outputPrefix: 'posters/' });
    await expect(processPosterJob(job)).rejects.toThrow('sourceBucket and sourceKey are required');
  });

  it('throws when outputBucket is missing', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputPrefix: 'posters/' });
    await expect(processPosterJob(job)).rejects.toThrow('outputBucket and outputPrefix are required');
  });

  it('throws when outputPrefix is missing', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out' });
    await expect(processPosterJob(job)).rejects.toThrow('outputBucket and outputPrefix are required');
  });
});

// ---------------------------------------------------------------------------
// Default sizes (100, 400, 1200)
// ---------------------------------------------------------------------------

describe('processPosterJob — default sizes', () => {
  beforeEach(() => {
    setupSharpReturns([
      { data: Buffer.alloc(2_000), info: { width: 100, height: 56, format: 'webp' } },
      { data: Buffer.alloc(15_000), info: { width: 400, height: 225, format: 'webp' } },
      { data: Buffer.alloc(80_000), info: { width: 1200, height: 675, format: 'webp' } },
    ]);
  });

  it('generates posters for all 3 default widths', async () => {
    const job = makeJob({
      sourceBucket: 'media-source', sourceKey: 'originals/movie-123/poster.jpg',
      outputBucket: 'media-thumbnails', outputPrefix: 'posters/movie-123/',
    });
    const result = await processPosterJob(job);
    expect(result.posters).toHaveLength(3);
    expect(result.posters.map((p) => p.size)).toEqual([100, 400, 1200]);
  });

  it('downloads from the correct source bucket and key', async () => {
    const job = makeJob({
      sourceBucket: 'media-source', sourceKey: 'originals/movie-123/poster.jpg',
      outputBucket: 'media-thumbnails', outputPrefix: 'posters/movie-123/',
    });
    await processPosterJob(job);
    expect(mockDownloadBuffer).toHaveBeenCalledOnce();
    expect(mockDownloadBuffer).toHaveBeenCalledWith('media-source', 'originals/movie-123/poster.jpg');
  });

  it('calls sharp.resize with each target width and withoutEnlargement', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
    });
    await processPosterJob(job);
    expect(mockSharpFn).toHaveBeenCalledTimes(3);
    expect(mockResize).toHaveBeenCalledTimes(3);
    expect(mockResize).toHaveBeenNthCalledWith(1, { width: 100, withoutEnlargement: true });
    expect(mockResize).toHaveBeenNthCalledWith(2, { width: 400, withoutEnlargement: true });
    expect(mockResize).toHaveBeenNthCalledWith(3, { width: 1200, withoutEnlargement: true });
  });

  it('uses webp output format with quality 85', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
    });
    await processPosterJob(job);
    expect(mockWebp).toHaveBeenCalledTimes(3);
    for (const call of mockWebp.mock.calls) {
      expect(call[0]).toEqual({ quality: 85 });
    }
  });

  it('calls toBuffer with resolveWithObject: true', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
    });
    await processPosterJob(job);
    expect(mockToBuffer).toHaveBeenCalledTimes(3);
    for (const call of mockToBuffer.mock.calls) {
      expect(call[0]).toEqual({ resolveWithObject: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Output paths
// ---------------------------------------------------------------------------

describe('processPosterJob — output paths', () => {
  beforeEach(() => {
    setupSharpReturns([
      { data: Buffer.alloc(1_000), info: { width: 100, height: 56 } },
      { data: Buffer.alloc(5_000), info: { width: 400, height: 225 } },
      { data: Buffer.alloc(20_000), info: { width: 1200, height: 675 } },
    ]);
  });

  it('uploads to the correct output keys following poster-{width}w.webp convention', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'thumbs', outputPrefix: 'posters/movie-42/',
    });
    await processPosterJob(job);
    expect(mockUploadBuffer).toHaveBeenCalledTimes(3);
    const uploadedKeys = mockUploadBuffer.mock.calls.map((c) => c[1]);
    expect(uploadedKeys).toEqual([
      'posters/movie-42/poster-100w.webp',
      'posters/movie-42/poster-400w.webp',
      'posters/movie-42/poster-1200w.webp',
    ]);
  });

  it('uploads to the correct output bucket', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'my-thumbs', outputPrefix: 'p/',
    });
    await processPosterJob(job);
    for (const call of mockUploadBuffer.mock.calls) {
      expect(call[0]).toBe('my-thumbs');
    }
  });

  it('sets content type to image/webp for all uploads', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
    });
    await processPosterJob(job);
    for (const call of mockUploadBuffer.mock.calls) {
      expect(call[3]).toEqual({ contentType: 'image/webp' });
    }
  });

  it('builds url field as outputBucket/outputKey', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'media-thumbnails', outputPrefix: 'posters/show-7/',
    });
    const result = await processPosterJob(job);
    expect(result.posters[0].url).toBe('media-thumbnails/posters/show-7/poster-100w.webp');
    expect(result.posters[1].url).toBe('media-thumbnails/posters/show-7/poster-400w.webp');
    expect(result.posters[2].url).toBe('media-thumbnails/posters/show-7/poster-1200w.webp');
  });
});

// ---------------------------------------------------------------------------
// Return structure
// ---------------------------------------------------------------------------

describe('processPosterJob — return value', () => {
  beforeEach(() => {
    setupSharpReturns([
      { data: Buffer.alloc(2_500), info: { width: 100, height: 56 } },
      { data: Buffer.alloc(12_000), info: { width: 400, height: 225 } },
      { data: Buffer.alloc(75_000), info: { width: 1200, height: 675 } },
    ]);
  });

  it('returns correct metadata for each poster variant', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
    });
    const result = await processPosterJob(job);
    expect(result.posters[0]).toEqual(expect.objectContaining({
      size: 100, width: 100, height: 56, format: 'webp', sizeBytes: 2_500,
    }));
    expect(result.posters[1]).toEqual(expect.objectContaining({
      size: 400, width: 400, height: 225, sizeBytes: 12_000,
    }));
    expect(result.posters[2]).toEqual(expect.objectContaining({
      size: 1200, width: 1200, height: 675, sizeBytes: 75_000,
    }));
  });

  it('includes all required fields on each poster entry', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
    });
    const result = await processPosterJob(job);
    const requiredFields = ['size', 'width', 'height', 'url', 'format', 'sizeBytes'];
    for (const poster of result.posters) {
      for (const field of requiredFields) {
        expect(poster).toHaveProperty(field);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Custom sizes
// ---------------------------------------------------------------------------

describe('processPosterJob — custom sizes', () => {
  it('uses custom sizes when provided in job data', async () => {
    setupSharpReturns([
      { data: Buffer.alloc(500), info: { width: 50, height: 28 } },
      { data: Buffer.alloc(30_000), info: { width: 800, height: 450 } },
    ]);
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
      sizes: [50, 800],
    });
    const result = await processPosterJob(job);
    expect(result.posters).toHaveLength(2);
    expect(result.posters[0].size).toBe(50);
    expect(result.posters[1].size).toBe(800);
  });

  it('generates correct output keys for custom sizes', async () => {
    setupSharpReturns([
      { data: Buffer.alloc(500), info: { width: 50, height: 28 } },
      { data: Buffer.alloc(30_000), info: { width: 800, height: 450 } },
    ]);
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'custom/',
      sizes: [50, 800],
    });
    await processPosterJob(job);
    const uploadedKeys = mockUploadBuffer.mock.calls.map((c) => c[1]);
    expect(uploadedKeys).toEqual(['custom/poster-50w.webp', 'custom/poster-800w.webp']);
  });
});

// ---------------------------------------------------------------------------
// Progress reporting
// ---------------------------------------------------------------------------

describe('processPosterJob — progress', () => {
  beforeEach(() => {
    setupSharpReturns([
      { data: Buffer.alloc(1_000), info: { width: 100, height: 56 } },
      { data: Buffer.alloc(5_000), info: { width: 400, height: 225 } },
      { data: Buffer.alloc(20_000), info: { width: 1200, height: 675 } },
    ]);
  });

  it('reports progress after each size is processed', async () => {
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
    });
    await processPosterJob(job);
    expect(job.updateProgress).toHaveBeenCalledTimes(3);
    expect(job.updateProgress).toHaveBeenNthCalledWith(1, 33);
    expect(job.updateProgress).toHaveBeenNthCalledWith(2, 67);
    expect(job.updateProgress).toHaveBeenNthCalledWith(3, 100);
  });

  it('reports 50 and 100 for two custom sizes', async () => {
    setupSharpReturns([
      { data: Buffer.alloc(500), info: { width: 50, height: 28 } },
      { data: Buffer.alloc(10_000), info: { width: 600, height: 338 } },
    ]);
    const job = makeJob({
      sourceBucket: 'src', sourceKey: 'img.jpg',
      outputBucket: 'out', outputPrefix: 'p/',
      sizes: [50, 600],
    });
    await processPosterJob(job);
    expect(job.updateProgress).toHaveBeenCalledTimes(2);
    expect(job.updateProgress).toHaveBeenNthCalledWith(1, 50);
    expect(job.updateProgress).toHaveBeenNthCalledWith(2, 100);
  });
});
