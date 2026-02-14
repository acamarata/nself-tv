/**
 * Sprite sheet worker tests.
 *
 * Uses Module._load override to intercept CJS require() calls.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';

// ---------------------------------------------------------------------------
// Mock definitions
// ---------------------------------------------------------------------------

const mockToBufferSprite = vi.fn();
const mockWebpSprite = vi.fn(() => ({ toBuffer: mockToBufferSprite }));
const mockComposite = vi.fn(() => ({ webp: mockWebpSprite }));

const mockToBufferResize = vi.fn();
const mockWebpResize = vi.fn(() => ({ toBuffer: mockToBufferResize }));
const mockResizeFit = vi.fn(() => ({ webp: mockWebpResize }));

const mockSharpFn = vi.fn((input) => {
  if (input && typeof input === 'object' && !Buffer.isBuffer(input) && input.create) {
    return { composite: mockComposite };
  }
  return { resize: mockResizeFit };
});

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
const { processSpriteJob } = _require('../src/workers/sprite-worker.js');

afterAll(() => { Module._load = originalLoad; });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(data, id = 'sprite-test-1') {
  return { id, data, updateProgress: vi.fn() };
}

function makeImages(count) {
  return Array.from({ length: count }, (_, i) => ({
    bucket: 'media-source',
    key: `frames/frame-${String(i).padStart(4, '0')}.jpg`,
    timestamp: i * 10,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDownloadBuffer.mockResolvedValue(Buffer.alloc(5_000, 0xaa));
  mockToBufferResize.mockResolvedValue(Buffer.alloc(3_000, 0xbb));
  mockToBufferSprite.mockResolvedValue(Buffer.alloc(200_000, 0xcc));
  mockUploadBuffer.mockImplementation((_b, key) => Promise.resolve(key));
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('processSpriteJob — validation', () => {
  it('throws when images is not provided', async () => {
    const job = makeJob({ outputBucket: 'out', outputPrefix: 'sprites/' });
    await expect(processSpriteJob(job)).rejects.toThrow('images array is required and must not be empty');
  });

  it('throws when images is an empty array', async () => {
    const job = makeJob({ images: [], outputBucket: 'out', outputPrefix: 'sprites/' });
    await expect(processSpriteJob(job)).rejects.toThrow('images array is required and must not be empty');
  });

  it('throws when images is not an array', async () => {
    const job = makeJob({ images: 'not-an-array', outputBucket: 'out', outputPrefix: 'sprites/' });
    await expect(processSpriteJob(job)).rejects.toThrow('images array is required and must not be empty');
  });

  it('throws when outputBucket is missing', async () => {
    const job = makeJob({ images: makeImages(5), outputPrefix: 'sprites/' });
    await expect(processSpriteJob(job)).rejects.toThrow('outputBucket and outputPrefix are required');
  });

  it('throws when outputPrefix is missing', async () => {
    const job = makeJob({ images: makeImages(5), outputBucket: 'out' });
    await expect(processSpriteJob(job)).rejects.toThrow('outputBucket and outputPrefix are required');
  });
});

// ---------------------------------------------------------------------------
// Full 10x10 grid (100 images)
// ---------------------------------------------------------------------------

describe('processSpriteJob — full 10x10 grid', () => {
  it('produces exactly 1 sprite sheet for 100 images with default 10x10 grid', async () => {
    const job = makeJob({ images: makeImages(100), outputBucket: 'out', outputPrefix: 'sprites/movie-1/' });
    const result = await processSpriteJob(job);
    expect(result.sprites).toHaveLength(1);
  });

  it('sets correct grid dimensions for a full sheet', async () => {
    const job = makeJob({ images: makeImages(100), outputBucket: 'out', outputPrefix: 'sprites/movie-1/' });
    const result = await processSpriteJob(job);
    const sheet = result.sprites[0];
    expect(sheet.gridWidth).toBe(10);
    expect(sheet.gridHeight).toBe(10);
    expect(sheet.startIndex).toBe(0);
    expect(sheet.endIndex).toBe(99);
  });

  it('creates the sprite canvas at 3200x1800 (10*320 x 10*180)', async () => {
    const job = makeJob({ images: makeImages(100), outputBucket: 'out', outputPrefix: 'sprites/movie-1/' });
    await processSpriteJob(job);
    const createCall = mockSharpFn.mock.calls.find(
      (c) => c[0] && typeof c[0] === 'object' && !Buffer.isBuffer(c[0]) && c[0].create,
    );
    expect(createCall).toBeDefined();
    expect(createCall[0].create.width).toBe(3200);
    expect(createCall[0].create.height).toBe(1800);
  });

  it('downloads each image from storage', async () => {
    const images = makeImages(100);
    const job = makeJob({ images, outputBucket: 'out', outputPrefix: 'sprites/movie-1/' });
    await processSpriteJob(job);
    expect(mockDownloadBuffer).toHaveBeenCalledTimes(100);
    expect(mockDownloadBuffer).toHaveBeenCalledWith('media-source', 'frames/frame-0000.jpg');
    expect(mockDownloadBuffer).toHaveBeenCalledWith('media-source', 'frames/frame-0099.jpg');
  });

  it('resizes each thumbnail to 320x180 with cover fit', async () => {
    const job = makeJob({ images: makeImages(100), outputBucket: 'out', outputPrefix: 'sprites/movie-1/' });
    await processSpriteJob(job);
    expect(mockResizeFit).toHaveBeenCalledTimes(100);
    for (const call of mockResizeFit.mock.calls) {
      expect(call[0]).toEqual({ width: 320, height: 180, fit: 'cover' });
    }
  });

  it('composites all 100 thumbnails onto the sprite sheet', async () => {
    const job = makeJob({ images: makeImages(100), outputBucket: 'out', outputPrefix: 'sprites/movie-1/' });
    await processSpriteJob(job);
    expect(mockComposite).toHaveBeenCalledTimes(1);
    const composites = mockComposite.mock.calls[0][0];
    expect(composites).toHaveLength(100);
    expect(composites[0].left).toBe(0);
    expect(composites[0].top).toBe(0);
    expect(composites[10].left).toBe(0);
    expect(composites[10].top).toBe(180);
    expect(composites[99].left).toBe(9 * 320);
    expect(composites[99].top).toBe(9 * 180);
  });

  it('uploads the sprite sheet with correct key', async () => {
    const job = makeJob({ images: makeImages(100), outputBucket: 'my-bucket', outputPrefix: 'sprites/movie-1/' });
    await processSpriteJob(job);
    expect(mockUploadBuffer).toHaveBeenCalledTimes(1);
    expect(mockUploadBuffer).toHaveBeenCalledWith(
      'my-bucket', 'sprites/movie-1/sprite-0.webp', expect.any(Buffer), { contentType: 'image/webp' },
    );
  });

  it('returns the url as outputBucket/outputKey', async () => {
    const job = makeJob({ images: makeImages(100), outputBucket: 'my-bucket', outputPrefix: 'sprites/movie-1/' });
    const result = await processSpriteJob(job);
    expect(result.sprites[0].url).toBe('my-bucket/sprites/movie-1/sprite-0.webp');
  });
});

// ---------------------------------------------------------------------------
// Multiple sheets
// ---------------------------------------------------------------------------

describe('processSpriteJob — multiple sheets', () => {
  it('produces 2 sheets for 150 images with 10x10 grid', async () => {
    const job = makeJob({ images: makeImages(150), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    expect(result.sprites).toHaveLength(2);
  });

  it('first sheet covers indices 0-99, second covers 100-149', async () => {
    const job = makeJob({ images: makeImages(150), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    expect(result.sprites[0].startIndex).toBe(0);
    expect(result.sprites[0].endIndex).toBe(99);
    expect(result.sprites[1].startIndex).toBe(100);
    expect(result.sprites[1].endIndex).toBe(149);
  });

  it('produces 3 sheets for 250 images', async () => {
    const job = makeJob({ images: makeImages(250), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    expect(result.sprites).toHaveLength(3);
    expect(result.sprites[2].startIndex).toBe(200);
    expect(result.sprites[2].endIndex).toBe(249);
  });

  it('names sprite sheets sequentially', async () => {
    const job = makeJob({ images: makeImages(250), outputBucket: 'out', outputPrefix: 'sprites/movie-7/' });
    await processSpriteJob(job);
    const uploadedKeys = mockUploadBuffer.mock.calls.map((c) => c[1]);
    expect(uploadedKeys).toEqual([
      'sprites/movie-7/sprite-0.webp',
      'sprites/movie-7/sprite-1.webp',
      'sprites/movie-7/sprite-2.webp',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Partial last sheet
// ---------------------------------------------------------------------------

describe('processSpriteJob — partial last sheet', () => {
  it('handles 5 images on the last sheet (single row)', async () => {
    const job = makeJob({ images: makeImages(105), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    const lastSheet = result.sprites[1];
    expect(lastSheet.startIndex).toBe(100);
    expect(lastSheet.endIndex).toBe(104);
    expect(lastSheet.gridWidth).toBe(5);
    expect(lastSheet.gridHeight).toBe(1);
  });

  it('handles 15 images on the last sheet (two rows)', async () => {
    const job = makeJob({ images: makeImages(115), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    const lastSheet = result.sprites[1];
    expect(lastSheet.gridWidth).toBe(10);
    expect(lastSheet.gridHeight).toBe(2);
  });

  it('creates correct canvas dimensions for partial sheet with 1 row', async () => {
    const job = makeJob({ images: makeImages(3), outputBucket: 'out', outputPrefix: 'sprites/' });
    await processSpriteJob(job);
    const createCall = mockSharpFn.mock.calls.find(
      (c) => c[0] && typeof c[0] === 'object' && !Buffer.isBuffer(c[0]) && c[0].create,
    );
    expect(createCall[0].create.width).toBe(3 * 320);
    expect(createCall[0].create.height).toBe(1 * 180);
  });

  it('creates correct canvas dimensions for partial sheet with 2 rows', async () => {
    const job = makeJob({ images: makeImages(12), outputBucket: 'out', outputPrefix: 'sprites/' });
    await processSpriteJob(job);
    const createCall = mockSharpFn.mock.calls.find(
      (c) => c[0] && typeof c[0] === 'object' && !Buffer.isBuffer(c[0]) && c[0].create,
    );
    expect(createCall[0].create.width).toBe(10 * 320);
    expect(createCall[0].create.height).toBe(2 * 180);
  });

  it('handles exactly 1 image (degenerate case)', async () => {
    const job = makeJob({ images: makeImages(1), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].gridWidth).toBe(1);
    expect(result.sprites[0].gridHeight).toBe(1);
  });

  it('composites partial sheet thumbnails at correct positions', async () => {
    const job = makeJob({ images: makeImages(12), outputBucket: 'out', outputPrefix: 'sprites/' });
    await processSpriteJob(job);
    const composites = mockComposite.mock.calls[0][0];
    expect(composites).toHaveLength(12);
    for (let col = 0; col < 10; col++) {
      expect(composites[col].left).toBe(col * 320);
      expect(composites[col].top).toBe(0);
    }
    expect(composites[10].left).toBe(0);
    expect(composites[10].top).toBe(180);
    expect(composites[11].left).toBe(320);
    expect(composites[11].top).toBe(180);
  });

  it('correctly sizes a sheet with exactly 10 images', async () => {
    const job = makeJob({ images: makeImages(10), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    expect(result.sprites[0].gridWidth).toBe(10);
    expect(result.sprites[0].gridHeight).toBe(1);
  });

  it('correctly sizes a sheet with 11 images', async () => {
    const job = makeJob({ images: makeImages(11), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    expect(result.sprites[0].gridWidth).toBe(10);
    expect(result.sprites[0].gridHeight).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Custom grid and thumb dimensions
// ---------------------------------------------------------------------------

describe('processSpriteJob — custom grid and thumb dimensions', () => {
  it('uses custom grid size [5, 5] for 25 images per sheet', async () => {
    const job = makeJob({ images: makeImages(30), outputBucket: 'out', outputPrefix: 'sprites/', gridSize: [5, 5] });
    const result = await processSpriteJob(job);
    expect(result.sprites).toHaveLength(2);
    expect(result.sprites[0].gridWidth).toBe(5);
    expect(result.sprites[0].gridHeight).toBe(5);
    expect(result.sprites[1].startIndex).toBe(25);
    expect(result.sprites[1].endIndex).toBe(29);
  });

  it('uses custom thumb dimensions', async () => {
    const job = makeJob({ images: makeImages(4), outputBucket: 'out', outputPrefix: 'sprites/', thumbWidth: 160, thumbHeight: 90 });
    await processSpriteJob(job);
    for (const call of mockResizeFit.mock.calls) {
      expect(call[0].width).toBe(160);
      expect(call[0].height).toBe(90);
    }
  });

  it('returns thumbWidth and thumbHeight in sprite metadata', async () => {
    const job = makeJob({ images: makeImages(4), outputBucket: 'out', outputPrefix: 'sprites/', thumbWidth: 160, thumbHeight: 90 });
    const result = await processSpriteJob(job);
    expect(result.sprites[0].thumbWidth).toBe(160);
    expect(result.sprites[0].thumbHeight).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// Progress and return structure
// ---------------------------------------------------------------------------

describe('processSpriteJob — progress', () => {
  it('reports progress ending at 100%', async () => {
    const job = makeJob({ images: makeImages(10), outputBucket: 'out', outputPrefix: 'sprites/' });
    await processSpriteJob(job);
    const lastCall = job.updateProgress.mock.calls[job.updateProgress.mock.calls.length - 1];
    expect(lastCall[0]).toBe(100);
  });

  it('first half of progress is for download/resize (0-50%)', async () => {
    const job = makeJob({ images: makeImages(20), outputBucket: 'out', outputPrefix: 'sprites/' });
    await processSpriteJob(job);
    const allCalls = job.updateProgress.mock.calls.map((c) => c[0]);
    expect(allCalls).toContain(50);
  });
});

describe('processSpriteJob — return value', () => {
  it('returns all required fields on each sprite entry', async () => {
    const job = makeJob({ images: makeImages(50), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    const requiredFields = ['url', 'startIndex', 'endIndex', 'gridWidth', 'gridHeight', 'thumbWidth', 'thumbHeight'];
    for (const sprite of result.sprites) {
      for (const field of requiredFields) {
        expect(sprite).toHaveProperty(field);
      }
    }
  });

  it('uses default thumbWidth 320 and thumbHeight 180', async () => {
    const job = makeJob({ images: makeImages(10), outputBucket: 'out', outputPrefix: 'sprites/' });
    const result = await processSpriteJob(job);
    expect(result.sprites[0].thumbWidth).toBe(320);
    expect(result.sprites[0].thumbHeight).toBe(180);
  });
});
