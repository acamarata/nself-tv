import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ContentDetail } from '@/components/content/ContentDetail';
import type { MediaItem, CastMember } from '@/types/content';

const mockItem: MediaItem = {
  id: 'detail-1',
  type: 'movie',
  title: 'Detail Movie',
  originalTitle: 'Original Title',
  year: 2026,
  overview: 'A detailed overview of this movie.',
  posterUrl: '/poster.jpg',
  backdropUrl: '/backdrop.jpg',
  genres: ['Action', 'Thriller'],
  contentRating: 'PG-13',
  runtimeMinutes: 120,
  communityRating: 8.5,
  voteCount: 100,
  status: 'released',
  addedAt: '2026-01-01',
};

const mockCast: CastMember[] = [
  {
    name: 'John Actor',
    character: 'Hero',
    profileUrl: '/profile.jpg',
    order: 0,
  },
];

describe('ContentDetail', () => {
  it('renders title', () => {
    const { getByText } = render(<ContentDetail item={mockItem} />);
    expect(getByText('Detail Movie')).toBeDefined();
  });

  it('renders original title when different from title', () => {
    const { getByText } = render(<ContentDetail item={mockItem} />);
    expect(getByText('Original Title')).toBeDefined();
  });

  it('renders overview', () => {
    const { getByText } = render(<ContentDetail item={mockItem} />);
    expect(getByText('A detailed overview of this movie.')).toBeDefined();
  });

  it('renders genres', () => {
    const { getByText } = render(<ContentDetail item={mockItem} />);
    expect(getByText('Action')).toBeDefined();
    expect(getByText('Thriller')).toBeDefined();
  });

  it('renders content rating', () => {
    const { getByText } = render(<ContentDetail item={mockItem} />);
    expect(getByText('PG-13')).toBeDefined();
  });

  it('renders play and watchlist buttons', () => {
    const { getByText } = render(<ContentDetail item={mockItem} />);
    expect(getByText('Play')).toBeDefined();
    expect(getByText('Watchlist')).toBeDefined();
  });

  it('renders cast when provided', () => {
    const { getByText } = render(
      <ContentDetail item={mockItem} cast={mockCast} />,
    );
    expect(getByText('John Actor')).toBeDefined();
    expect(getByText('Hero')).toBeDefined();
  });

  it('does not render cast section without cast', () => {
    const { queryByText } = render(<ContentDetail item={mockItem} />);
    expect(queryByText('Cast')).toBeNull();
  });

  it('renders year and vote average', () => {
    const { container } = render(<ContentDetail item={mockItem} />);
    const text = container.textContent;
    expect(text).toContain('2026');
    expect(text).toContain('8.5');
  });
});
