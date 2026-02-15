import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ContentGrid } from '@/components/content/ContentGrid';
import type { MediaItem } from '@/types/content';

const mockItems: MediaItem[] = [
  {
    id: '1',
    type: 'movie',
    title: 'Grid Movie',
    originalTitle: null,
    year: 2026,
    overview: 'A movie in the grid',
    posterUrl: '/poster.jpg',
    backdropUrl: null,
    genres: ['Action'],
    contentRating: 'PG-13',
    runtimeMinutes: 120,
    communityRating: 8.0,
    voteCount: 50,
    status: 'released',
    addedAt: '2026-01-01',
  },
];

describe('ContentGrid', () => {
  it('renders items in grid view', () => {
    const { getByText } = render(
      <ContentGrid items={mockItems} viewMode="grid" />,
    );
    expect(getByText('Grid Movie')).toBeDefined();
  });

  it('renders items in list view', () => {
    const { getByText } = render(
      <ContentGrid items={mockItems} viewMode="list" />,
    );
    expect(getByText('Grid Movie')).toBeDefined();
  });

  it('shows skeleton cards when loading', () => {
    const { container } = render(
      <ContentGrid items={[]} viewMode="grid" isLoading />,
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no items', () => {
    const { getByText } = render(
      <ContentGrid items={[]} viewMode="grid" />,
    );
    expect(getByText('No content found')).toBeDefined();
  });

  it('renders list view with metadata', () => {
    const { getByText } = render(
      <ContentGrid items={mockItems} viewMode="list" />,
    );
    expect(getByText('2026')).toBeDefined();
  });
});
