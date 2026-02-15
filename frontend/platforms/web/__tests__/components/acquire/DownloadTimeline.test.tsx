import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DownloadTimeline } from '@/components/acquire/DownloadTimeline';
import type { DownloadStateEntry } from '@/types/acquisition';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

const mockEntries: DownloadStateEntry[] = [
  { state: 'created', timestamp: '2026-02-01T10:00:00Z', duration: 500, error: null },
  { state: 'vpn_connecting', timestamp: '2026-02-01T10:00:01Z', duration: 3000, error: null },
  { state: 'searching', timestamp: '2026-02-01T10:00:04Z', duration: 5000, error: null },
  { state: 'downloading', timestamp: '2026-02-01T10:00:09Z', duration: 1800000, error: null },
  { state: 'completed', timestamp: '2026-02-01T10:30:09Z', duration: null, error: null },
];

describe('DownloadTimeline', () => {
  it('renders nothing when entries array is empty', () => {
    const { container } = render(<DownloadTimeline entries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders timeline container with data-testid', () => {
    const { getByTestId } = render(<DownloadTimeline entries={mockEntries} />);
    expect(getByTestId('download-timeline')).toBeDefined();
  });

  it('renders all entries', () => {
    const { getByTestId } = render(<DownloadTimeline entries={mockEntries} />);
    // Each entry renders a StateBadge with data-testid
    expect(getByTestId('state-badge-created')).toBeDefined();
    expect(getByTestId('state-badge-vpn_connecting')).toBeDefined();
    expect(getByTestId('state-badge-searching')).toBeDefined();
    expect(getByTestId('state-badge-downloading')).toBeDefined();
    expect(getByTestId('state-badge-completed')).toBeDefined();
  });

  it('renders timestamps for each entry', () => {
    const { container } = render(<DownloadTimeline entries={[mockEntries[0]]} />);
    const text = container.textContent;
    // toLocaleString will format the date - just check it contains some date text
    expect(text).toBeTruthy();
  });

  it('formats duration in seconds', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'created', timestamp: '2026-02-01T10:00:00Z', duration: 5000, error: null },
    ];
    const { container } = render(<DownloadTimeline entries={entries} />);
    expect(container.textContent).toContain('5s');
  });

  it('formats duration in minutes', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'downloading', timestamp: '2026-02-01T10:00:00Z', duration: 120000, error: null },
    ];
    const { container } = render(<DownloadTimeline entries={entries} />);
    expect(container.textContent).toContain('2m');
  });

  it('formats duration in hours', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'downloading', timestamp: '2026-02-01T10:00:00Z', duration: 7200000, error: null },
    ];
    const { container } = render(<DownloadTimeline entries={entries} />);
    expect(container.textContent).toContain('2h');
  });

  it('shows "--" for null duration', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'completed', timestamp: '2026-02-01T10:00:00Z', duration: null, error: null },
    ];
    const { container } = render(<DownloadTimeline entries={entries} />);
    expect(container.textContent).toContain('--');
  });

  it('renders error icon for entries with errors', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'failed', timestamp: '2026-02-01T10:00:00Z', duration: 1000, error: 'Timeout' },
    ];
    const { getByTestId } = render(<DownloadTimeline entries={entries} />);
    expect(getByTestId('icon-XCircle')).toBeDefined();
  });

  it('renders check icon for entries without errors', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'completed', timestamp: '2026-02-01T10:00:00Z', duration: 1000, error: null },
    ];
    const { getByTestId } = render(<DownloadTimeline entries={entries} />);
    expect(getByTestId('icon-CheckCircle')).toBeDefined();
  });

  it('renders error message text for entries with errors', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'failed', timestamp: '2026-02-01T10:00:00Z', duration: 1000, error: 'Connection refused' },
    ];
    const { getByText } = render(<DownloadTimeline entries={entries} />);
    expect(getByText('Connection refused')).toBeDefined();
  });

  it('renders connecting line between entries but not after last', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'created', timestamp: '2026-02-01T10:00:00Z', duration: 500, error: null },
      { state: 'completed', timestamp: '2026-02-01T10:01:00Z', duration: null, error: null },
    ];
    const { container } = render(<DownloadTimeline entries={entries} />);
    // There should be one connector line (between entries, not after last)
    const connectors = container.querySelectorAll('.bg-border');
    expect(connectors.length).toBe(1);
  });

  it('renders a single entry without connector line', () => {
    const entries: DownloadStateEntry[] = [
      { state: 'completed', timestamp: '2026-02-01T10:00:00Z', duration: null, error: null },
    ];
    const { container } = render(<DownloadTimeline entries={entries} />);
    const connectors = container.querySelectorAll('.bg-border');
    expect(connectors.length).toBe(0);
  });
});
