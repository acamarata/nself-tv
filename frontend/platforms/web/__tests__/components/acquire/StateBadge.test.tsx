import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StateBadge } from '@/components/acquire/StateBadge';
import type { DownloadState } from '@/types/acquisition';

const ALL_STATES: { state: DownloadState; label: string }[] = [
  { state: 'created', label: 'Created' },
  { state: 'vpn_connecting', label: 'VPN' },
  { state: 'searching', label: 'Searching' },
  { state: 'downloading', label: 'Downloading' },
  { state: 'encoding', label: 'Encoding' },
  { state: 'subtitles', label: 'Subtitles' },
  { state: 'uploading', label: 'Uploading' },
  { state: 'finalizing', label: 'Finalizing' },
  { state: 'completed', label: 'Completed' },
  { state: 'failed', label: 'Failed' },
  { state: 'cancelled', label: 'Cancelled' },
];

describe('StateBadge', () => {
  it.each(ALL_STATES)('renders "$label" for state "$state"', ({ state, label }) => {
    const { getByText } = render(<StateBadge state={state} />);
    expect(getByText(label)).toBeDefined();
  });

  it.each(ALL_STATES)('sets data-testid for state "$state"', ({ state }) => {
    const { getByTestId } = render(<StateBadge state={state} />);
    expect(getByTestId(`state-badge-${state}`)).toBeDefined();
  });

  it('renders as an inline-flex span', () => {
    const { getByTestId } = render(<StateBadge state="downloading" />);
    const badge = getByTestId('state-badge-downloading');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.className).toContain('inline-flex');
  });

  it('applies green color class for completed state', () => {
    const { getByTestId } = render(<StateBadge state="completed" />);
    expect(getByTestId('state-badge-completed').className).toContain('text-green-500');
  });

  it('applies red color class for failed state', () => {
    const { getByTestId } = render(<StateBadge state="failed" />);
    expect(getByTestId('state-badge-failed').className).toContain('text-red-500');
  });

  it('applies yellow color class for downloading state', () => {
    const { getByTestId } = render(<StateBadge state="downloading" />);
    expect(getByTestId('state-badge-downloading').className).toContain('text-yellow-500');
  });

  it('applies purple color class for encoding state', () => {
    const { getByTestId } = render(<StateBadge state="encoding" />);
    expect(getByTestId('state-badge-encoding').className).toContain('text-purple-500');
  });

  it('applies blue color class for vpn_connecting state', () => {
    const { getByTestId } = render(<StateBadge state="vpn_connecting" />);
    expect(getByTestId('state-badge-vpn_connecting').className).toContain('text-blue-500');
  });

  it('applies rounded-full class for pill shape', () => {
    const { getByTestId } = render(<StateBadge state="created" />);
    expect(getByTestId('state-badge-created').className).toContain('rounded-full');
  });

  it('applies text-xs font-medium class', () => {
    const { getByTestId } = render(<StateBadge state="created" />);
    const badge = getByTestId('state-badge-created');
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('font-medium');
  });
});
