import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DownloadsPage from '@/app/(app)/acquire/downloads/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

// Mock DownloadCard component
vi.mock('@/components/acquire/DownloadCard', () => ({
  DownloadCard: ({ download, onPause, onResume, onCancel, onRetry }: {
    download: { id: string; title: string; state: string };
    onPause?: (id: string) => void;
    onResume?: (id: string) => void;
    onCancel?: (id: string) => void;
    onRetry?: (id: string) => void;
  }) => (
    <div data-testid={`download-card-${download.id}`}>
      <span data-testid={`download-title-${download.id}`}>{download.title}</span>
      <span data-testid={`download-state-${download.id}`}>{download.state}</span>
      {onPause && <button type="button" onClick={() => onPause(download.id)} data-testid={`pause-${download.id}`}>Pause</button>}
      {onResume && <button type="button" onClick={() => onResume(download.id)} data-testid={`resume-${download.id}`}>Resume</button>}
      {onCancel && <button type="button" onClick={() => onCancel(download.id)} data-testid={`cancel-${download.id}`}>Cancel</button>}
      {onRetry && <button type="button" onClick={() => onRetry(download.id)} data-testid={`retry-${download.id}`}>Retry</button>}
    </div>
  ),
}));

describe('DownloadsPage', () => {
  it('renders the Active Downloads heading', () => {
    render(<DownloadsPage />);
    expect(screen.getByText('Active Downloads')).toBeDefined();
  });

  it('renders the refresh button', () => {
    render(<DownloadsPage />);
    expect(screen.getByLabelText('Refresh downloads')).toBeDefined();
  });

  it('renders all filter tabs', () => {
    render(<DownloadsPage />);
    expect(screen.getByTestId('tab-all')).toBeDefined();
    expect(screen.getByTestId('tab-downloading')).toBeDefined();
    expect(screen.getByTestId('tab-encoding')).toBeDefined();
    expect(screen.getByTestId('tab-subtitles')).toBeDefined();
  });

  it('renders the downloads grid container', () => {
    render(<DownloadsPage />);
    expect(screen.getByTestId('downloads-grid')).toBeDefined();
  });

  it('renders all download cards in the All tab', () => {
    render(<DownloadsPage />);
    expect(screen.getByTestId('download-card-d1')).toBeDefined();
    expect(screen.getByTestId('download-card-d2')).toBeDefined();
    expect(screen.getByTestId('download-card-d3')).toBeDefined();
    expect(screen.getByTestId('download-card-d4')).toBeDefined();
    expect(screen.getByTestId('download-card-d5')).toBeDefined();
  });

  it('renders download titles', () => {
    render(<DownloadsPage />);
    expect(screen.getByText('Breaking Bad S05E16 - Felina')).toBeDefined();
    expect(screen.getByText('Dune: Part Two (2024)')).toBeDefined();
    expect(screen.getByText('The Bear S03E01 - Tomorrow')).toBeDefined();
    expect(screen.getByText('Severance S02E05 - Trojan Horse')).toBeDefined();
    expect(screen.getByText('Civil War (2024)')).toBeDefined();
  });

  it('shows tab counts', () => {
    render(<DownloadsPage />);
    // All tab should show total count of 5
    const allTab = screen.getByTestId('tab-all');
    expect(allTab.textContent).toContain('5');
  });

  it('filters to downloading tab', () => {
    render(<DownloadsPage />);
    fireEvent.click(screen.getByTestId('tab-downloading'));

    // d1 (downloading), d4 (downloading) should be visible
    expect(screen.getByTestId('download-card-d1')).toBeDefined();
    expect(screen.getByTestId('download-card-d4')).toBeDefined();
    // d2 (encoding), d3 (subtitles), d5 (failed) should not be visible
    expect(screen.queryByTestId('download-card-d2')).toBeNull();
    expect(screen.queryByTestId('download-card-d3')).toBeNull();
    expect(screen.queryByTestId('download-card-d5')).toBeNull();
  });

  it('filters to encoding tab', () => {
    render(<DownloadsPage />);
    fireEvent.click(screen.getByTestId('tab-encoding'));

    // d2 (encoding) should be visible
    expect(screen.getByTestId('download-card-d2')).toBeDefined();
    // Others should not be visible
    expect(screen.queryByTestId('download-card-d1')).toBeNull();
    expect(screen.queryByTestId('download-card-d3')).toBeNull();
  });

  it('filters to subtitles tab', () => {
    render(<DownloadsPage />);
    fireEvent.click(screen.getByTestId('tab-subtitles'));

    // d3 (subtitles) should be visible
    expect(screen.getByTestId('download-card-d3')).toBeDefined();
    // Others should not be visible
    expect(screen.queryByTestId('download-card-d1')).toBeNull();
    expect(screen.queryByTestId('download-card-d2')).toBeNull();
  });

  it('returns to all tab after filtering', () => {
    render(<DownloadsPage />);
    fireEvent.click(screen.getByTestId('tab-encoding'));
    expect(screen.queryByTestId('download-card-d1')).toBeNull();

    fireEvent.click(screen.getByTestId('tab-all'));
    expect(screen.getByTestId('download-card-d1')).toBeDefined();
    expect(screen.getByTestId('download-card-d2')).toBeDefined();
    expect(screen.getByTestId('download-card-d3')).toBeDefined();
  });

  it('shows the All tab as active by default', () => {
    render(<DownloadsPage />);
    const allTab = screen.getByTestId('tab-all');
    expect(allTab.className).toContain('border-primary');
  });

  it('changes active tab styling when clicking', () => {
    render(<DownloadsPage />);
    fireEvent.click(screen.getByTestId('tab-encoding'));

    const encodingTab = screen.getByTestId('tab-encoding');
    const allTab = screen.getByTestId('tab-all');

    expect(encodingTab.className).toContain('border-primary');
    expect(allTab.className).toContain('border-transparent');
  });

  it('shows tab label text', () => {
    render(<DownloadsPage />);
    expect(screen.getByTestId('tab-all').textContent).toContain('All');
    expect(screen.getByTestId('tab-downloading').textContent).toContain('Downloading');
    expect(screen.getByTestId('tab-encoding').textContent).toContain('Encoding');
    expect(screen.getByTestId('tab-subtitles').textContent).toContain('Subtitles');
  });

  it('passes action handlers to DownloadCard', () => {
    render(<DownloadsPage />);
    // DownloadCard mock renders action buttons for all handlers
    expect(screen.getByTestId('pause-d1')).toBeDefined();
    expect(screen.getByTestId('cancel-d1')).toBeDefined();
    expect(screen.getByTestId('retry-d1')).toBeDefined();
  });
});
