/**
 * Quality tier classification and display utilities.
 *
 * Maps video resolution heights to standardized quality tier labels,
 * colors, and display names.
 */

export enum QualityTier {
  LD = 'LD',
  SD = 'SD',
  HD = 'HD',
  FHD = 'FHD',
  UHD = 'UHD',
  UHD8K = 'UHD8K',
}

const TIER_COLORS: Record<QualityTier, string> = {
  [QualityTier.LD]: '#9CA3AF',
  [QualityTier.SD]: '#60A5FA',
  [QualityTier.HD]: '#34D399',
  [QualityTier.FHD]: '#FBBF24',
  [QualityTier.UHD]: '#F87171',
  [QualityTier.UHD8K]: '#A78BFA',
};

const TIER_LABELS: Record<QualityTier, string> = {
  [QualityTier.LD]: 'Low Definition',
  [QualityTier.SD]: 'Standard Definition',
  [QualityTier.HD]: 'HD',
  [QualityTier.FHD]: 'Full HD',
  [QualityTier.UHD]: '4K Ultra HD',
  [QualityTier.UHD8K]: '8K Ultra HD',
};

/**
 * Determines the quality tier for a given video height in pixels.
 *
 * @param height - Video height in pixels
 * @returns The corresponding QualityTier
 */
export function getQualityTier(height: number): QualityTier {
  if (height <= 360) return QualityTier.LD;
  if (height <= 480) return QualityTier.SD;
  if (height <= 720) return QualityTier.HD;
  if (height <= 1080) return QualityTier.FHD;
  if (height <= 2160) return QualityTier.UHD;
  return QualityTier.UHD8K;
}

/**
 * Returns the display color (hex) for a quality tier.
 *
 * @param tier - The quality tier
 * @returns Hex color string
 */
export function getTierColor(tier: QualityTier): string {
  return TIER_COLORS[tier];
}

/**
 * Returns the human-readable label for a quality tier.
 *
 * @param tier - The quality tier
 * @returns Display label string
 */
export function getTierLabel(tier: QualityTier): string {
  return TIER_LABELS[tier];
}

/**
 * Determines the maximum quality tier from a list of video variants.
 *
 * @param variants - Array of objects with width and height properties
 * @returns The highest QualityTier present in the variants
 */
export function getMaxQuality(variants: { width: number; height: number }[]): QualityTier {
  if (variants.length === 0) {
    return QualityTier.LD;
  }

  let maxHeight = 0;
  for (const variant of variants) {
    if (variant.height > maxHeight) {
      maxHeight = variant.height;
    }
  }

  return getQualityTier(maxHeight);
}
