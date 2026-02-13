'use client';

import { QualityTier, getTierColor, getTierLabel } from '@/lib/quality-tiers';

interface QualityBadgeProps {
  /** The quality tier to display. */
  tier: QualityTier;
  /** Badge size variant. */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the full tier label as a title attribute. */
  showLabel?: boolean;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

/**
 * Displays a colored badge representing a video quality tier.
 */
function QualityBadge({ tier, size = 'md', showLabel = false }: QualityBadgeProps) {
  const color = getTierColor(tier);
  const label = getTierLabel(tier);

  return (
    <span
      className={`inline-flex items-center font-semibold rounded text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: color }}
      title={showLabel ? label : undefined}
      aria-label={label}
    >
      {tier}
    </span>
  );
}

export { QualityBadge };
export type { QualityBadgeProps };
