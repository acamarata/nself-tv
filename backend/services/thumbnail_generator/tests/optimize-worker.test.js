/**
 * Optimize worker tests.
 *
 * Uses Module._load override to intercept CJS require() calls.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';

// ---------------------------------------------------------------------------
// Mock definitions
// ---------------------------------------------------------------------------

const mockToBuffer = vi.fn();
const mockWebp = vi.fn(() => ({ toBuffer: mockToBuffer }));
const mockJpeg = vi.fn(() => ({ toBuffer: mockToBuffer }));
const mockPng = vi.fn(() => ({ toBuffer: mockToBuffer }));
const mockAvif = vi.fn(() => ({ toBuffer: mockToBuffer }));

const mockSharpFn = vi.fn(() => ({
  webp: mockWebp, jpeg: mockJpeg, png: mockPng, avif: mockAvif,
}));

const mockDownloadBuffer = vi.fn();
const mockUploadBuffer = vi.fn();
const mockStorage = { downloadBuffer: mockDownloadBuffer, uploadBuffer: mockUploadBuffer };

const mockLogger = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };

// ---------------------------------------------------------------------------
// Module._load override
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
  if (request === 'minio') return { Client: vi.fn(() => ({})) };
  try {
    const resolved = Module._resolveFilename(request, parent, isMain);
    if (resolved.endsWith('/storage.js')) return mockStorage;
    if (resolved.endsWith('/logger.js')) return mockLogger;
  } catch (_) { /* let original handle it */ }
  return originalLoad.call(this, request, parent, isMain);
};

// ---------------------------------------------------------------------------
// Load module under test
// ---------------------------------------------------------------------------

const _require = createRequire(import.meta.url);
for (const key of Object.keys(_require.cache)) {
  if (key.includes('thumbnail_generator/src/')) delete _require.cache[key];
}
const { processOptimizeJob } = _require('../src/workers/optimize-worker.js');

afterAll(() => { Module._load = originalLoad; });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(data, id = 'optimize-test-1') {
  return { id, data, updateProgress: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDownloadBuffer.mockResolvedValue(Buffer.alloc(100_000, 0xff));
  mockToBuffer.mockResolvedValue(Buffer.alloc(40_000, 0xaa));
  mockUploadBuffer.mockImplementation((_b, key) => Promise.resolve(key));
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('processOptimizeJob — validation', () => {
  it('throws when sourceBucket is missing', async () => {
    const job = makeJob({ sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'optimized.webp' });
    await expect(processOptimizeJob(job)).rejects.toThrow('sourceBucket and sourceKey are required');
  });

  it('throws when sourceKey is missing', async () => {
    const job = makeJob({ sourceBucket: 'src', outputBucket: 'out', outputKey: 'optimized.webp' });
    await expect(processOptimizeJob(job)).rejects.toThrow('sourceBucket and sourceKey are required');
  });

  it('throws when outputBucket is missing', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputKey: 'optimized.webp' });
    await expect(processOptimizeJob(job)).rejects.toThrow('outputBucket and outputKey are required');
  });

  it('throws when outputKey is missing', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out' });
    await expect(processOptimizeJob(job)).rejects.toThrow('outputBucket and outputKey are required');
  });

  it('throws for unsupported format', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.gif', format: 'gif' });
    await expect(processOptimizeJob(job)).rejects.toThrow('Unsupported format "gif"');
  });

  it('includes supported formats in the error message', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.bmp', format: 'bmp' });
    try {
      await processOptimizeJob(job);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).toContain('webp');
      expect(err.message).toContain('jpeg');
      expect(err.message).toContain('png');
      expect(err.message).toContain('avif');
    }
  });
});

// ---------------------------------------------------------------------------
// WebP format (default)
// ---------------------------------------------------------------------------

describe('processOptimizeJob — webp format (default)', () => {
  it('uses webp encoder when no format is specified', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    await processOptimizeJob(job);
    expect(mockWebp).toHaveBeenCalledOnce();
    expect(mockJpeg).not.toHaveBeenCalled();
    expect(mockPng).not.toHaveBeenCalled();
    expect(mockAvif).not.toHaveBeenCalled();
  });

  it('passes default quality 85 to webp encoder', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    await processOptimizeJob(job);
    expect(mockWebp).toHaveBeenCalledWith({ quality: 85 });
  });

  it('returns format as "webp"', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    const result = await processOptimizeJob(job);
    expect(result.format).toBe('webp');
  });

  it('uploads with content type image/webp', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    await processOptimizeJob(job);
    expect(mockUploadBuffer).toHaveBeenCalledWith('out', 'img.webp', expect.any(Buffer), { contentType: 'image/webp' });
  });
});

