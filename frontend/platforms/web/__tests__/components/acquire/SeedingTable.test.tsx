import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SeedingTable } from '@/components/acquire/SeedingTable';
import type { SeedingStats, SeedingAggregate } from '@/types/acquisition';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

const mockStats: SeedingStats[] = [
  {
    id: 's1',
    torrentHash: 'hash-abc',
    name: 'Breaking.Bad.S01E01.720p',
    ratio: 1.50,
    uploaded: 1610612736, // ~1.5 GB
    downloaded: 1073741824, // ~1 GB
    seedingDuration: 172800, // 2 days
    isFavorite: false,
    seedRatioLimit: 2.0,
    seedTimeLimitMinutes: 10080,
  },
  {
    id: 's2',
    torrentHash: 'hash-def',
    name: 'The.Wire.S01E01.1080p',
    ratio: 3.20,
    uploaded: 3221225472, // ~3 GB
    downloaded: 1073741824,
    seedingDuration: 86400, // 1 day
    isFavorite: true,
    seedRatioLimit: 2.0,
    seedTimeLimitMinutes: 10080,
  },
];

const mockAggregate: SeedingAggregate = {
  totalUploaded: 4831838208,
  totalDownloaded: 2147483648,
  averageRatio: 2.35,
  activeTorrents: 5,
  completedTorrents: 42,
};

