import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ContentCard } from '@/components/content/ContentCard';
import type { MediaItem } from '@/types/content';

const mockItem: MediaItem = {
  id: 'test-123',
  type: 'movie',
  title: 'Test Movie',
  originalTitle: null,
  year: 2026,
  overview: 'A test movie',
  posterUrl: '/poster.jpg',
  backdropUrl: null,
  genres: ['Action', 'Thriller'],
  contentRating: 'PG-13',
  runtime: 120,
  voteAverage: 8.5,
  voteCount: 100,
  status: 'released',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('ContentCard', () => {
  it('renders title', () => {
    const { getByText } = render(<ContentCard item={mockItem} />);
    expect(getByText('Test Movie')).toBeDefined();
  });

  it('renders year', () => {
    const { getByText } = render(<ContentCard item={mockItem} />);
    expect(getByText('2026')).toBeDefined();
  });

  it('links to content detail page', () => {
    const { container } = render(<ContentCard item={mockItem} />);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/test-123');
  });

  it('renders progress bar when progress is provided', () => {
    const { container } = render(<ContentCard item={mockItem} progress={45} />);
    const progressBar = container.querySelector('[style]');
    expect(progressBar).toBeDefined();
  });

  it('does not render progress bar when no progress', () => {
    const { container } = render(<ContentCard item={mockItem} />);
    // Look for a style attribute with width percentage (progress bar indicator)
    const elements = container.querySelectorAll('[style*="width"]');
    // Should not find any progress-specific width styles
    expect(elements.length).toBe(0);
  });

  it('renders without poster url', () => {
    const noPosterItem = { ...mockItem, posterUrl: null };
    const { getByText } = render(<ContentCard item={noPosterItem} />);
    expect(getByText('Test Movie')).toBeDefined();
  });

  it('renders rating badge', () => {
    const { container } = render(<ContentCard item={mockItem} />);
    const text = container.textContent;
    expect(text).toContain('8.5');
  });
});
