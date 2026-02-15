'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEntry, MovieStatus } from '@/types/acquisition';

const STATUS_COLORS: Record<MovieStatus, string> = {
  monitoring: 'bg-blue-500',
  released: 'bg-green-500',
  downloading: 'bg-yellow-500',
  completed: 'bg-gray-400',
  failed: 'bg-red-500',
};

interface CalendarGridProps {
  entries: CalendarEntry[];
  currentMonth: string; // YYYY-MM
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function CalendarGrid({ entries, currentMonth, onPrevMonth, onNextMonth }: CalendarGridProps) {
  const [year, month] = currentMonth.split('-').map(Number);
  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry>();
    for (const entry of entries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [entries]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div data-testid="calendar-grid">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h3 className="text-lg font-semibold text-text-primary">{monthName}</h3>
        <button
          type="button"
          onClick={onNextMonth}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-text-tertiary py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entry = entriesByDate.get(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={`relative p-2 rounded-lg min-h-[60px] text-sm ${
                isToday ? 'bg-primary/10 border border-primary/30' : 'bg-surface hover:bg-surface-hover'
              } transition-colors`}
              data-testid={`calendar-day-${dateStr}`}
            >
              <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-text-secondary'}`}>
                {day}
              </span>
              {entry && entry.movies.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {entry.movies.slice(0, 3).map((movie) => (
                    <div
                      key={movie.id}
                      className={`w-2 h-2 rounded-full ${STATUS_COLORS[movie.status]}`}
                      title={`${movie.title} (${movie.status})`}
                    />
                  ))}
                  {entry.movies.length > 3 && (
                    <span className="text-[10px] text-text-tertiary">+{entry.movies.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
