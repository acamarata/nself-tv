import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QualityProfileSelector } from '@/components/acquire/QualityProfileSelector';
import type { QualityProfile } from '@/types/acquisition';

describe('QualityProfileSelector', () => {
  it('renders all three quality profiles', () => {
    const { getByText } = render(
      <QualityProfileSelector value="balanced" onChange={vi.fn()} />,
    );
    expect(getByText('Minimal')).toBeDefined();
    expect(getByText('Balanced')).toBeDefined();
    expect(getByText('4K Premium')).toBeDefined();
  });

  it('renders descriptions for each profile', () => {
    const { getByText } = render(
      <QualityProfileSelector value="balanced" onChange={vi.fn()} />,
    );
    expect(getByText('Smallest files, SD quality, fast downloads')).toBeDefined();
    expect(getByText('Good quality/size balance, up to 1080p')).toBeDefined();
    expect(getByText('Highest quality, Remux/4K preferred')).toBeDefined();
  });

  it('checks the selected radio button', () => {
    const { container } = render(
      <QualityProfileSelector value="balanced" onChange={vi.fn()} />,
    );
    const radios = container.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(3);
    expect((radios[0] as HTMLInputElement).checked).toBe(false); // minimal
    expect((radios[1] as HTMLInputElement).checked).toBe(true);  // balanced
    expect((radios[2] as HTMLInputElement).checked).toBe(false); // 4k_premium
  });

  it('calls onChange when a different profile is selected', () => {
    const onChange = vi.fn();
    const { container } = render(
      <QualityProfileSelector value="balanced" onChange={onChange} />,
    );
    const radios = container.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[0]); // click minimal
    expect(onChange).toHaveBeenCalledWith('minimal');
  });

  it('calls onChange with 4k_premium when third option selected', () => {
    const onChange = vi.fn();
    const { container } = render(
      <QualityProfileSelector value="minimal" onChange={onChange} />,
    );
    const radios = container.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[2]); // click 4k_premium
    expect(onChange).toHaveBeenCalledWith('4k_premium');
  });

  it('renders with data-testid', () => {
    const { getByTestId } = render(
      <QualityProfileSelector value="minimal" onChange={vi.fn()} />,
    );
    expect(getByTestId('quality-profile-selector')).toBeDefined();
  });

  it('applies selected border class to active profile', () => {
    const { container } = render(
      <QualityProfileSelector value="minimal" onChange={vi.fn()} />,
    );
    const labels = container.querySelectorAll('label');
    expect(labels[0].className).toContain('border-primary');
    expect(labels[1].className).not.toContain('border-primary');
    expect(labels[2].className).not.toContain('border-primary');
  });

  it('applies hover styling to non-selected profiles', () => {
    const { container } = render(
      <QualityProfileSelector value="4k_premium" onChange={vi.fn()} />,
    );
    const labels = container.querySelectorAll('label');
    expect(labels[0].className).toContain('hover:bg-surface-hover');
    expect(labels[1].className).toContain('hover:bg-surface-hover');
    expect(labels[2].className).toContain('border-primary');
  });

  it('renders radio inputs with name qualityProfile', () => {
    const { container } = render(
      <QualityProfileSelector value="balanced" onChange={vi.fn()} />,
    );
    const radios = container.querySelectorAll('input[name="qualityProfile"]');
    expect(radios).toHaveLength(3);
  });
});
