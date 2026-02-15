import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CalendarGrid } from '@/components/acquire/CalendarGrid';
import type { CalendarEntry, MovieMonitoring } from '@/types/acquisition';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

function makeMovie(overrides: Partial<MovieMonitoring> = {}): MovieMonitoring {
  return {
    id: 'movie-1',
    familyId: 'fam-1',
    title: 'Dune: Part Three',
    tmdbId: '693134',
    releaseDate: '2026-02-15',
    status: 'monitoring',
    qualityProfile: 'balanced',
    posterUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const entries: CalendarEntry[] = [
  { date: '2026-02-15', movies: [makeMovie({ id: 'm1', title: 'Dune: Part Three', status: 'monitoring' })] },
  { date: '2026-02-20', movies: [makeMovie({ id: 'm2', title: 'Film B', status: 'released' }), makeMovie({ id: 'm3', title: 'Film C', status: 'completed' })] },
];

describe('CalendarGrid', () => {
  it('renders with data-testid', () => {
    const { getByTestId } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    expect(getByTestId('calendar-grid')).toBeDefined();
  });

  it('displays the month name and year', () => {
    const { getByText } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    expect(getByText('February 2026')).toBeDefined();
  });

  it('renders all day-of-week headers', () => {
    const { getByText } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(getByText(day)).toBeDefined();
    }
  });

  it('renders day cells with data-testid', () => {
    const { getByTestId } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    expect(getByTestId('calendar-day-2026-02-01')).toBeDefined();
    expect(getByTestId('calendar-day-2026-02-15')).toBeDefined();
    expect(getByTestId('calendar-day-2026-02-28')).toBeDefined();
  });

  it('renders movie dots on days with entries', () => {
    const { getByTestId } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    const day15 = getByTestId('calendar-day-2026-02-15');
    const dots = day15.querySelectorAll('.rounded-full');
    // Filter to just the small dots (w-2 h-2), not the day cell itself
    const movieDots = day15.querySelectorAll('.w-2.h-2');
    expect(movieDots.length).toBe(1);
  });

  it('renders multiple movie dots for multi-movie days', () => {
    const { getByTestId } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    const day20 = getByTestId('calendar-day-2026-02-20');
    const movieDots = day20.querySelectorAll('.w-2.h-2');
    expect(movieDots.length).toBe(2);
  });

  it('limits visible dots to 3 and shows overflow count', () => {
    const manyMovies: CalendarEntry[] = [
      {
        date: '2026-02-10',
        movies: [
          makeMovie({ id: 'm1', title: 'A' }),
          makeMovie({ id: 'm2', title: 'B' }),
          makeMovie({ id: 'm3', title: 'C' }),
          makeMovie({ id: 'm4', title: 'D' }),
          makeMovie({ id: 'm5', title: 'E' }),
        ],
      },
    ];
    const { getByTestId, getByText } = render(
      <CalendarGrid entries={manyMovies} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    const day10 = getByTestId('calendar-day-2026-02-10');
    const movieDots = day10.querySelectorAll('.w-2.h-2');
    expect(movieDots.length).toBe(3);
    expect(getByText('+2')).toBeDefined();
  });

  it('calls onPrevMonth when previous button clicked', () => {
    const onPrevMonth = vi.fn();
    const { getByLabelText } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={onPrevMonth} onNextMonth={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Previous month'));
    expect(onPrevMonth).toHaveBeenCalledOnce();
  });

  it('calls onNextMonth when next button clicked', () => {
    const onNextMonth = vi.fn();
    const { getByLabelText } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={onNextMonth} />,
    );
    fireEvent.click(getByLabelText('Next month'));
    expect(onNextMonth).toHaveBeenCalledOnce();
  });

  it('renders empty days without movie dots', () => {
    const { getByTestId } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    const day01 = getByTestId('calendar-day-2026-02-01');
    const movieDots = day01.querySelectorAll('.w-2.h-2');
    expect(movieDots.length).toBe(0);
  });

  it('applies monitoring color for monitoring status', () => {
    const { getByTestId } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    const day15 = getByTestId('calendar-day-2026-02-15');
    const dot = day15.querySelector('.bg-blue-500');
    expect(dot).not.toBeNull();
  });

  it('renders correct month for different input', () => {
    const { getByText } = render(
      <CalendarGrid entries={[]} currentMonth="2026-12" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    expect(getByText('December 2026')).toBeDefined();
  });

  it('renders title attribute on movie dots', () => {
    const { getByTestId } = render(
      <CalendarGrid entries={entries} currentMonth="2026-02" onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />,
    );
    const day15 = getByTestId('calendar-day-2026-02-15');
    const dot = day15.querySelector('[title]');
    expect(dot?.getAttribute('title')).toBe('Dune: Part Three (monitoring)');
  });
});
