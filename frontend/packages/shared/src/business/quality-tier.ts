import type { QualityTier } from '../constants';

/**
 * Calculate quality tier from video resolution width
 *
 * Maps resolution to encoding ladder tiers:
 * - 240p, 360p → LD (Low Definition)
 * - 480p → SD (Standard Definition)
 * - 720p → HD (High Definition)
 * - 1080p → FHD (Full HD)
 * - 2160p → UHD (Ultra HD / 4K)
 * - 4320p → UHD8K (8K)
 *
 * @param width - Video resolution width in pixels
 * @returns Quality tier classification
 *
 * @example
 * calculateQualityTier(1920) // 'FHD'
 * calculateQualityTier(3840) // 'UHD'
 * calculateQualityTier(640)  // 'SD' (closest match)
 */
export function calculateQualityTier(width: number): QualityTier {
  // Handle invalid input
  if (width <= 0 || !Number.isFinite(width)) {
    return 'LD';
  }

  // Define resolution height breakpoints (based on standard aspect ratios)
  // For 16:9 content: width ≈ height * 1.778
  const breakpoints: Array<{ maxWidth: number; tier: QualityTier }> = [
    { maxWidth: 427, tier: 'LD' },   // 240p (426x240)
    { maxWidth: 640, tier: 'LD' },   // 360p (640x360)
    { maxWidth: 854, tier: 'SD' },   // 480p (854x480)
    { maxWidth: 1280, tier: 'HD' },  // 720p (1280x720)
    { maxWidth: 1920, tier: 'FHD' }, // 1080p (1920x1080)
    { maxWidth: 3840, tier: 'UHD' }, // 2160p (3840x2160)
    { maxWidth: Infinity, tier: 'UHD8K' } // 4320p (7680x4320)
  ];

  for (const { maxWidth, tier } of breakpoints) {
    if (width <= maxWidth) {
      return tier;
    }
  }

  // Fallback (should never reach here due to Infinity breakpoint)
  return 'UHD8K';
}

/**
 * Get resolution height from width (assuming 16:9 aspect ratio)
 *
 * @param width - Video resolution width
 * @returns Corresponding height for 16:9 aspect ratio
 */
export function getHeightFromWidth(width: number): number {
  return Math.round(width / 1.778);
}

/**
 * Get all available quality tiers up to a maximum tier
 *
 * @param maxTier - Maximum quality tier available
 * @returns Array of quality tiers from LD to maxTier
 */
export function getAvailableTiers(maxTier: QualityTier): QualityTier[] {
  const tierOrder: QualityTier[] = ['LD', 'SD', 'HD', 'FHD', 'UHD', 'UHD8K'];
  const maxIndex = tierOrder.indexOf(maxTier);
  return tierOrder.slice(0, maxIndex + 1);
}
