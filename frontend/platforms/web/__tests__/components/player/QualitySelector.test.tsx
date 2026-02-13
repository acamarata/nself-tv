import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QualitySelector } from '@/components/player/QualitySelector';
import type { QualityLevel } from '@/lib/bba2/algorithm';

function makeLevels(): QualityLevel[] {
  return [
    { index: 0, bitrate: 500_000, width: 640, height: 360, name: 'Low' },
    { index: 1, bitrate: 1_500_000, width: 1280, height: 720, name: 'Medium' },
    { index: 2, bitrate: 4_000_000, width: 1920, height: 1080, name: 'High' },
  ];
}

describe('QualitySelector', () => {
  it('renders the quality levels list', () => {
    const levels = makeLevels();
    const { getByText } = render(
      <QualitySelector
        levels={levels}
        currentLevel={0}
        autoMode={false}
        onSelectLevel={vi.fn()}
      />,
    );
    expect(getByText('Low')).toBeDefined();
    expect(getByText('Medium')).toBeDefined();
    expect(getByText('High')).toBeDefined();
  });

  it('shows the "Auto" option', () => {
    const levels = makeLevels();
    const { getByText } = render(
      <QualitySelector
        levels={levels}
        currentLevel={0}
        autoMode={false}
        onSelectLevel={vi.fn()}
      />,
    );
    expect(getByText('Auto')).toBeDefined();
  });

  it('shows current quality name in parentheses when auto mode is active', () => {
    const levels = makeLevels();
    const { getByText } = render(
      <QualitySelector
        levels={levels}
        currentLevel={1}
        autoMode={true}
        onSelectLevel={vi.fn()}
      />,
    );
    expect(getByText('(Medium)')).toBeDefined();
  });

  it('does not show quality name in parentheses when auto mode is off', () => {
    const levels = makeLevels();
    const { queryByText } = render(
      <QualitySelector
        levels={levels}
        currentLevel={1}
        autoMode={false}
        onSelectLevel={vi.fn()}
      />,
    );
    expect(queryByText('(Medium)')).toBeNull();
  });

  it('marks the Auto option as selected when autoMode is true', () => {
    const levels = makeLevels();
    const { getAllByRole } = render(
      <QualitySelector
        levels={levels}
        currentLevel={0}
        autoMode={true}
        onSelectLevel={vi.fn()}
      />,
    );
    const options = getAllByRole('option');
    // First option is Auto
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('marks the correct level as selected when autoMode is false', () => {
    const levels = makeLevels();
    const { getAllByRole } = render(
      <QualitySelector
        levels={levels}
        currentLevel={1}
        autoMode={false}
        onSelectLevel={vi.fn()}
      />,
    );
    const options = getAllByRole('option');
    // Options: Auto (index 0), 1080p (index 1, reversed), 720p (index 2, reversed), 360p (index 3, reversed)
    // currentLevel=1 => 720p is active. In reversed order: 1080p(idx2), 720p(idx1), 360p(idx0)
    // So 720p is at index 2 in the rendered list (Auto=0, 1080p=1, 720p=2, 360p=3)
    expect(options[0].getAttribute('aria-selected')).toBe('false'); // Auto
    expect(options[2].getAttribute('aria-selected')).toBe('true');  // 720p
  });

  it('calls onSelectLevel with "auto" when Auto is clicked', () => {
    const onSelectLevel = vi.fn();
    const levels = makeLevels();
    const { getByText } = render(
      <QualitySelector
        levels={levels}
        currentLevel={0}
        autoMode={false}
        onSelectLevel={onSelectLevel}
      />,
    );
    fireEvent.click(getByText('Auto'));
    expect(onSelectLevel).toHaveBeenCalledWith('auto');
  });

  it('calls onSelectLevel with level index when a quality level is clicked', () => {
    const onSelectLevel = vi.fn();
    const levels = makeLevels();
    const { getByText } = render(
      <QualitySelector
        levels={levels}
        currentLevel={0}
        autoMode={false}
        onSelectLevel={onSelectLevel}
      />,
    );
    fireEvent.click(getByText('Medium'));
    expect(onSelectLevel).toHaveBeenCalledWith(1);
  });

  it('shows resolution height for each level', () => {
    const levels = makeLevels();
    const { getByText } = render(
      <QualitySelector
        levels={levels}
        currentLevel={0}
        autoMode={false}
        onSelectLevel={vi.fn()}
      />,
    );
    expect(getByText('360p')).toBeDefined();
    expect(getByText('720p')).toBeDefined();
    expect(getByText('1080p')).toBeDefined();
  });

  it('has a listbox role for accessibility', () => {
    const levels = makeLevels();
    const { getByRole } = render(
      <QualitySelector
        levels={levels}
        currentLevel={0}
        autoMode={false}
        onSelectLevel={vi.fn()}
      />,
    );
    expect(getByRole('listbox')).toBeDefined();
  });

  it('renders "Quality" heading', () => {
    const levels = makeLevels();
    const { getByText } = render(
      <QualitySelector
        levels={levels}
        currentLevel={0}
        autoMode={false}
        onSelectLevel={vi.fn()}
      />,
    );
    expect(getByText('Quality')).toBeDefined();
  });
});
