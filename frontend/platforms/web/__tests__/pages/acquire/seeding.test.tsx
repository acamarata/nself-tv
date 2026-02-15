import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SeedingPage from '@/app/(app)/acquire/seeding/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

describe('SeedingPage', () => {
  it('renders the Seeding heading', () => {
    render(<SeedingPage />);
    expect(screen.getByText('Seeding')).toBeDefined();
  });

  it('renders aggregate stat cards', () => {
    render(<SeedingPage />);
    expect(screen.getByText('Total Uploaded')).toBeDefined();
    expect(screen.getByText('Total Downloaded')).toBeDefined();
    expect(screen.getByText('Average Ratio')).toBeDefined();
    expect(screen.getByText('Active Torrents')).toBeDefined();
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('renders aggregate stat values', () => {
    render(<SeedingPage />);
    // totalUploaded: 78858811840 = 73.44 GB
    expect(screen.getByText('73.4 GB')).toBeDefined();
    // totalDownloaded: 37580963840 = 35.00 GB
    expect(screen.getByText('35.0 GB')).toBeDefined();
    // averageRatio: 1.84
    expect(screen.getByText('1.84')).toBeDefined();
    // activeTorrents: 6
    expect(screen.getByText('6')).toBeDefined();
    // completedTorrents: 42
    expect(screen.getByText('42')).toBeDefined();
  });

  it('renders all seed rows', () => {
    render(<SeedingPage />);
    expect(screen.getByTestId('seed-row-sd1')).toBeDefined();
    expect(screen.getByTestId('seed-row-sd2')).toBeDefined();
    expect(screen.getByTestId('seed-row-sd3')).toBeDefined();
    expect(screen.getByTestId('seed-row-sd4')).toBeDefined();
    expect(screen.getByTestId('seed-row-sd5')).toBeDefined();
    expect(screen.getByTestId('seed-row-sd6')).toBeDefined();
  });

  it('renders torrent names', () => {
    render(<SeedingPage />);
    expect(screen.getByText('Breaking Bad S05E16 - Felina [BluRay-1080p]')).toBeDefined();
    expect(screen.getByText('Oppenheimer (2023) [Remux-4K]')).toBeDefined();
    expect(screen.getByText('The Bear S03E01 [WEB-DL-1080p]')).toBeDefined();
    expect(screen.getByText('Dune Part Two (2024) [BluRay-4K]')).toBeDefined();
    expect(screen.getByText('Severance S02E04 [WEB-DL-1080p]')).toBeDefined();
    expect(screen.getByText('Killers of the Flower Moon (2023) [Remux-4K]')).toBeDefined();
  });

  it('renders truncated torrent hashes', () => {
    render(<SeedingPage />);
    expect(screen.getByText('abc123def456...')).toBeDefined();
    expect(screen.getByText('def456ghi789...')).toBeDefined();
    expect(screen.getByText('ghi789jkl012...')).toBeDefined();
  });

  it('renders ratios with correct values', () => {
    render(<SeedingPage />);
    expect(screen.getByText('2.45')).toBeDefined();
    expect(screen.getByText('1.82')).toBeDefined();
    expect(screen.getByText('0.64')).toBeDefined();
    expect(screen.getByText('3.12')).toBeDefined();
    expect(screen.getByText('1.05')).toBeDefined();
    expect(screen.getByText('1.98')).toBeDefined();
  });

  it('renders seeding duration in human-readable format', () => {
    render(<SeedingPage />);
    // sd1: 604800s = 7d 0h
    expect(screen.getByText('7d 0h')).toBeDefined();
    // sd2: 432000s = 5d 0h
    expect(screen.getByText('5d 0h')).toBeDefined();
    // sd3: 86400s = 1d 0h
    expect(screen.getByText('1d 0h')).toBeDefined();
    // sd4: 864000s = 10d 0h
    expect(screen.getByText('10d 0h')).toBeDefined();
  });

  it('renders seed ratio and time limits', () => {
    render(<SeedingPage />);
    // sd1: 3.0x / 7d
    expect(screen.getByText('3.0x / 7d')).toBeDefined();
    // sd2: 2.0x / 7d
    const twoPointZero = screen.getAllByText('2.0x / 7d');
    expect(twoPointZero.length).toBeGreaterThanOrEqual(1);
    // sd4: 3.0x / 14d
    expect(screen.getByText('3.0x / 14d')).toBeDefined();
  });

  it('renders sortable column headers', () => {
    render(<SeedingPage />);
    // Default sort is by ratio descending
    const ratioHeader = screen.getByText(/^Ratio/);
    expect(ratioHeader).toBeDefined();
    expect(ratioHeader.textContent).toContain('\u2193'); // down arrow

    const nameHeader = screen.getByText(/^Name/);
    expect(nameHeader).toBeDefined();
  });

  it('sorts by name when Name header is clicked', () => {
    render(<SeedingPage />);
    const nameHeader = screen.getByText(/^Name/);
    fireEvent.click(nameHeader);

    // After clicking, Name should have a sort indicator
    expect(nameHeader.textContent).toContain('\u2193');
    // Ratio header should no longer have indicator
    const ratioHeader = screen.getByText('Ratio');
    expect(ratioHeader.textContent).not.toContain('\u2193');
    expect(ratioHeader.textContent).not.toContain('\u2191');
  });

  it('toggles sort direction when same header is clicked twice', () => {
    render(<SeedingPage />);

    // Default: ratio descending
    const ratioHeader = screen.getByText(/^Ratio/);
    expect(ratioHeader.textContent).toContain('\u2193');

    // Click ratio again to flip to ascending
    fireEvent.click(ratioHeader);
    expect(screen.getByText(/^Ratio/).textContent).toContain('\u2191');

    // Click again to go back to descending
    fireEvent.click(screen.getByText(/^Ratio/));
    expect(screen.getByText(/^Ratio/).textContent).toContain('\u2193');
  });

  it('sorts by uploaded when Uploaded header is clicked', () => {
    render(<SeedingPage />);
    const uploadedHeader = screen.getByText(/^Uploaded/);
    fireEvent.click(uploadedHeader);

    expect(uploadedHeader.textContent).toContain('\u2193');
  });

  it('sorts by seeding time when Seeding Time header is clicked', () => {
    render(<SeedingPage />);
    const timeHeader = screen.getByText(/^Seeding Time/);
    fireEvent.click(timeHeader);

    expect(timeHeader.textContent).toContain('\u2193');
  });

  it('renders items sorted by ratio descending by default', () => {
    render(<SeedingPage />);
    // Default sort: ratio descending
    // sd4 (3.12) > sd1 (2.45) > sd6 (1.98) > sd2 (1.82) > sd5 (1.05) > sd3 (0.64)
    const rows = screen.getAllByTestId(/^seed-row-/);
    expect(rows[0].getAttribute('data-testid')).toBe('seed-row-sd4');
    expect(rows[1].getAttribute('data-testid')).toBe('seed-row-sd1');
    expect(rows[2].getAttribute('data-testid')).toBe('seed-row-sd6');
    expect(rows[3].getAttribute('data-testid')).toBe('seed-row-sd2');
    expect(rows[4].getAttribute('data-testid')).toBe('seed-row-sd5');
    expect(rows[5].getAttribute('data-testid')).toBe('seed-row-sd3');
  });

  it('renders favorite star icons for favorited items', () => {
    render(<SeedingPage />);
    // sd1, sd4, sd6 are favorites
    // Check that the icon component is rendered (via our mock)
    const starIcons = screen.getAllByTestId('icon-Star');
    expect(starIcons.length).toBe(3);
  });

  it('renders the Downloaded column header (non-sortable)', () => {
    render(<SeedingPage />);
    expect(screen.getByText('Downloaded')).toBeDefined();
  });

  it('renders the Limit column header', () => {
    render(<SeedingPage />);
    expect(screen.getByText('Limit')).toBeDefined();
  });
});
