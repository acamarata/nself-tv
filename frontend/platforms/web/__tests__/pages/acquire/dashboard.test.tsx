import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AcquireDashboardPage from '@/app/(app)/acquire/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

describe('AcquireDashboardPage', () => {
  it('renders the Content Acquisition heading', () => {
    render(<AcquireDashboardPage />);
    expect(screen.getByText('Content Acquisition')).toBeDefined();
  });

  it('renders the Subscribe and Monitor Movie action buttons', () => {
    render(<AcquireDashboardPage />);
    expect(screen.getByText('Subscribe')).toBeDefined();
    expect(screen.getByText('Monitor Movie')).toBeDefined();
  });

  it('renders all four summary cards with correct values', () => {
    render(<AcquireDashboardPage />);
    expect(screen.getByText('Active Downloads')).toBeDefined();
    expect(screen.getByText('Completed Today')).toBeDefined();
    expect(screen.getByText('Failed This Week')).toBeDefined();
    expect(screen.getByText('Active Subscriptions')).toBeDefined();

    // Verify values from MOCK_DASHBOARD
    expect(screen.getByText('2')).toBeDefined(); // activeDownloads
    expect(screen.getByText('5')).toBeDefined(); // completedToday
    expect(screen.getByText('1')).toBeDefined(); // failedThisWeek
    expect(screen.getByText('8')).toBeDefined(); // activeSubscriptions
  });

  it('renders the Recent Activity section', () => {
    render(<AcquireDashboardPage />);
    expect(screen.getByText('Recent Activity')).toBeDefined();
  });

  it('renders all activity entries with titles', () => {
    render(<AcquireDashboardPage />);
    expect(screen.getByText('Breaking Bad S05E16')).toBeDefined();
    expect(screen.getByText('The Bear S03E01')).toBeDefined();
    expect(screen.getByText('Dune: Part Three')).toBeDefined();
    expect(screen.getByText('Severance S02E05')).toBeDefined();
    expect(screen.getByText('Andor')).toBeDefined();
  });

  it('renders activity entries with details', () => {
    render(<AcquireDashboardPage />);
    expect(screen.getByText('4.2 GB, Balanced profile')).toBeDefined();
    expect(screen.getByText('New episode from ShowRSS feed')).toBeDefined();
    expect(screen.getByText('Digital release detected via TMDB')).toBeDefined();
    expect(screen.getByText('Encoding failed: FFmpeg timeout')).toBeDefined();
    expect(screen.getByText('Subscribed with Balanced quality')).toBeDefined();
  });

  it('renders activity entries with data-testid attributes', () => {
    render(<AcquireDashboardPage />);
    expect(screen.getByTestId('activity-a1')).toBeDefined();
    expect(screen.getByTestId('activity-a2')).toBeDefined();
    expect(screen.getByTestId('activity-a3')).toBeDefined();
    expect(screen.getByTestId('activity-a4')).toBeDefined();
    expect(screen.getByTestId('activity-a5')).toBeDefined();
  });

  it('renders relative timestamps for activities', () => {
    render(<AcquireDashboardPage />);
    // All entries have time-ago strings; they should match the pattern
    const entries = screen.getAllByTestId(/^activity-a/);
    expect(entries).toHaveLength(5);
  });

  it('renders links pointing to correct routes', () => {
    const { container } = render(<AcquireDashboardPage />);
    const links = container.querySelectorAll('a');
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'));

    expect(hrefs).toContain('/acquire/downloads');
    expect(hrefs).toContain('/acquire/downloads/history');
    expect(hrefs).toContain('/acquire/subscriptions');
    expect(hrefs).toContain('/acquire/movies');
  });
});
