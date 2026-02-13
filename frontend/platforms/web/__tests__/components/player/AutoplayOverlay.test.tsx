import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AutoplayOverlay } from '@/components/player/AutoplayOverlay';
import type { NextEpisodeInfo } from '@/hooks/useAutoplayNext';

function makeEpisode(overrides: Partial<NextEpisodeInfo> = {}): NextEpisodeInfo {
  return {
    id: 'ep-123',
    title: 'The Next Chapter',
    seasonNumber: 2,
    episodeNumber: 5,
    stillUrl: null,
    ...overrides,
  };
}

describe('AutoplayOverlay', () => {
  it('renders the episode title', () => {
    const episode = makeEpisode({ title: 'Into the Storm' });
    const { getByText } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={10}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText('Into the Storm')).toBeDefined();
  });

  it('renders the episode label in S0XE0X format', () => {
    const episode = makeEpisode({ seasonNumber: 2, episodeNumber: 5 });
    const { getByText } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={10}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText('S02E05')).toBeDefined();
  });

  it('renders S01E01 for single-digit season and episode numbers', () => {
    const episode = makeEpisode({ seasonNumber: 1, episodeNumber: 1 });
    const { getByText } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={10}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText('S01E01')).toBeDefined();
  });

  it('shows the countdown number', () => {
    const episode = makeEpisode();
    const { getByText } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={7}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText('7')).toBeDefined();
  });

  it('shows "Up Next" label', () => {
    const episode = makeEpisode();
    const { getByText } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={10}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText('Up Next')).toBeDefined();
  });

  it('calls onPlay when Play Now button is clicked', () => {
    const onPlay = vi.fn();
    const episode = makeEpisode();
    const { getByText } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={10}
        onPlay={onPlay}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(getByText('Play Now'));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    const episode = makeEpisode();
    const { getByText } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={10}
        onPlay={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders the thumbnail when stillUrl is provided', () => {
    const episode = makeEpisode({ stillUrl: 'https://example.com/thumb.jpg' });
    const { container } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={10}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('https://example.com/thumb.jpg');
  });

  it('does not render a thumbnail when stillUrl is null', () => {
    const episode = makeEpisode({ stillUrl: null });
    const { container } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={10}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const img = container.querySelector('img');
    expect(img).toBeNull();
  });

  it('displays the correct countdown value', () => {
    const episode = makeEpisode();
    const { getByText, rerender } = render(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={15}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText('15')).toBeDefined();

    rerender(
      <AutoplayOverlay
        nextEpisode={episode}
        countdown={3}
        onPlay={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText('3')).toBeDefined();
  });
});
