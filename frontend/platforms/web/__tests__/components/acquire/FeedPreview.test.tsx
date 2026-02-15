import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeedPreview } from '@/components/acquire/FeedPreview';
import type { FeedValidation, RSSFeedItem } from '@/types/acquisition';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

const sampleItems: RSSFeedItem[] = [
  { title: 'Show S01E01', publishedAt: '2026-02-01T12:00:00Z', magnetUri: 'magnet:?xt=1', size: 1073741824, quality: 'web-dl', season: 1, episode: 1 },
  { title: 'Show S01E02', publishedAt: '2026-02-02T12:00:00Z', magnetUri: 'magnet:?xt=2', size: 1073741824, quality: 'bluray', season: 1, episode: 2 },
  { title: 'Show S01E03', publishedAt: '2026-02-03T12:00:00Z', magnetUri: 'magnet:?xt=3', size: null, quality: 'hdtv', season: 1, episode: 3 },
];

const validFeed: FeedValidation = {
  valid: true,
  title: 'My Show RSS Feed',
  itemCount: 25,
  sampleItems,
  errors: [],
};

const invalidFeed: FeedValidation = {
  valid: false,
  title: null,
  itemCount: 0,
  sampleItems: [],
  errors: ['Invalid XML format', 'Missing required fields'],
};

describe('FeedPreview', () => {
  it('renders loading state', () => {
    const { getByTestId, getByText } = render(<FeedPreview validation={null} isLoading={true} />);
    expect(getByTestId('feed-preview-loading')).toBeDefined();
    expect(getByText('Validating feed...')).toBeDefined();
  });

  it('renders nothing when not loading and no validation', () => {
    const { container } = render(<FeedPreview validation={null} isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders valid feed preview with data-testid', () => {
    const { getByTestId } = render(<FeedPreview validation={validFeed} isLoading={false} />);
    expect(getByTestId('feed-preview')).toBeDefined();
  });

  it('shows "Valid Feed" text for valid feeds', () => {
    const { getByText } = render(<FeedPreview validation={validFeed} isLoading={false} />);
    expect(getByText('Valid Feed')).toBeDefined();
  });

  it('shows "Invalid Feed" text for invalid feeds', () => {
    const { getByText } = render(<FeedPreview validation={invalidFeed} isLoading={false} />);
    expect(getByText('Invalid Feed')).toBeDefined();
  });

  it('renders feed title when present', () => {
    const { getByText } = render(<FeedPreview validation={validFeed} isLoading={false} />);
    expect(getByText('My Show RSS Feed')).toBeDefined();
  });

  it('does not render title when null', () => {
    const { container } = render(<FeedPreview validation={invalidFeed} isLoading={false} />);
    // Should not have the title paragraph
    expect(container.textContent).not.toContain('My Show RSS Feed');
  });

  it('shows item count for valid feeds', () => {
    const { getByText } = render(<FeedPreview validation={validFeed} isLoading={false} />);
    expect(getByText('25 items found')).toBeDefined();
  });

  it('does not show item count for invalid feeds', () => {
    const { container } = render(<FeedPreview validation={invalidFeed} isLoading={false} />);
    expect(container.textContent).not.toContain('items found');
  });

  it('renders error messages for invalid feeds', () => {
    const { getByText } = render(<FeedPreview validation={invalidFeed} isLoading={false} />);
    expect(getByText('Invalid XML format')).toBeDefined();
    expect(getByText('Missing required fields')).toBeDefined();
  });

  it('does not render error section when no errors', () => {
    const { container } = render(<FeedPreview validation={validFeed} isLoading={false} />);
    // No red error text should appear
    const errorElements = container.querySelectorAll('.text-red-500');
    expect(errorElements.length).toBe(0);
  });

  it('renders sample items', () => {
    const { getByText } = render(<FeedPreview validation={validFeed} isLoading={false} />);
    expect(getByText('Sample items:')).toBeDefined();
    expect(getByText('Show S01E01')).toBeDefined();
    expect(getByText('Show S01E02')).toBeDefined();
    expect(getByText('Show S01E03')).toBeDefined();
  });

  it('limits sample items to 3', () => {
    const manyItems: FeedValidation = {
      ...validFeed,
      sampleItems: [
        ...sampleItems,
        { title: 'Show S01E04', publishedAt: '2026-02-04T12:00:00Z', magnetUri: 'magnet:?xt=4', size: null, quality: 'unknown', season: 1, episode: 4 },
      ],
    };
    const { queryByText } = render(<FeedPreview validation={manyItems} isLoading={false} />);
    expect(queryByText('Show S01E01')).toBeDefined();
    expect(queryByText('Show S01E02')).toBeDefined();
    expect(queryByText('Show S01E03')).toBeDefined();
    expect(queryByText('Show S01E04')).toBeNull();
  });

  it('renders quality label in sample items', () => {
    const { container } = render(<FeedPreview validation={validFeed} isLoading={false} />);
    expect(container.textContent).toContain('web-dl');
    expect(container.textContent).toContain('bluray');
  });

  it('does not render sample items section when empty', () => {
    const noSamples: FeedValidation = { ...validFeed, sampleItems: [] };
    const { queryByText } = render(<FeedPreview validation={noSamples} isLoading={false} />);
    expect(queryByText('Sample items:')).toBeNull();
  });

  it('renders green check icon for valid feed', () => {
    const { getByTestId } = render(<FeedPreview validation={validFeed} isLoading={false} />);
    expect(getByTestId('icon-CheckCircle')).toBeDefined();
  });

  it('renders red X icon for invalid feed', () => {
    const { getByTestId } = render(<FeedPreview validation={invalidFeed} isLoading={false} />);
    expect(getByTestId('icon-XCircle')).toBeDefined();
  });

  it('renders RSS icon during loading', () => {
    const { getByTestId } = render(<FeedPreview validation={null} isLoading={true} />);
    expect(getByTestId('icon-Rss')).toBeDefined();
  });
});
