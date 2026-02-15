import { describe, it, expect } from 'vitest';
import {
  calculateQualityTier,
  getHeightFromWidth,
  getAvailableTiers
} from './quality-tier';

describe('calculateQualityTier', () => {
  it('should return LD for 240p width', () => {
    expect(calculateQualityTier(426)).toBe('LD');
  });

  it('should return LD for 360p width', () => {
    expect(calculateQualityTier(640)).toBe('LD');
  });

  it('should return SD for 480p width', () => {
    expect(calculateQualityTier(854)).toBe('SD');
  });

  it('should return HD for 720p width', () => {
    expect(calculateQualityTier(1280)).toBe('HD');
  });

  it('should return FHD for 1080p width', () => {
    expect(calculateQualityTier(1920)).toBe('FHD');
  });

  it('should return UHD for 2160p width', () => {
    expect(calculateQualityTier(3840)).toBe('UHD');
  });

  it('should return UHD8K for 4320p width', () => {
    expect(calculateQualityTier(7680)).toBe('UHD8K');
  });

  it('should return correct tier for width between breakpoints', () => {
    expect(calculateQualityTier(500)).toBe('LD'); // Between 360p and 480p
    expect(calculateQualityTier(1000)).toBe('HD'); // Between 480p and 720p
    expect(calculateQualityTier(1500)).toBe('FHD'); // Between 720p and 1080p
    expect(calculateQualityTier(2500)).toBe('UHD'); // Between 1080p and 2160p
    expect(calculateQualityTier(5000)).toBe('UHD8K'); // Between 2160p and 4320p
  });

  it('should handle edge cases at exact breakpoints', () => {
    expect(calculateQualityTier(427)).toBe('LD');
    expect(calculateQualityTier(641)).toBe('SD');
    expect(calculateQualityTier(855)).toBe('HD');
    expect(calculateQualityTier(1281)).toBe('FHD');
    expect(calculateQualityTier(1921)).toBe('UHD');
    expect(calculateQualityTier(3841)).toBe('UHD8K');
  });

  it('should return LD for invalid inputs', () => {
    expect(calculateQualityTier(0)).toBe('LD');
    expect(calculateQualityTier(-100)).toBe('LD');
    expect(calculateQualityTier(Infinity)).toBe('LD');
    expect(calculateQualityTier(NaN)).toBe('LD');
  });

  it('should return UHD8K for very large widths', () => {
    expect(calculateQualityTier(10000)).toBe('UHD8K');
    expect(calculateQualityTier(999999)).toBe('UHD8K');
  });
});

describe('getHeightFromWidth', () => {
  it('should calculate height from width for 16:9 aspect ratio', () => {
    expect(getHeightFromWidth(1920)).toBe(1080);
    expect(getHeightFromWidth(1280)).toBe(720);
    expect(getHeightFromWidth(3840)).toBe(2160);
  });

  it('should round to nearest integer', () => {
    expect(getHeightFromWidth(1000)).toBe(562); // 562.36... rounded
  });

  it('should handle zero and negative values', () => {
    expect(getHeightFromWidth(0)).toBe(0);
    expect(getHeightFromWidth(-1920)).toBe(-1080);
  });
});

describe('getAvailableTiers', () => {
  it('should return tiers up to maxTier LD', () => {
    expect(getAvailableTiers('LD')).toEqual(['LD']);
  });

  it('should return tiers up to maxTier SD', () => {
    expect(getAvailableTiers('SD')).toEqual(['LD', 'SD']);
  });

  it('should return tiers up to maxTier HD', () => {
    expect(getAvailableTiers('HD')).toEqual(['LD', 'SD', 'HD']);
  });

  it('should return tiers up to maxTier FHD', () => {
    expect(getAvailableTiers('FHD')).toEqual(['LD', 'SD', 'HD', 'FHD']);
  });

  it('should return tiers up to maxTier UHD', () => {
    expect(getAvailableTiers('UHD')).toEqual(['LD', 'SD', 'HD', 'FHD', 'UHD']);
  });

  it('should return all tiers for maxTier UHD8K', () => {
    expect(getAvailableTiers('UHD8K')).toEqual(['LD', 'SD', 'HD', 'FHD', 'UHD', 'UHD8K']);
  });
});
