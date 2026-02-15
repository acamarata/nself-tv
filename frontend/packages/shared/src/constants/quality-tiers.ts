export const QUALITY_TIERS = {
  LD: 'LD',     // Low Definition: 240p, 360p
  SD: 'SD',     // Standard Definition: 480p
  HD: 'HD',     // High Definition: 720p
  FHD: 'FHD',   // Full HD: 1080p
  UHD: 'UHD',   // Ultra HD (4K): 2160p
  UHD8K: 'UHD8K' // 8K: 4320p
} as const;

export type QualityTier = typeof QUALITY_TIERS[keyof typeof QUALITY_TIERS];

/**
 * Resolution to quality tier mapping based on encoding ladder
 * Matches Phase 2 encoding ladder: r240, r360, r480, r720, r1080, r2160, r4320
 */
export const RESOLUTION_TO_TIER: Record<number, QualityTier> = {
  240: 'LD',
  360: 'LD',
  480: 'SD',
  720: 'HD',
  1080: 'FHD',
  2160: 'UHD',
  4320: 'UHD8K'
};

/**
 * Quality tier display names
 */
export const TIER_LABELS: Record<QualityTier, string> = {
  LD: 'Low Definition',
  SD: 'Standard Definition',
  HD: 'High Definition',
  FHD: 'Full HD',
  UHD: 'Ultra HD (4K)',
  UHD8K: '8K Ultra HD'
};

/**
 * Quality tier colors for UI badges
 */
export const TIER_COLORS: Record<QualityTier, string> = {
  LD: '#6b7280',    // gray-500
  SD: '#3b82f6',    // blue-500
  HD: '#10b981',    // green-500
  FHD: '#8b5cf6',   // purple-500
  UHD: '#f59e0b',   // amber-500
  UHD8K: '#ef4444'  // red-500
};
