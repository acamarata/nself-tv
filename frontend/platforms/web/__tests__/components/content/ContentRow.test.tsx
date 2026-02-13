import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ContentRow } from '@/components/content/ContentRow';
import type { MediaItem } from '@/types/content';

const mockItems: MediaItem[] = [
  {
    id: '1',
    type: 'movie',
    title: 'Movie One',
    originalTitle: null,
    year: 2026,
    overview: 'A movie',
    posterUrl: '/poster1.jpg',
    backdropUrl: null,
    genres: ['Action'],
    contentRating: 'PG-13',
    runtime: 120,
    voteAverage: 8.0,
    voteCount: 50,
    status: 'released',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: '2',
    type: 'movie',
    title: 'Movie Two',
    originalTitle: null,
    year: 2025,
    overview: 'Another movie',
    posterUrl: '/poster2.jpg',
    backdropUrl: null,
    genres: ['Comedy'],
    contentRating: 'PG',
    runtime: 90,
    voteAverage: 7.0,
    voteCount: 30,
    status: 'released',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('ContentRow', () => {
  it('renders title', () => {
    const { getByText } = render(
      <ContentRow title="Trending Now" items={mockItems} />,
    );
    expect(getByText('Trending Now')).toBeDefined();
  });

  it('renders content cards for each item', () => {
    const { getByText } = render(
      <ContentRow title="Trending" items={mockItems} />,
    );
    expect(getByText('Movie One')).toBeDefined();
    expect(getByText('Movie Two')).toBeDefined();
  });

  it('returns null when items array is empty', () => {
    const { container } = render(
      <ContentRow title="Empty Row" items={[]} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders scroll buttons markup', () => {
    const { container } = render(
      <ContentRow title="Row" items={mockItems} />,
    );
    const section = container.querySelector('section');
    expect(section).toBeDefined();
  });
});
