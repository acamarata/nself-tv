import { describe, it, expect } from 'vitest';
import {
  ENCODING_LADDER,
  X264_PARAMS,
  HLS_CONFIG,
  selectRenditions,
  getQualityTier,
} from '../src/encoding-ladder.js';

// ---------------------------------------------------------------------------
// ENCODING_LADDER constant
// ---------------------------------------------------------------------------

describe('ENCODING_LADDER', () => {
  it('contains exactly 7 renditions', () => {
    expect(ENCODING_LADDER).toHaveLength(7);
  });

  it('has renditions sorted by ascending resolution', () => {
    for (let i = 1; i < ENCODING_LADDER.length; i++) {
      expect(ENCODING_LADDER[i].width).toBeGreaterThan(
        ENCODING_LADDER[i - 1].width,
      );
      expect(ENCODING_LADDER[i].height).toBeGreaterThan(
        ENCODING_LADDER[i - 1].height,
      );
    }
  });

  it('has CRF values decreasing as resolution increases', () => {
    for (let i = 1; i < ENCODING_LADDER.length; i++) {
      expect(ENCODING_LADDER[i].crf).toBeLessThan(ENCODING_LADDER[i - 1].crf);
    }
  });

  it('has required fields on every rendition', () => {
    const requiredFields = [
      'name',
      'width',
      'height',
      'crf',
      'profile',
      'level',
      'audioBitrate',
      'maxrate',
      'bufsize',
      'tier',
    ];

    for (const rendition of ENCODING_LADDER) {
      for (const field of requiredFields) {
        expect(rendition).toHaveProperty(field);
      }
    }
  });

  it('contains the expected rendition names', () => {
    const names = ENCODING_LADDER.map((r) => r.name);
    expect(names).toEqual([
      'r240',
      'r360',
      'r480',
      'r720',
      'r1080',
      'r2160',
      'r4320',
    ]);
  });
});

// ---------------------------------------------------------------------------
// X264_PARAMS
// ---------------------------------------------------------------------------

describe('X264_PARAMS', () => {
  it('is a colon-delimited string of key=value pairs', () => {
    const pairs = X264_PARAMS.split(':');
    expect(pairs.length).toBeGreaterThanOrEqual(8);
    for (const pair of pairs) {
      expect(pair).toMatch(/^[a-z-]+=\S+$/);
    }
  });

  it('includes all required tuning params', () => {
    expect(X264_PARAMS).toContain('rc-lookahead=60');
    expect(X264_PARAMS).toContain('me=umh');
    expect(X264_PARAMS).toContain('subme=10');
    expect(X264_PARAMS).toContain('merange=32');
    expect(X264_PARAMS).toContain('aq-mode=3');
    expect(X264_PARAMS).toContain('qcomp=0.9');
    expect(X264_PARAMS).toContain('b-adapt=2');
    expect(X264_PARAMS).toContain('qpmin=3');
  });
});

// ---------------------------------------------------------------------------
// HLS_CONFIG
// ---------------------------------------------------------------------------

