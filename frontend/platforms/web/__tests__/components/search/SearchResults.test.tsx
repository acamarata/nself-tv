import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SearchResults } from '@/components/search/SearchResults';
import type { SearchResult } from '@/types/catalog';
import type { MediaItem } from '@/types/content';

const mockItem: MediaItem = {
  id: 'sr-1',
  type: 'movie',
  title: 'Search Result Movie',
  originalTitle: null,
  year: 2026,
  overview: 'Found via search',
  posterUrl: '/poster.jpg',
  backdropUrl: null,
  genres: ['Drama'],
  contentRating: 'PG',
  runtimeMinutes: 100,
  communityRating: 7.5,
  voteCount: 40,
  status: 'released',
  addedAt: '2026-01-01',
};

const mockResults: SearchResult = {
  items: [mockItem],
  totalCount: 1,
  query: 'test',
  activeType: undefined,
  typeCounts: { movie: 1, tv_show: 0, episode: 0, podcast: 0, game: 0, music: 0, live_event: 0 },
};

const emptyResults: SearchResult = {
  items: [],
  totalCount: 0,
  query: 'nothing',
  activeType: undefined,
  typeCounts: { movie: 0, tv_show: 0, episode: 0, podcast: 0, game: 0, music: 0, live_event: 0 },
};

describe('SearchResults', () => {
  it('renders type filter tabs', () => {
    const { getByText } = render(
      <SearchResults results={mockResults} onTypeFilter={vi.fn()} />,
    );
    expect(getByText(/All/)).toBeDefined();
    expect(getByText(/Movies/)).toBeDefined();
    expect(getByText(/TV Shows/)).toBeDefined();
  });

  it('renders search result items', () => {
    const { getByText } = render(
      <SearchResults results={mockResults} onTypeFilter={vi.fn()} />,
    );
    expect(getByText('Search Result Movie')).toBeDefined();
  });

  it('calls onTypeFilter when tab is clicked', () => {
    const onTypeFilter = vi.fn();
    const { getByText } = render(
      <SearchResults results={mockResults} onTypeFilter={onTypeFilter} />,
    );
    fireEvent.click(getByText(/Movies/));
    expect(onTypeFilter).toHaveBeenCalledWith('movie');
  });

  it('shows no results message when items is empty', () => {
    const { getByText } = render(
      <SearchResults results={emptyResults} onTypeFilter={vi.fn()} />,
    );
    expect(getByText('No results found')).toBeDefined();
  });

  it('shows count in tabs', () => {
    const { container } = render(
      <SearchResults results={mockResults} onTypeFilter={vi.fn()} />,
    );
    const text = container.textContent;
    expect(text).toContain('(1)');
  });
});
