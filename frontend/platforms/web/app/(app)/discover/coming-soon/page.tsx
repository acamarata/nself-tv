'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentCard } from '@/components/content/ContentCard';

interface UpcomingRelease {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
  media_type: 'movie' | 'tv';
  is_tracked: boolean;
  auto_download: boolean;
  days_until_release: number;
}

export default function ComingSoonPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const { data: upcoming, isLoading } = useQuery({
    queryKey: ['coming-soon', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/v1/discover/coming-soon?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch upcoming releases');
      return response.json() as Promise<UpcomingRelease[]>;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const trackMutation = useMutation({
    mutationFn: async ({
      releaseId,
      mediaType,
      autoDownload,
    }: {
      releaseId: number;
      mediaType: 'movie' | 'tv';
      autoDownload: boolean;
    }) => {
      const response = await fetch('/api/v1/tracking/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: releaseId,
          media_type: mediaType,
          auto_download: autoDownload,
        }),
      });
      if (!response.ok) throw new Error('Failed to track release');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coming-soon'] });
    },
  });

  const untrackMutation = useMutation({
    mutationFn: async ({
      releaseId,
      mediaType,
    }: {
      releaseId: number;
      mediaType: 'movie' | 'tv';
    }) => {
      const response = await fetch('/api/v1/tracking/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: releaseId,
          media_type: mediaType,
        }),
      });
      if (!response.ok) throw new Error('Failed to untrack release');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coming-soon'] });
    },
  });

  const handleTrack = (release: UpcomingRelease, autoDownload: boolean = false) => {
    if (release.is_tracked) {
      untrackMutation.mutate({
        releaseId: release.id,
        mediaType: release.media_type,
      });
    } else {
      trackMutation.mutate({
        releaseId: release.id,
        mediaType: release.media_type,
        autoDownload,
      });
    }
  };

  const groupByMonth = (releases: UpcomingRelease[]) => {
    const grouped: Record<string, UpcomingRelease[]> = {};

    releases.forEach((release) => {
      const date = new Date(release.release_date);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(release);
    });

    return grouped;
  };

  if (isLoading) {
    return (
      <div className="coming-soon-page loading">
        <h1>Coming Soon</h1>
        <p>Loading upcoming releases...</p>
      </div>
    );
  }

  const groupedReleases = upcoming ? groupByMonth(upcoming) : {};

  return (
    <div className="coming-soon-page">
      <header className="page-header">
        <h1>Coming Soon</h1>
        <p className="subtitle">
          Track upcoming releases and get notified when they're available
        </p>
      </header>

      <div className="controls">
        <div className="view-toggle">
          <button
            className={viewMode === 'calendar' ? 'active' : ''}
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>

        <div className="time-range">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
          >
            <option value="week">Next Week</option>
            <option value="month">Next Month</option>
            <option value="quarter">Next 3 Months</option>
            <option value="year">Next Year</option>
          </select>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="upcoming-list">
          {Object.entries(groupedReleases).map(([month, releases]) => (
            <section key={month} className="month-section">
              <h2 className="month-header">{month}</h2>

              <div className="release-grid">
                {releases.map((release) => (
                  <div key={`${release.media_type}-${release.id}`} className="release-item">
                    <ContentCard
                      title={release.title}
                      posterUrl={
                        release.poster_path
                          ? `https://image.tmdb.org/t/p/w500${release.poster_path}`
                          : '/placeholder-poster.png'
                      }
                      year={new Date(release.release_date).getFullYear()}
                      rating={release.vote_average / 2}
                      mediaType={release.media_type}
                      onClick={() => {
                        /* Navigate to detail */
                      }}
                    />

                    <div className="release-info">
                      <div className="release-date">
                        {new Date(release.release_date).toLocaleDateString()}
                        {release.days_until_release > 0 && (
                          <span className="days-until">
                            ({release.days_until_release} days)
                          </span>
                        )}
                      </div>

                      <div className="track-controls">
                        <button
                          className={`track-btn ${release.is_tracked ? 'tracked' : ''}`}
                          onClick={() => handleTrack(release, false)}
                        >
                          {release.is_tracked ? '✓ Tracking' : '+ Track'}
                        </button>

                        {release.is_tracked && (
                          <label className="auto-download-toggle">
                            <input
                              type="checkbox"
                              checked={release.auto_download}
                              onChange={(e) => handleTrack(release, e.target.checked)}
                            />
                            <span>Auto-download</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {Object.keys(groupedReleases).length === 0 && (
            <div className="empty-state">
              <p>No upcoming releases in this time range.</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="calendar-view">
          <p>Calendar view coming soon...</p>
        </div>
      )}
    </div>
  );
}
