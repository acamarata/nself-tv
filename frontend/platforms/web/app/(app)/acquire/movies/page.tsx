'use client';

import { useState } from 'react';
import { Plus, Trash2, Film, Search, Image, Calendar } from 'lucide-react';
import { QualityProfileSelector } from '@/components/acquire/QualityProfileSelector';
import type { MovieMonitoring, MovieStatus, QualityProfile, MonitorMovieRequest } from '@/types/acquisition';

const STATUS_COLORS: Record<MovieStatus, string> = {
  monitoring: 'bg-blue-500/10 text-blue-500',
  released: 'bg-green-500/10 text-green-500',
  downloading: 'bg-yellow-500/10 text-yellow-500',
  completed: 'bg-gray-500/10 text-gray-400',
  failed: 'bg-red-500/10 text-red-500',
};

const MOCK_MOVIES: MovieMonitoring[] = [
  { id: 'm1', familyId: 'f1', title: 'Dune: Part Three', tmdbId: '945961', releaseDate: '2026-03-15', status: 'monitoring', qualityProfile: '4k_premium', posterUrl: null, createdAt: '2026-01-10', updatedAt: '2026-02-14' },
  { id: 'm2', familyId: 'f1', title: 'The Batman Part II', tmdbId: '414906', releaseDate: '2026-10-01', status: 'monitoring', qualityProfile: 'balanced', posterUrl: null, createdAt: '2026-01-20', updatedAt: '2026-02-14' },
  { id: 'm3', familyId: 'f1', title: 'Oppenheimer', tmdbId: '872585', releaseDate: '2023-07-21', status: 'completed', qualityProfile: '4k_premium', posterUrl: null, createdAt: '2025-12-01', updatedAt: '2026-01-15' },
  { id: 'm4', familyId: 'f1', title: 'Blade Runner 2099', tmdbId: null, releaseDate: '2026-06-01', status: 'monitoring', qualityProfile: 'balanced', posterUrl: null, createdAt: '2026-02-01', updatedAt: '2026-02-14' },
  { id: 'm5', familyId: 'f1', title: 'Killers of the Flower Moon', tmdbId: '466420', releaseDate: '2023-10-20', status: 'downloading', qualityProfile: '4k_premium', posterUrl: null, createdAt: '2026-02-10', updatedAt: '2026-02-14' },
  { id: 'm6', familyId: 'f1', title: 'Civil War', tmdbId: '653346', releaseDate: '2024-04-12', status: 'failed', qualityProfile: 'balanced', posterUrl: null, createdAt: '2026-02-05', updatedAt: '2026-02-13' },
];

function formatRelease(date: string | null): string {
  if (!date) return 'TBA';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MoviesPage() {
  const [showForm, setShowForm] = useState(false);
  const [movies] = useState(MOCK_MOVIES);
  const [statusFilter, setStatusFilter] = useState<MovieStatus | 'all'>('all');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formTmdbId, setFormTmdbId] = useState('');
  const [formQuality, setFormQuality] = useState<QualityProfile>('balanced');

  const filtered = statusFilter === 'all' ? movies : movies.filter((m) => m.status === statusFilter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Will wire to useMovieMonitoring hook when plugins ready
    const _params: MonitorMovieRequest = {
      title: formTitle,
      tmdbId: formTmdbId || undefined,
      qualityProfile: formQuality,
    };
    setShowForm(false);
    setFormTitle('');
    setFormTmdbId('');
    setFormQuality('balanced');
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Movie Monitoring</h1>
        <button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
          <Plus className="w-4 h-4" /> Monitor Movie
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Monitor New Movie</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="movieTitle" className="block text-sm font-medium text-text-secondary mb-1">Movie Title</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  id="movieTitle"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Search for a movie..."
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="tmdbId" className="block text-sm font-medium text-text-secondary mb-1">TMDB ID (optional)</label>
              <input
                id="tmdbId"
                type="text"
                value={formTmdbId}
                onChange={(e) => setFormTmdbId(e.target.value)}
                placeholder="e.g. 945961"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Quality Profile</label>
              <QualityProfileSelector value={formQuality} onChange={setFormQuality} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                Start Monitoring
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MovieStatus | 'all')}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="monitoring">Monitoring</option>
          <option value="released">Released</option>
          <option value="downloading">Downloading</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-sm text-text-tertiary">{filtered.length} movies</span>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="movies-grid">
          {filtered.map((movie) => (
            <div key={movie.id} className="bg-surface border border-border rounded-xl overflow-hidden" data-testid={`movie-card-${movie.id}`}>
              {/* Poster placeholder */}
              <div className="aspect-[2/3] bg-surface-hover flex items-center justify-center">
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-12 h-12 text-text-tertiary" />
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-text-primary truncate">{movie.title}</h3>
                <div className="flex items-center gap-1 text-xs text-text-tertiary mt-1">
                  <Calendar className="w-3 h-3" />
                  {formatRelease(movie.releaseDate)}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[movie.status]}`}>
                    {movie.status}
                  </span>
                  <span className="text-xs text-text-tertiary capitalize">{movie.qualityProfile.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  {movie.tmdbId && (
                    <span className="text-xs text-text-tertiary">TMDB: {movie.tmdbId}</span>
                  )}
                  <button type="button" className="text-red-500 hover:text-red-400 ml-auto" aria-label={`Remove ${movie.title}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Film className="w-16 h-16 text-text-tertiary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No movies monitored</h2>
          <p className="text-text-secondary text-sm">Add a movie to monitor for digital releases and auto-download.</p>
        </div>
      )}
    </div>
  );
}
