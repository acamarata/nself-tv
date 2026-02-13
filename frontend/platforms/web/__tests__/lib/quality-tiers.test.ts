import { describe, it, expect } from 'vitest';
import {
  QualityTier,
  getQualityTier,
  getTierColor,
  getTierLabel,
  getMaxQuality,
} from '@/lib/quality-tiers';

describe('getQualityTier', () => {
  it('returns LD for height <= 360', () => {
    expect(getQualityTier(0)).toBe(QualityTier.LD);
    expect(getQualityTier(240)).toBe(QualityTier.LD);
    expect(getQualityTier(360)).toBe(QualityTier.LD);
  });

  it('returns SD for height 361-480', () => {
    expect(getQualityTier(361)).toBe(QualityTier.SD);
    expect(getQualityTier(420)).toBe(QualityTier.SD);
    expect(getQualityTier(480)).toBe(QualityTier.SD);
  });

  it('returns HD for height 481-720', () => {
    expect(getQualityTier(481)).toBe(QualityTier.HD);
    expect(getQualityTier(600)).toBe(QualityTier.HD);
    expect(getQualityTier(720)).toBe(QualityTier.HD);
  });

  it('returns FHD for height 721-1080', () => {
    expect(getQualityTier(721)).toBe(QualityTier.FHD);
    expect(getQualityTier(900)).toBe(QualityTier.FHD);
    expect(getQualityTier(1080)).toBe(QualityTier.FHD);
  });

  it('returns UHD for height 1081-2160', () => {
    expect(getQualityTier(1081)).toBe(QualityTier.UHD);
    expect(getQualityTier(1440)).toBe(QualityTier.UHD);
    expect(getQualityTier(2160)).toBe(QualityTier.UHD);
  });

  it('returns UHD8K for height > 2160', () => {
    expect(getQualityTier(2161)).toBe(QualityTier.UHD8K);
    expect(getQualityTier(4320)).toBe(QualityTier.UHD8K);
    expect(getQualityTier(8640)).toBe(QualityTier.UHD8K);
  });
});

describe('getTierColor', () => {
  it('returns correct color for LD', () => {
    expect(getTierColor(QualityTier.LD)).toBe('#9CA3AF');
  });

  it('returns correct color for SD', () => {
    expect(getTierColor(QualityTier.SD)).toBe('#60A5FA');
  });

  it('returns correct color for HD', () => {
    expect(getTierColor(QualityTier.HD)).toBe('#34D399');
  });

  it('returns correct color for FHD', () => {
    expect(getTierColor(QualityTier.FHD)).toBe('#FBBF24');
  });

  it('returns correct color for UHD', () => {
    expect(getTierColor(QualityTier.UHD)).toBe('#F87171');
  });

  it('returns correct color for UHD8K', () => {
    expect(getTierColor(QualityTier.UHD8K)).toBe('#A78BFA');
  });
});

describe('getTierLabel', () => {
  it('returns correct label for LD', () => {
    expect(getTierLabel(QualityTier.LD)).toBe('Low Definition');
  });

  it('returns correct label for SD', () => {
    expect(getTierLabel(QualityTier.SD)).toBe('Standard Definition');
  });

  it('returns correct label for HD', () => {
    expect(getTierLabel(QualityTier.HD)).toBe('HD');
  });

  it('returns correct label for FHD', () => {
    expect(getTierLabel(QualityTier.FHD)).toBe('Full HD');
  });

  it('returns correct label for UHD', () => {
    expect(getTierLabel(QualityTier.UHD)).toBe('4K Ultra HD');
  });

  it('returns correct label for UHD8K', () => {
    expect(getTierLabel(QualityTier.UHD8K)).toBe('8K Ultra HD');
  });
});

describe('getMaxQuality', () => {
  it('returns LD for empty variants array', () => {
    expect(getMaxQuality([])).toBe(QualityTier.LD);
  });

  it('returns correct tier for single variant', () => {
    expect(getMaxQuality([{ width: 1920, height: 1080 }])).toBe(QualityTier.FHD);
  });

  it('returns highest tier from mixed variants', () => {
    const variants = [
      { width: 640, height: 360 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ];
    expect(getMaxQuality(variants)).toBe(QualityTier.FHD);
  });

  it('returns UHD when 4K variant is present', () => {
    const variants = [
      { width: 640, height: 360 },
      { width: 3840, height: 2160 },
    ];
    expect(getMaxQuality(variants)).toBe(QualityTier.UHD);
  });

  it('returns UHD8K when 8K variant is present', () => {
    const variants = [
      { width: 1920, height: 1080 },
      { width: 7680, height: 4320 },
    ];
    expect(getMaxQuality(variants)).toBe(QualityTier.UHD8K);
  });

  it('handles all LD variants', () => {
    const variants = [
      { width: 320, height: 240 },
      { width: 640, height: 360 },
    ];
    expect(getMaxQuality(variants)).toBe(QualityTier.LD);
  });

  it('handles unsorted variants correctly', () => {
    const variants = [
      { width: 1920, height: 1080 },
      { width: 640, height: 360 },
      { width: 3840, height: 2160 },
      { width: 1280, height: 720 },
    ];
    expect(getMaxQuality(variants)).toBe(QualityTier.UHD);
  });
});

describe('QualityTier enum values', () => {
  it('has correct string values', () => {
    expect(QualityTier.LD).toBe('LD');
    expect(QualityTier.SD).toBe('SD');
    expect(QualityTier.HD).toBe('HD');
    expect(QualityTier.FHD).toBe('FHD');
    expect(QualityTier.UHD).toBe('UHD');
    expect(QualityTier.UHD8K).toBe('UHD8K');
  });
});
