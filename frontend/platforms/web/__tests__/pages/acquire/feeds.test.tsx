import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedsPage from '@/app/(app)/acquire/feeds/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

// Mock FeedPreview component
vi.mock('@/components/acquire/FeedPreview', () => ({
  FeedPreview: ({ validation, isLoading }: { validation: unknown; isLoading: boolean }) => {
    if (isLoading) return <div data-testid="feed-preview-loading">Loading...</div>;
    if (!validation) return null;
    return <div data-testid="feed-preview">Preview</div>;
  },
}));

describe('FeedsPage', () => {
  it('renders the RSS Feeds heading', () => {
    render(<FeedsPage />);
    expect(screen.getByText('RSS Feeds')).toBeDefined();
  });

  it('renders the Add Feed button', () => {
    render(<FeedsPage />);
    expect(screen.getByText('Add Feed')).toBeDefined();
  });

  it('renders all feed rows', () => {
    render(<FeedsPage />);
    expect(screen.getByTestId('feed-row-f1')).toBeDefined();
    expect(screen.getByTestId('feed-row-f2')).toBeDefined();
    expect(screen.getByTestId('feed-row-f3')).toBeDefined();
    expect(screen.getByTestId('feed-row-f4')).toBeDefined();
    expect(screen.getByTestId('feed-row-f5')).toBeDefined();
  });

  it('renders feed titles', () => {
    render(<FeedsPage />);
    expect(screen.getByText('ShowRSS - Personal Feed')).toBeDefined();
    expect(screen.getByText('EZTV Latest')).toBeDefined();
    expect(screen.getByText('YTS Movies')).toBeDefined();
    expect(screen.getByText('Private Tracker Feed')).toBeDefined();
    expect(screen.getByText('Anime RSS')).toBeDefined();
  });

  it('renders table column headers', () => {
    render(<FeedsPage />);
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('URL')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Last Check')).toBeDefined();
    expect(screen.getByText('Errors')).toBeDefined();
    expect(screen.getByText('Items')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('renders status badges', () => {
    render(<FeedsPage />);
    const activeBadges = screen.getAllByText('active');
    expect(activeBadges.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('dormant')).toBeDefined();
    expect(screen.getByText('error')).toBeDefined();
  });

  it('renders item counts', () => {
    render(<FeedsPage />);
    expect(screen.getByText('245')).toBeDefined();
    expect(screen.getByText('1024')).toBeDefined();
    expect(screen.getByText('50')).toBeDefined();
    expect(screen.getByText('512')).toBeDefined();
  });

  it('renders error counts with alert indicator for feeds with errors', () => {
    render(<FeedsPage />);
    // f3 has errorCount 2, f4 has errorCount 5
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('renders delete buttons for each feed', () => {
    render(<FeedsPage />);
    expect(screen.getByLabelText('Delete ShowRSS - Personal Feed')).toBeDefined();
    expect(screen.getByLabelText('Delete EZTV Latest')).toBeDefined();
    expect(screen.getByLabelText('Delete YTS Movies')).toBeDefined();
    expect(screen.getByLabelText('Delete Private Tracker Feed')).toBeDefined();
    expect(screen.getByLabelText('Delete Anime RSS')).toBeDefined();
  });

  it('does not show the form by default', () => {
    render(<FeedsPage />);
    expect(screen.queryByText('Add RSS Feed')).toBeNull();
  });

  it('shows the form when Add Feed is clicked', () => {
    render(<FeedsPage />);
    fireEvent.click(screen.getByText('Add Feed'));
    expect(screen.getByText('Add RSS Feed')).toBeDefined();
    expect(screen.getByLabelText('Feed URL')).toBeDefined();
  });

  it('hides the form when Cancel is clicked', () => {
    render(<FeedsPage />);
    fireEvent.click(screen.getByText('Add Feed'));
    expect(screen.getByText('Add RSS Feed')).toBeDefined();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Add RSS Feed')).toBeNull();
  });

  it('renders the Validate button inside the form', () => {
    render(<FeedsPage />);
    fireEvent.click(screen.getByText('Add Feed'));
    expect(screen.getByText('Validate')).toBeDefined();
  });

  it('disables the Validate button when URL is empty', () => {
    render(<FeedsPage />);
    fireEvent.click(screen.getByText('Add Feed'));
    const validateBtn = screen.getByText('Validate') as HTMLButtonElement;
    expect(validateBtn.disabled).toBe(true);
  });

  it('enables the Validate button when URL is entered', () => {
    render(<FeedsPage />);
    fireEvent.click(screen.getByText('Add Feed'));

    const input = screen.getByLabelText('Feed URL') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://example.com/rss' } });

    const validateBtn = screen.getByText('Validate') as HTMLButtonElement;
    expect(validateBtn.disabled).toBe(false);
  });

  it('shows loading state when validating', async () => {
    vi.useFakeTimers();
    render(<FeedsPage />);
    fireEvent.click(screen.getByText('Add Feed'));

    const input = screen.getByLabelText('Feed URL') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://example.com/rss' } });

    fireEvent.click(screen.getByText('Validate'));
    expect(screen.getByTestId('feed-preview-loading')).toBeDefined();

    vi.advanceTimersByTime(900);
    await waitFor(() => {
      expect(screen.getByTestId('feed-preview')).toBeDefined();
    });

    vi.useRealTimers();
  });

  it('allows typing in the Feed URL input', () => {
    render(<FeedsPage />);
    fireEvent.click(screen.getByText('Add Feed'));

    const input = screen.getByLabelText('Feed URL') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://test.com/rss' } });
    expect(input.value).toBe('https://test.com/rss');
  });

  it('renders the Add Feed submit button as disabled before validation', () => {
    render(<FeedsPage />);
    fireEvent.click(screen.getByText('Add Feed'));

    // The submit "Add Feed" button inside the form - different from the top-level toggle button
    const buttons = screen.getAllByText('Add Feed');
    // The second "Add Feed" is the submit button inside the form
    const submitBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('renders feed URLs in the table', () => {
    render(<FeedsPage />);
    expect(screen.getByText('https://showrss.info/user/12345.rss')).toBeDefined();
    expect(screen.getByText('https://eztv.re/ezrss.xml')).toBeDefined();
  });
});
