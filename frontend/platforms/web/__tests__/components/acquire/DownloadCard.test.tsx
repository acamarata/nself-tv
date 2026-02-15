import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DownloadCard } from '@/components/acquire/DownloadCard';
import type { Download } from '@/types/acquisition';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

function makeDownload(overrides: Partial<Download> = {}): Download {
  return {
    id: 'dl-1',
    familyId: 'fam-1',
    contentType: 'episode',
    title: 'Breaking Bad S01E01',
    state: 'downloading',
    progress: 45.5,
    downloadSpeed: 2097152, // 2 MB/s
    uploadSpeed: 524288,    // 512 KB/s
    eta: 3660,              // 1h 1m
    size: 1073741824,       // 1 GB
    downloadedBytes: 536870912, // 512 MB
    sourceUrl: 'magnet:?xt=urn:btih:abc',
    quality: 'web-dl',
    error: null,
    retryCount: 0,
    stateHistory: [],
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T01:00:00Z',
    ...overrides,
  };
}

describe('DownloadCard', () => {
  it('renders download title', () => {
    const { getByText } = render(<DownloadCard download={makeDownload()} />);
    expect(getByText('Breaking Bad S01E01')).toBeDefined();
  });

  it('renders content type', () => {
    const { getByText } = render(<DownloadCard download={makeDownload()} />);
    expect(getByText('episode')).toBeDefined();
  });

  it('renders data-testid with download id', () => {
    const { getByTestId } = render(<DownloadCard download={makeDownload()} />);
    expect(getByTestId('download-card-dl-1')).toBeDefined();
  });

  it('renders progress percentage for active downloads', () => {
    const { getByText } = render(<DownloadCard download={makeDownload({ progress: 45.5 })} />);
    expect(getByText('46%')).toBeDefined(); // Math.round(45.5) = 46
  });

  it('renders progress bar for active downloads', () => {
    const { container } = render(<DownloadCard download={makeDownload({ progress: 50 })} />);
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeDefined();
  });

  it('does not render progress bar for completed downloads', () => {
    const dl = makeDownload({ state: 'completed' });
    const { container } = render(<DownloadCard download={dl} />);
    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBe(0);
  });

  it('does not render progress bar for failed downloads', () => {
    const dl = makeDownload({ state: 'failed' });
    const { container } = render(<DownloadCard download={dl} />);
    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBe(0);
  });

  it('renders speed info when downloading', () => {
    const { getByText } = render(<DownloadCard download={makeDownload()} />);
    expect(getByText('2.0 MB/s')).toBeDefined();
    expect(getByText('512.0 KB/s')).toBeDefined();
  });

  it('renders ETA when downloading', () => {
    const { getByText } = render(<DownloadCard download={makeDownload({ eta: 3660 })} />);
    expect(getByText('ETA: 1h 1m')).toBeDefined();
  });

  it('renders "--" for null speed values', () => {
    const dl = makeDownload({ downloadSpeed: null, uploadSpeed: null, eta: null });
    const { container } = render(<DownloadCard download={dl} />);
    const text = container.textContent;
    expect(text).toContain('--');
  });

  it('does not show speed info for non-downloading states', () => {
    const dl = makeDownload({ state: 'encoding' });
    const { container } = render(<DownloadCard download={dl} />);
    expect(container.textContent).not.toContain('ETA:');
  });

  it('renders error message when present', () => {
    const dl = makeDownload({ state: 'failed', error: 'Connection timed out' });
    const { getByText } = render(<DownloadCard download={dl} />);
    expect(getByText('Connection timed out')).toBeDefined();
  });

  it('does not render error when null', () => {
    const { container } = render(<DownloadCard download={makeDownload()} />);
    expect(container.querySelector('.text-red-500')).toBeNull();
  });

  // Action button tests
  it('renders pause button when downloading and onPause provided', () => {
    const onPause = vi.fn();
    const { getByLabelText } = render(
      <DownloadCard download={makeDownload({ state: 'downloading' })} onPause={onPause} />,
    );
    const btn = getByLabelText('Pause');
    fireEvent.click(btn);
    expect(onPause).toHaveBeenCalledWith('dl-1');
  });

  it('does not render pause button without onPause', () => {
    const { queryByLabelText } = render(
      <DownloadCard download={makeDownload({ state: 'downloading' })} />,
    );
    expect(queryByLabelText('Pause')).toBeNull();
  });

  it('renders resume button when paused (created state) and onResume provided', () => {
    const onResume = vi.fn();
    const { getByLabelText } = render(
      <DownloadCard download={makeDownload({ state: 'created' })} onResume={onResume} />,
    );
    const btn = getByLabelText('Resume');
    fireEvent.click(btn);
    expect(onResume).toHaveBeenCalledWith('dl-1');
  });

  it('does not render resume button when not paused', () => {
    const { queryByLabelText } = render(
      <DownloadCard download={makeDownload({ state: 'downloading' })} onResume={vi.fn()} />,
    );
    expect(queryByLabelText('Resume')).toBeNull();
  });

  it('renders cancel button for active downloads when onCancel provided', () => {
    const onCancel = vi.fn();
    const { getByLabelText } = render(
      <DownloadCard download={makeDownload({ state: 'downloading' })} onCancel={onCancel} />,
    );
    const btn = getByLabelText('Cancel');
    fireEvent.click(btn);
    expect(onCancel).toHaveBeenCalledWith('dl-1');
  });

  it('does not render cancel button for completed downloads', () => {
    const { queryByLabelText } = render(
      <DownloadCard download={makeDownload({ state: 'completed' })} onCancel={vi.fn()} />,
    );
    expect(queryByLabelText('Cancel')).toBeNull();
  });

  it('renders retry button for failed downloads when onRetry provided', () => {
    const onRetry = vi.fn();
    const { getByLabelText } = render(
      <DownloadCard download={makeDownload({ state: 'failed' })} onRetry={onRetry} />,
    );
    const btn = getByLabelText('Retry');
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledWith('dl-1');
  });

  it('does not render retry button for non-failed downloads', () => {
    const { queryByLabelText } = render(
      <DownloadCard download={makeDownload({ state: 'downloading' })} onRetry={vi.fn()} />,
    );
    expect(queryByLabelText('Retry')).toBeNull();
  });

  it('renders size info in progress section', () => {
    const dl = makeDownload({
      state: 'downloading',
      downloadedBytes: 536870912,
      size: 1073741824,
    });
    const { getByText } = render(<DownloadCard download={dl} />);
    expect(getByText('512 MB / 1.0 GB')).toBeDefined();
  });

  it('formats speed in B/s for very low speeds', () => {
    const dl = makeDownload({ downloadSpeed: 500 });
    const { getByText } = render(<DownloadCard download={dl} />);
    expect(getByText('500 B/s')).toBeDefined();
  });

  it('formats ETA with only minutes when under 1 hour', () => {
    const dl = makeDownload({ eta: 600 }); // 10 minutes
    const { getByText } = render(<DownloadCard download={dl} />);
    expect(getByText('ETA: 10m')).toBeDefined();
  });

  it('renders movie content type', () => {
    const dl = makeDownload({ contentType: 'movie' });
    const { getByText } = render(<DownloadCard download={dl} />);
    expect(getByText('movie')).toBeDefined();
  });
});