// ---------------------------------------------------------------------------
// JPEG format
// ---------------------------------------------------------------------------

describe('processOptimizeJob — jpeg format', () => {
  it('uses jpeg encoder with mozjpeg', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.png', outputBucket: 'out', outputKey: 'img.jpg', format: 'jpeg' });
    await processOptimizeJob(job);
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 85, mozjpeg: true });
  });

  it('accepts "jpg" as alias for "jpeg"', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.png', outputBucket: 'out', outputKey: 'img.jpg', format: 'jpg' });
    await processOptimizeJob(job);
    expect(mockJpeg).toHaveBeenCalledOnce();
  });

  it('returns format as "jpeg" even when input was "jpg"', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.png', outputBucket: 'out', outputKey: 'img.jpg', format: 'jpg' });
    const result = await processOptimizeJob(job);
    expect(result.format).toBe('jpeg');
  });

  it('uploads with content type image/jpeg', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.png', outputBucket: 'out', outputKey: 'img.jpg', format: 'jpeg' });
    await processOptimizeJob(job);
    expect(mockUploadBuffer).toHaveBeenCalledWith('out', 'img.jpg', expect.any(Buffer), { contentType: 'image/jpeg' });
  });
});

// ---------------------------------------------------------------------------
// PNG format
// ---------------------------------------------------------------------------

describe('processOptimizeJob — png format', () => {
  it('uses png encoder with compression level 9', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.png', format: 'png' });
    await processOptimizeJob(job);
    expect(mockPng).toHaveBeenCalledWith({ compressionLevel: 9 });
  });

  it('does not pass quality to png encoder', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.png', format: 'png', quality: 50 });
    await processOptimizeJob(job);
    expect(mockPng).toHaveBeenCalledWith({ compressionLevel: 9 });
  });

  it('uploads with content type image/png', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.png', format: 'png' });
    await processOptimizeJob(job);
    expect(mockUploadBuffer).toHaveBeenCalledWith('out', 'img.png', expect.any(Buffer), { contentType: 'image/png' });
  });
});

// ---------------------------------------------------------------------------
// AVIF format
// ---------------------------------------------------------------------------

describe('processOptimizeJob — avif format', () => {
  it('uses avif encoder with quality', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.avif', format: 'avif' });
    await processOptimizeJob(job);
    expect(mockAvif).toHaveBeenCalledWith({ quality: 85 });
  });

  it('uploads with content type image/avif', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.avif', format: 'avif' });
    await processOptimizeJob(job);
    expect(mockUploadBuffer).toHaveBeenCalledWith('out', 'img.avif', expect.any(Buffer), { contentType: 'image/avif' });
  });
});

// ---------------------------------------------------------------------------
// Case insensitivity
// ---------------------------------------------------------------------------

describe('processOptimizeJob — format case insensitivity', () => {
  it('accepts "WEBP" (uppercase)', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp', format: 'WEBP' });
    await processOptimizeJob(job);
    expect(mockWebp).toHaveBeenCalledOnce();
  });

  it('accepts "Jpeg" (mixed case)', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.png', outputBucket: 'out', outputKey: 'img.jpg', format: 'Jpeg' });
    await processOptimizeJob(job);
    expect(mockJpeg).toHaveBeenCalledOnce();
  });

  it('accepts "AVIF" (uppercase)', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.avif', format: 'AVIF' });
    await processOptimizeJob(job);
    expect(mockAvif).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Quality settings
// ---------------------------------------------------------------------------

describe('processOptimizeJob — quality settings', () => {
  it('uses custom quality when provided', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp', quality: 50 });
    await processOptimizeJob(job);
    expect(mockWebp).toHaveBeenCalledWith({ quality: 50 });
  });

  it('passes custom quality to jpeg encoder', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.png', outputBucket: 'out', outputKey: 'img.jpg', format: 'jpeg', quality: 70 });
    await processOptimizeJob(job);
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 70, mozjpeg: true });
  });

  it('passes custom quality to avif encoder', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.avif', format: 'avif', quality: 30 });
    await processOptimizeJob(job);
    expect(mockAvif).toHaveBeenCalledWith({ quality: 30 });
  });
});

