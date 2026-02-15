'use client';

import { useState } from 'react';
import { Search, Film } from 'lucide-react';
import { QualityProfileSelector } from './QualityProfileSelector';
import type { QualityProfile, MonitorMovieRequest } from '@/types/acquisition';

interface MovieSearchFormProps {
  onSubmit: (params: MonitorMovieRequest) => Promise<void>;
  onCancel: () => void;
}

export function MovieSearchForm({ onSubmit, onCancel }: MovieSearchFormProps) {
  const [title, setTitle] = useState('');
  const [tmdbId, setTmdbId] = useState('');
  const [qualityProfile, setQualityProfile] = useState<QualityProfile>('balanced');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), tmdbId: tmdbId.trim() || undefined, qualityProfile });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to monitor movie');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="movie-search-form">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Movie Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dune: Part Three" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">TMDB ID (optional)</label>
        <input type="text" value={tmdbId} onChange={(e) => setTmdbId(e.target.value)} placeholder="e.g. 693134" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">Quality Profile</label>
        <QualityProfileSelector value={qualityProfile} onChange={setQualityProfile} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isSubmitting || !title.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors">
          <Film className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : 'Monitor Movie'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-hover transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
