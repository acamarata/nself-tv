import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarPage from '@/app/(app)/acquire/calendar/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

// Mock CalendarGrid component to make it testable
vi.mock('@/components/acquire/CalendarGrid', () => ({
  CalendarGrid: ({ entries, currentMonth, onPrevMonth, onNextMonth }: {
    entries: Array<{ date: string; movies: Array<{ id: string; title: string }> }>;
    currentMonth: string;
    onPrevMonth: () => void;
    onNextMonth: () => void;
  }) => (
    <div data-testid="calendar-grid">
      <span data-testid="current-month">{currentMonth}</span>
      <button type="button" data-testid="prev-month" onClick={onPrevMonth} aria-label="Previous month">Prev</button>
      <button type="button" data-testid="next-month" onClick={onNextMonth} aria-label="Next month">Next</button>
      <span data-testid="entry-count">{entries.length} entries</span>
    </div>
  ),
}));

describe('CalendarPage', () => {
  it('renders the Release Calendar heading', () => {
    render(<CalendarPage />);
    expect(screen.getByText('Release Calendar')).toBeDefined();
  });

  it('renders the calendar grid component', () => {
    render(<CalendarPage />);
    expect(screen.getByTestId('calendar-grid')).toBeDefined();
  });

  it('renders the Upcoming Releases sidebar', () => {
    render(<CalendarPage />);
    expect(screen.getByText('Upcoming Releases')).toBeDefined();
  });

  it('renders upcoming movie entries in the sidebar', () => {
    render(<CalendarPage />);
    // Mock entries include movies with monitoring and released statuses
    // Dune: Part Three (monitoring), Blade Runner 2099 (released), The Batman Part II (monitoring)
    expect(screen.getByText('Dune: Part Three')).toBeDefined();
    expect(screen.getByText('The Batman Part II')).toBeDefined();
    expect(screen.getByText('Blade Runner 2099')).toBeDefined();
  });

  it('renders upcoming entries with data-testid attributes', () => {
    render(<CalendarPage />);
    expect(screen.getByTestId('upcoming-cm1')).toBeDefined();
    expect(screen.getByTestId('upcoming-cm2')).toBeDefined();
    expect(screen.getByTestId('upcoming-cm3')).toBeDefined();
  });

  it('starts with the current month and year', () => {
    render(<CalendarPage />);
    const now = new Date();
    const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(screen.getByTestId('current-month').textContent).toBe(expectedMonth);
  });

  it('navigates to the previous month', () => {
    render(<CalendarPage />);
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const expected = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    fireEvent.click(screen.getByTestId('prev-month'));
    expect(screen.getByTestId('current-month').textContent).toBe(expected);
  });

  it('navigates to the next month', () => {
    render(<CalendarPage />);
    const now = new Date();
    const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const expected = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

    fireEvent.click(screen.getByTestId('next-month'));
    expect(screen.getByTestId('current-month').textContent).toBe(expected);
  });

  it('navigates across year boundary going backward from January', () => {
    render(<CalendarPage />);
    const now = new Date();

    // Navigate backward to January, then one more for December of previous year
    const monthsToJan = now.getMonth(); // 0-indexed
    for (let i = 0; i < monthsToJan; i++) {
      fireEvent.click(screen.getByTestId('prev-month'));
    }
    // Now at January of current year
    const janExpected = `${now.getFullYear()}-01`;
    expect(screen.getByTestId('current-month').textContent).toBe(janExpected);

    // Go one more month back to December of previous year
    fireEvent.click(screen.getByTestId('prev-month'));
    const decExpected = `${now.getFullYear() - 1}-12`;
    expect(screen.getByTestId('current-month').textContent).toBe(decExpected);
  });

  it('navigates across year boundary going forward from December', () => {
    render(<CalendarPage />);
    const now = new Date();

    // Navigate forward to December, then one more for January of next year
    const monthsToDec = 11 - now.getMonth();
    for (let i = 0; i < monthsToDec; i++) {
      fireEvent.click(screen.getByTestId('next-month'));
    }
    // Now at December of current year
    const decExpected = `${now.getFullYear()}-12`;
    expect(screen.getByTestId('current-month').textContent).toBe(decExpected);

    // Go one more month forward to January of next year
    fireEvent.click(screen.getByTestId('next-month'));
    const janExpected = `${now.getFullYear() + 1}-01`;
    expect(screen.getByTestId('current-month').textContent).toBe(janExpected);
  });

  it('renders quality profiles for upcoming movies', () => {
    render(<CalendarPage />);
    // The mock data uses 4k_premium and balanced profiles
    const premiumTexts = screen.getAllByText('4k premium');
    expect(premiumTexts.length).toBeGreaterThanOrEqual(1);
    const balancedTexts = screen.getAllByText('balanced');
    expect(balancedTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show completed or downloading movies in upcoming sidebar', () => {
    render(<CalendarPage />);
    // Oppenheimer 2 is 'downloading', Civil War 2 is 'completed'
    expect(screen.queryByTestId('upcoming-cm4')).toBeNull();
    expect(screen.queryByTestId('upcoming-cm5')).toBeNull();
  });
});