// ---------------------------------------------------------------------------
// Savings calculation
// ---------------------------------------------------------------------------

describe('processOptimizeJob — savings calculation', () => {
  it('calculates correct savings percentage', async () => {
    mockDownloadBuffer.mockResolvedValue(Buffer.alloc(100_000));
    mockToBuffer.mockResolvedValue(Buffer.alloc(40_000));
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    const result = await processOptimizeJob(job);
    expect(result.savingsPercent).toBe(60);
  });

  it('returns 0% savings when output is same size', async () => {
    mockDownloadBuffer.mockResolvedValue(Buffer.alloc(50_000));
    mockToBuffer.mockResolvedValue(Buffer.alloc(50_000));
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    const result = await processOptimizeJob(job);
    expect(result.savingsPercent).toBe(0);
  });

  it('returns negative savings when output is larger', async () => {
    mockDownloadBuffer.mockResolvedValue(Buffer.alloc(10_000));
    mockToBuffer.mockResolvedValue(Buffer.alloc(15_000));
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.png', format: 'png' });
    const result = await processOptimizeJob(job);
    expect(result.savingsPercent).toBe(-50);
  });

  it('returns 0% for zero-byte source', async () => {
    mockDownloadBuffer.mockResolvedValue(Buffer.alloc(0));
    mockToBuffer.mockResolvedValue(Buffer.alloc(0));
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    const result = await processOptimizeJob(job);
    expect(result.savingsPercent).toBe(0);
  });

  it('rounds savings to 2 decimal places', async () => {
    mockDownloadBuffer.mockResolvedValue(Buffer.alloc(100_000));
    mockToBuffer.mockResolvedValue(Buffer.alloc(33_333));
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    const result = await processOptimizeJob(job);
    expect(result.savingsPercent).toBe(66.67);
  });
});

// ---------------------------------------------------------------------------
// Return structure and progress
// ---------------------------------------------------------------------------

describe('processOptimizeJob — return value', () => {
  it('returns all required fields', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    const result = await processOptimizeJob(job);
    for (const field of ['url', 'originalSize', 'optimizedSize', 'savingsPercent', 'format']) {
      expect(result).toHaveProperty(field);
    }
  });

  it('builds url as outputBucket/outputKey', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'media-thumbnails', outputKey: 'optimized/movie-42/cover.webp' });
    const result = await processOptimizeJob(job);
    expect(result.url).toBe('media-thumbnails/optimized/movie-42/cover.webp');
  });
});

describe('processOptimizeJob — progress', () => {
  it('reports progress at 10, 40, 80, and 100 percent', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'out', outputKey: 'img.webp' });
    await processOptimizeJob(job);
    expect(job.updateProgress).toHaveBeenCalledWith(10);
    expect(job.updateProgress).toHaveBeenCalledWith(40);
    expect(job.updateProgress).toHaveBeenCalledWith(80);
    expect(job.updateProgress).toHaveBeenCalledWith(100);
    expect(job.updateProgress).toHaveBeenCalledTimes(4);
  });
});

describe('processOptimizeJob — storage interactions', () => {
  it('downloads from the correct source', async () => {
    const job = makeJob({ sourceBucket: 'media-source', sourceKey: 'uploads/photo-99.png', outputBucket: 'out', outputKey: 'img.webp' });
    await processOptimizeJob(job);
    expect(mockDownloadBuffer).toHaveBeenCalledWith('media-source', 'uploads/photo-99.png');
  });

  it('uploads to the correct output', async () => {
    const job = makeJob({ sourceBucket: 'src', sourceKey: 'img.jpg', outputBucket: 'media-optimized', outputKey: 'optimized/photo-99.webp' });
    await processOptimizeJob(job);
    expect(mockUploadBuffer).toHaveBeenCalledWith('media-optimized', 'optimized/photo-99.webp', expect.any(Buffer), { contentType: 'image/webp' });
  });
});