describe('SeedingTable', () => {
  const defaultProps = {
    stats: mockStats,
    aggregate: mockAggregate,
    onUpdatePolicy: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with data-testid', () => {
    const { getByTestId } = render(<SeedingTable {...defaultProps} />);
    expect(getByTestId('seeding-table')).toBeDefined();
  });

  // Aggregate stats
  it('renders aggregate total uploaded', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    expect(getByText('4.5 GB')).toBeDefined();
  });

  it('renders aggregate average ratio', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    expect(getByText('2.35')).toBeDefined();
  });

  it('renders aggregate active torrents', () => {
    const { container } = render(<SeedingTable {...defaultProps} />);
    expect(container.textContent).toContain('Active');
    expect(container.textContent).toContain('5');
  });

  it('renders aggregate completed torrents', () => {
    const { container } = render(<SeedingTable {...defaultProps} />);
    expect(container.textContent).toContain('Completed');
    expect(container.textContent).toContain('42');
  });

  it('does not render aggregate section when aggregate is null', () => {
    const { container } = render(
      <SeedingTable stats={mockStats} aggregate={null} onUpdatePolicy={vi.fn()} />,
    );
    expect(container.textContent).not.toContain('Total Uploaded');
  });

  // Table headers
  it('renders table headers', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    expect(getByText('Name')).toBeDefined();
    expect(getByText('Ratio')).toBeDefined();
    expect(getByText('Uploaded')).toBeDefined();
    expect(getByText('Duration')).toBeDefined();
    expect(getByText('Limit')).toBeDefined();
    expect(getByText('Fav')).toBeDefined();
  });

  // Table rows
  it('renders rows with data-testid', () => {
    const { getByTestId } = render(<SeedingTable {...defaultProps} />);
    expect(getByTestId('seeding-row-hash-abc')).toBeDefined();
    expect(getByTestId('seeding-row-hash-def')).toBeDefined();
  });

  it('renders torrent names', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    expect(getByText('Breaking.Bad.S01E01.720p')).toBeDefined();
    expect(getByText('The.Wire.S01E01.1080p')).toBeDefined();
  });

  it('renders ratio values', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    expect(getByText('1.50')).toBeDefined();
    expect(getByText('3.20')).toBeDefined();
  });

  it('applies green color when ratio exceeds limit', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    // hash-def has ratio 3.20 >= limit 2.0
    const ratioElement = getByText('3.20');
    expect(ratioElement.className).toContain('text-green-500');
  });

  it('does not apply green color when ratio below limit', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    // hash-abc has ratio 1.50 < limit 2.0
    const ratioElement = getByText('1.50');
    expect(ratioElement.className).not.toContain('text-green-500');
  });

  it('renders uploaded sizes', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    expect(getByText('1.5 GB')).toBeDefined();
    expect(getByText('3.0 GB')).toBeDefined();
  });

  it('renders seeding duration', () => {
    const { container } = render(<SeedingTable {...defaultProps} />);
    expect(container.textContent).toContain('2d 0h'); // 172800 seconds = 2 days
    expect(container.textContent).toContain('1d 0h'); // 86400 seconds = 1 day
  });

  it('renders seed ratio limit', () => {
    const { getAllByText } = render(<SeedingTable {...defaultProps} />);
    // Both have 2.0 limit
    const limitButtons = getAllByText('2.0x');
    expect(limitButtons.length).toBe(2);
  });

  // Favorite toggle
  it('calls onUpdatePolicy to toggle favorite on', () => {
    const onUpdatePolicy = vi.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <SeedingTable stats={mockStats} aggregate={null} onUpdatePolicy={onUpdatePolicy} />,
    );
    const row = getByTestId('seeding-row-hash-abc');
    const favBtn = row.querySelector('[aria-label="Mark favorite"]')!;
    fireEvent.click(favBtn);
    expect(onUpdatePolicy).toHaveBeenCalledWith('hash-abc', { isFavorite: true });
  });

  it('calls onUpdatePolicy to toggle favorite off', () => {
    const onUpdatePolicy = vi.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <SeedingTable stats={mockStats} aggregate={null} onUpdatePolicy={onUpdatePolicy} />,
    );
    const row = getByTestId('seeding-row-hash-def');
    const favBtn = row.querySelector('[aria-label="Unmark favorite"]')!;
    fireEvent.click(favBtn);
    expect(onUpdatePolicy).toHaveBeenCalledWith('hash-def', { isFavorite: false });
  });

  // Inline editing
  it('shows edit input when limit button is clicked', () => {
    const { getByTestId } = render(<SeedingTable {...defaultProps} />);
    const row = getByTestId('seeding-row-hash-abc');
    const limitBtn = row.querySelector('button')!;
    // The first button in the limit cell
    fireEvent.click(limitBtn);
    const numberInput = row.querySelector('input[type="number"]');
    expect(numberInput).not.toBeNull();
  });

  it('saves edited ratio limit on Save click', async () => {
    const onUpdatePolicy = vi.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(
      <SeedingTable stats={mockStats} aggregate={null} onUpdatePolicy={onUpdatePolicy} />,
    );
    const row = getByTestId('seeding-row-hash-abc');
    // Click the limit button to start editing
    const limitButtons = row.querySelectorAll('button');
    // Find the limit button (contains "2.0x")
    let limitBtn: HTMLElement | null = null;
    limitButtons.forEach((btn) => {
      if (btn.textContent?.includes('2.0x')) limitBtn = btn;
    });
    fireEvent.click(limitBtn!);

    // Change value
    const numberInput = row.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(numberInput, { target: { value: '3.5' } });

    // Click Save
    fireEvent.click(getByText('Save'));

    await waitFor(() => {
      expect(onUpdatePolicy).toHaveBeenCalledWith('hash-abc', { seedRatioLimit: 3.5 });
    });
  });

  it('formats size in MB for values under 1 GB', () => {
    const smallStats: SeedingStats[] = [
      { ...mockStats[0], uploaded: 524288000 }, // ~500 MB
    ];
    const { container } = render(
      <SeedingTable stats={smallStats} aggregate={null} onUpdatePolicy={vi.fn()} />,
    );
    expect(container.textContent).toContain('500 MB');
  });

  it('formats duration in hours when less than 1 day', () => {
    const shortStats: SeedingStats[] = [
      { ...mockStats[0], seedingDuration: 7200 }, // 2 hours
    ];
    const { container } = render(
      <SeedingTable stats={shortStats} aggregate={null} onUpdatePolicy={vi.fn()} />,
    );
    expect(container.textContent).toContain('2h');
  });

  it('renders aggregate total uploaded label', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    expect(getByText('Total Uploaded')).toBeDefined();
  });

  it('renders aggregate avg ratio label', () => {
    const { getByText } = render(<SeedingTable {...defaultProps} />);
    expect(getByText('Avg Ratio')).toBeDefined();
  });
});
