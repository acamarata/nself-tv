import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QualityBadge } from '@/components/ui/QualityBadge';
import { QualityTier, getTierColor, getTierLabel } from '@/lib/quality-tiers';

/** Convert hex color string to the rgb() format jsdom returns. */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

describe('QualityBadge', () => {
  it('renders the tier abbreviation', () => {
    const { getByText } = render(<QualityBadge tier={QualityTier.HD} />);
    expect(getByText('HD')).toBeDefined();
  });

  it('renders FHD tier abbreviation', () => {
    const { getByText } = render(<QualityBadge tier={QualityTier.FHD} />);
    expect(getByText('FHD')).toBeDefined();
  });

  it('renders UHD tier abbreviation', () => {
    const { getByText } = render(<QualityBadge tier={QualityTier.UHD} />);
    expect(getByText('UHD')).toBeDefined();
  });

  it('applies the correct background color for HD tier', () => {
    const { container } = render(<QualityBadge tier={QualityTier.HD} />);
    const badge = container.querySelector('span')!;
    expect(badge.style.backgroundColor).toBe(hexToRgb(getTierColor(QualityTier.HD)));
  });

  it('applies the correct background color for FHD tier', () => {
    const { container } = render(<QualityBadge tier={QualityTier.FHD} />);
    const badge = container.querySelector('span')!;
    expect(badge.style.backgroundColor).toBe(hexToRgb(getTierColor(QualityTier.FHD)));
  });

  it('applies the correct background color for each tier', () => {
    const tiers = [
      QualityTier.LD,
      QualityTier.SD,
      QualityTier.HD,
      QualityTier.FHD,
      QualityTier.UHD,
      QualityTier.UHD8K,
    ];

    for (const tier of tiers) {
      const { container } = render(<QualityBadge tier={tier} />);
      const badge = container.querySelector('span')!;
      expect(badge.style.backgroundColor).toBe(hexToRgb(getTierColor(tier)));
    }
  });

  it('applies default size (md) when no size specified', () => {
    const { getByText } = render(<QualityBadge tier={QualityTier.HD} />);
    const badge = getByText('HD');
    expect(badge.className).toContain('px-2');
    expect(badge.className).toContain('py-1');
    expect(badge.className).toContain('text-sm');
  });

  it('applies small size classes', () => {
    const { getByText } = render(<QualityBadge tier={QualityTier.HD} size="sm" />);
    const badge = getByText('HD');
    expect(badge.className).toContain('px-1.5');
    expect(badge.className).toContain('py-0.5');
    expect(badge.className).toContain('text-xs');
  });

  it('applies large size classes', () => {
    const { getByText } = render(<QualityBadge tier={QualityTier.HD} size="lg" />);
    const badge = getByText('HD');
    expect(badge.className).toContain('px-3');
    expect(badge.className).toContain('py-1.5');
    expect(badge.className).toContain('text-base');
  });

  it('sets aria-label to the full tier label', () => {
    const { getByLabelText } = render(<QualityBadge tier={QualityTier.FHD} />);
    expect(getByLabelText(getTierLabel(QualityTier.FHD))).toBeDefined();
  });

  it('sets title attribute when showLabel is true', () => {
    const { getByText } = render(
      <QualityBadge tier={QualityTier.UHD} showLabel />,
    );
    const badge = getByText('UHD');
    expect(badge.getAttribute('title')).toBe(getTierLabel(QualityTier.UHD));
  });

  it('does not set title attribute when showLabel is false', () => {
    const { getByText } = render(<QualityBadge tier={QualityTier.UHD} />);
    const badge = getByText('UHD');
    expect(badge.getAttribute('title')).toBeNull();
  });
});