describe('HLS_CONFIG', () => {
  it('has segment duration of 4 seconds', () => {
    expect(HLS_CONFIG.segmentDuration).toBe(4);
  });

  it('has GOP duration of 2 seconds', () => {
    expect(HLS_CONFIG.gopDuration).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectRenditions — never-upscale logic
// ---------------------------------------------------------------------------

describe('selectRenditions', () => {
  it('returns all 7 renditions for 8K source', () => {
    const result = selectRenditions(7680, 4320);
    expect(result).toHaveLength(7);
    expect(result[result.length - 1].name).toBe('r4320');
  });

  it('returns 6 renditions for 4K source (excludes r4320)', () => {
    const result = selectRenditions(3840, 2160);
    expect(result).toHaveLength(6);
    expect(result.map((r) => r.name)).not.toContain('r4320');
    expect(result[result.length - 1].name).toBe('r2160');
  });

  it('returns 5 renditions for 1080p source', () => {
    const result = selectRenditions(1920, 1080);
    expect(result).toHaveLength(5);
    expect(result[result.length - 1].name).toBe('r1080');
  });

  it('returns 4 renditions for 720p source', () => {
    const result = selectRenditions(1280, 720);
    expect(result).toHaveLength(4);
    expect(result[result.length - 1].name).toBe('r720');
  });

  it('returns 3 renditions for 480p source', () => {
    const result = selectRenditions(854, 480);
    expect(result).toHaveLength(3);
    expect(result[result.length - 1].name).toBe('r480');
  });

  it('returns 2 renditions for 360p source', () => {
    const result = selectRenditions(640, 360);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(['r240', 'r360']);
  });

  it('returns 1 rendition for exactly 240p source', () => {
    const result = selectRenditions(426, 240);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('r240');
  });

  it('returns empty array when source is smaller than smallest rendition', () => {
    const result = selectRenditions(320, 180);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for zero dimensions', () => {
    expect(selectRenditions(0, 0)).toHaveLength(0);
  });

  it('returns empty array for negative dimensions', () => {
    expect(selectRenditions(-1920, -1080)).toHaveLength(0);
  });

  it('returns empty array for null/undefined', () => {
    expect(selectRenditions(null, null)).toHaveLength(0);
    expect(selectRenditions(undefined, undefined)).toHaveLength(0);
  });

  it('never includes a rendition wider than the source', () => {
    const result = selectRenditions(1280, 720);
    for (const r of result) {
      expect(r.width).toBeLessThanOrEqual(1280);
    }
  });

  it('never includes a rendition taller than the source', () => {
    const result = selectRenditions(1280, 720);
    for (const r of result) {
      expect(r.height).toBeLessThanOrEqual(720);
    }
  });

  it('handles non-standard aspect ratios correctly', () => {
    // Wide but short: 1920 wide but only 480 tall
    // Should only include renditions where both width <= 1920 AND height <= 480
    const result = selectRenditions(1920, 480);
    for (const r of result) {
      expect(r.width).toBeLessThanOrEqual(1920);
      expect(r.height).toBeLessThanOrEqual(480);
    }
    // r720 is 1280x720 - height 720 > 480, so excluded
    expect(result.map((r) => r.name)).not.toContain('r720');
    expect(result.map((r) => r.name)).not.toContain('r1080');
  });

  it('handles tall but narrow sources correctly', () => {
    // 426 wide but 1080 tall — only r240 fits (width 426 <= 426, height 240 <= 1080)
    const result = selectRenditions(426, 1080);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('r240');
  });

  it('preserves the ordering from the encoding ladder', () => {
    const result = selectRenditions(3840, 2160);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].width).toBeGreaterThan(result[i - 1].width);
    }
  });
});

// ---------------------------------------------------------------------------
// getQualityTier
// ---------------------------------------------------------------------------

describe('getQualityTier', () => {
  it('classifies 8K as UHD8K', () => {
    expect(getQualityTier(7680, 4320)).toBe('UHD8K');
  });

  it('classifies 4K as UHD', () => {
    expect(getQualityTier(3840, 2160)).toBe('UHD');
  });

  it('classifies 1080p as FHD', () => {
    expect(getQualityTier(1920, 1080)).toBe('FHD');
  });

  it('classifies 720p as HD', () => {
    expect(getQualityTier(1280, 720)).toBe('HD');
  });

  it('classifies 480p as SD', () => {
    expect(getQualityTier(854, 480)).toBe('SD');
  });

  it('classifies 360p as SD', () => {
    expect(getQualityTier(640, 360)).toBe('SD');
  });

  it('classifies 240p as LD', () => {
    expect(getQualityTier(426, 240)).toBe('LD');
  });

  it('classifies very small resolutions as LD', () => {
    expect(getQualityTier(320, 180)).toBe('LD');
  });

  it('uses width OR height for classification (wide source)', () => {
    // Width alone triggers FHD even if height is shorter
    expect(getQualityTier(1920, 800)).toBe('FHD');
  });

  it('uses width OR height for classification (tall source)', () => {
    // Height alone triggers HD even if width is narrow
    expect(getQualityTier(500, 720)).toBe('HD');
  });

  it('classifies super-wide 4K content correctly', () => {
    expect(getQualityTier(5120, 1440)).toBe('UHD');
  });
});
