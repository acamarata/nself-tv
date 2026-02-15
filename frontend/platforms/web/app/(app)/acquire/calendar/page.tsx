'use client';

import { useState, useMemo } from 'react';
import { Calendar, Film } from 'lucide-react';
import { CalendarGrid } from '@/components/acquire/CalendarGrid';
import type { CalendarEntry, MovieMonitoring } from '@/types/acquisition';

function buildMockEntries(year: number, month: number): CalendarEntry[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const prefix = `${year}-${pad(month)}`;

  const movies: MovieMonitoring[] = [
    { id: 'cm1', familyId: 'f1', title: 'Dune: Part Three', tmdbId: '945961', releaseDate: `${prefix}-15`, status: 'monitoring', qualityProfile: '4k_premium', posterUrl: null, createdAt: '2026-01-10', updatedAt: '2026-02-14' },
    { id: 'cm2', familyId: 'f1', title: 'The Batman Part II', tmdbId: '414906', releaseDate: `${prefix}-22`, status: 'monitoring', qualityProfile: 'balanced', posterUrl: null, createdAt: '2026-01-20', updatedAt: '2026-02-14' },
    { id: 'cm3', familyId: 'f1', title: 'Blade Runner 2099', tmdbId: null, releaseDate: `${prefix}-08`, status: 'released', qualityProfile: 'balanced', posterUrl: null, createdAt: '2026-02-01', updatedAt: '2026-02-14' },
    { id: 'cm4', familyId: 'f1', title: 'Oppenheimer 2', tmdbId: null, releaseDate: `${prefix}-15`, status: 'downloading', qualityProfile: '4k_premium', posterUrl: null, createdAt: '2026-02-05', updatedAt: '2026-02-14' },
    { id: 'cm5', familyId: 'f1', title: 'Civil War 2', tmdbId: null, releaseDate: `${prefix}-01`, status: 'completed', qualityProfile: 'balanced', posterUrl: null, createdAt: '2026-01-15', updatedAt: '2026-02-14' },
  ];

  // Group by date
  const byDate = new Map<string, MovieMonitoring[]>();
  for (const movie of movies) {
    if (!movie.releaseDate) continue;
    const existing = byDate.get(movie.releaseDate) || [];
    existing.push(movie);
    byDate.set(movie.releaseDate, existing);
  }

  return Array.from(byDate.entries()).map(([date, movs]) => ({ date, movies: movs }));
}

export default function CalendarPage() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);

  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const entries = useMemo(
    () => buildMockEntries(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Upcoming releases list (movies in the current month view)
  const upcomingMovies = useMemo(() => {
    return entries
      .flatMap((e) => e.movies)
      .filter((m) => m.status === 'monitoring' || m.status === 'released')
      .sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? ''));
  }, [entries]);

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Release Calendar
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-4">
          <CalendarGrid
            entries={entries}
            currentMonth={currentMonthStr}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </div>

        {/* Upcoming releases sidebar */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Upcoming Releases</h2>
          {upcomingMovies.length > 0 ? (
            <div className="space-y-3">
              {upcomingMovies.map((movie) => (
                <div key={movie.id} className="flex items-start gap-3 p-3 bg-surface-hover rounded-lg" data-testid={`upcoming-${movie.id}`}>
                  <div className="w-8 h-12 bg-surface border border-border rounded flex items-center justify-center flex-shrink-0">
                    <Film className="w-4 h-4 text-text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{movie.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {movie.releaseDate
                        ? new Date(movie.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'TBA'}
                    </p>
                    <span className="text-xs text-text-tertiary capitalize">{movie.qualityProfile.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <Film className="w-10 h-10 text-text-tertiary mb-2" />
              <p className="text-sm text-text-secondary">No upcoming releases this month.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
