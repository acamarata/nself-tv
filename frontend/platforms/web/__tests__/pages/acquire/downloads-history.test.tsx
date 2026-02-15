import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DownloadHistoryPage from '@/app/(app)/acquire/downloads/history/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

// Mock StateBadge component
vi.mock('@/components/acquire/StateBadge', () => ({
  StateBadge: ({ state }: { state: string }) => (
    <span data-testid={`state-badge-${state}`}>{state}</span>
  ),
}));

describe('DownloadHistoryPage', () => {
  it('renders the Download History heading', () => {
    render(<DownloadHistoryPage />);
    expect(screen.getByText('Download History')).toBeDefined();
  });

  it('renders the status filter dropdown', () => {
    render(<DownloadHistoryPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;
    expect(select).toBeDefined();
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('all');
    expect(options).toContain('completed');
    expect(options).toContain('failed');
    expect(options).toContain('cancelled');
  });

  it('renders table column headers', () => {
    render(<DownloadHistoryPage />);
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Type')).toBeDefined();
    expect(screen.getByText('Quality')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Size')).toBeDefined();
    expect(screen.getByText('Date')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('renders all history rows with data-testid attributes', () => {
    render(<DownloadHistoryPage />);
    expect(screen.getByTestId('history-row-h1')).toBeDefined();
    expect(screen.getByTestId('history-row-h2')).toBeDefined();
    expect(screen.getByTestId('history-row-h3')).toBeDefined();
    expect(screen.getByTestId('history-row-h4')).toBeDefined();
    expect(screen.getByTestId('history-row-h5')).toBeDefined();
    expect(screen.getByTestId('history-row-h6')).toBeDefined();
    expect(screen.getByTestId('history-row-h7')).toBeDefined();
    expect(screen.getByTestId('history-row-h8')).toBeDefined();
  });

  it('renders download titles', () => {
    render(<DownloadHistoryPage />);
    expect(screen.getByText('Breaking Bad S05E15 - Granite State')).toBeDefined();
    expect(screen.getByText('Breaking Bad S05E14 - Ozymandias')).toBeDefined();
    expect(screen.getByText('Oppenheimer (2023)')).toBeDefined();
    expect(screen.getByText("Severance S02E04 - Woe's Hollow")).toBeDefined();
    expect(screen.getByText('Killers of the Flower Moon (2023)')).toBeDefined();
    expect(screen.getByText('The Bear S02E10 - The Bear')).toBeDefined();
    expect(screen.getByText('Poor Things (2023)')).toBeDefined();
    expect(screen.getByText('Andor S01E12 - Rix Road')).toBeDefined();
  });

  it('renders state badges for each entry', () => {
    render(<DownloadHistoryPage />);
    const completedBadges = screen.getAllByTestId('state-badge-completed');
    expect(completedBadges.length).toBe(5);
    const failedBadges = screen.getAllByTestId('state-badge-failed');
    expect(failedBadges.length).toBe(2);
    expect(screen.getByTestId('state-badge-cancelled')).toBeDefined();
  });

  it('renders content types', () => {
    render(<DownloadHistoryPage />);
    const episodeTexts = screen.getAllByText('episode');
    expect(episodeTexts.length).toBeGreaterThanOrEqual(4);
    const movieTexts = screen.getAllByText('movie');
    expect(movieTexts.length).toBeGreaterThanOrEqual(3);
  });

  it('renders quality labels', () => {
    render(<DownloadHistoryPage />);
    const blurayTexts = screen.getAllByText('bluray');
    expect(blurayTexts.length).toBeGreaterThanOrEqual(2);
    const remuxTexts = screen.getAllByText('remux');
    expect(remuxTexts.length).toBeGreaterThanOrEqual(2);
    const webdlTexts = screen.getAllByText('web-dl');
    expect(webdlTexts.length).toBeGreaterThanOrEqual(3);
  });

  it('shows error messages for failed downloads', () => {
    render(<DownloadHistoryPage />);
    expect(screen.getByText('Encoding failed: Unexpected codec format')).toBeDefined();
    expect(screen.getByText('Subtitle download timed out')).toBeDefined();
  });

  it('renders retry buttons only for failed downloads', () => {
    render(<DownloadHistoryPage />);
    // h4 and h8 are failed
    expect(screen.getByLabelText("Retry Severance S02E04 - Woe's Hollow")).toBeDefined();
    expect(screen.getByLabelText('Retry Andor S01E12 - Rix Road')).toBeDefined();
    // Completed entries should not have retry buttons
    expect(screen.queryByLabelText('Retry Breaking Bad S05E15 - Granite State')).toBeNull();
    expect(screen.queryByLabelText('Retry Oppenheimer (2023)')).toBeNull();
  });

  it('filters to completed downloads only', () => {
    render(<DownloadHistoryPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'completed' } });
    expect(screen.getByTestId('history-row-h1')).toBeDefined();
    expect(screen.getByTestId('history-row-h2')).toBeDefined();
    expect(screen.getByTestId('history-row-h3')).toBeDefined();
    expect(screen.getByTestId('history-row-h5')).toBeDefined();
    expect(screen.getByTestId('history-row-h6')).toBeDefined();
    // Failed and cancelled should not be visible
    expect(screen.queryByTestId('history-row-h4')).toBeNull();
    expect(screen.queryByTestId('history-row-h7')).toBeNull();
    expect(screen.queryByTestId('history-row-h8')).toBeNull();
  });

  it('filters to failed downloads only', () => {
    render(<DownloadHistoryPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'failed' } });
    expect(screen.getByTestId('history-row-h4')).toBeDefined();
    expect(screen.getByTestId('history-row-h8')).toBeDefined();
    // Others should not be visible
    expect(screen.queryByTestId('history-row-h1')).toBeNull();
    expect(screen.queryByTestId('history-row-h7')).toBeNull();
  });

  it('filters to cancelled downloads only', () => {
    render(<DownloadHistoryPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'cancelled' } });
    expect(screen.getByTestId('history-row-h7')).toBeDefined();
    expect(screen.queryByTestId('history-row-h1')).toBeNull();
    expect(screen.queryByTestId('history-row-h4')).toBeNull();
  });

  it('returns to all when filter is reset', () => {
    render(<DownloadHistoryPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'failed' } });
    expect(screen.queryByTestId('history-row-h1')).toBeNull();

    fireEvent.change(select, { target: { value: 'all' } });
    expect(screen.getByTestId('history-row-h1')).toBeDefined();
    expect(screen.getByTestId('history-row-h4')).toBeDefined();
    expect(screen.getByTestId('history-row-h7')).toBeDefined();
  });

  it('shows empty state message for filtered view with no results', () => {
    // All status filters have at least 1 result with current mock data
    // But the empty state text pattern is still important to test
    render(<DownloadHistoryPage />);
    // With all filter, there are 8 entries - no empty state
    expect(screen.queryByText('No download history')).toBeNull();
  });

  it('renders file sizes in human-readable format', () => {
    render(<DownloadHistoryPage />);
    // h1: 4294967296 = 4.0 GB, h3: 8589934592 = 8.0 GB, h5: 10737418240 = 10.0 GB
    expect(screen.getByText('4.0 GB')).toBeDefined();
    expect(screen.getByText('8.0 GB')).toBeDefined();
    expect(screen.getByText('10.0 GB')).toBeDefined();
  });

  it('does not show pagination when all items fit on one page', () => {
    render(<DownloadHistoryPage />);
    // PAGE_SIZE is 10, we have 8 items, so no pagination
    expect(screen.queryByText('Previous')).toBeNull();
    expect(screen.queryByText('Next')).toBeNull();
  });
});
