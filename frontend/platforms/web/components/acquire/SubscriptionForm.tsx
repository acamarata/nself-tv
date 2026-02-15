'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { QualityProfileSelector } from './QualityProfileSelector';
import type { QualityProfile, SubscribeRequest } from '@/types/acquisition';

interface SubscriptionFormProps {
  onSubmit: (params: SubscribeRequest) => Promise<void>;
  onCancel: () => void;
  initialValues?: Partial<SubscribeRequest>;
}

export function SubscriptionForm({ onSubmit, onCancel, initialValues }: SubscriptionFormProps) {
  const [showName, setShowName] = useState(initialValues?.showName || '');
  const [feedUrl, setFeedUrl] = useState(initialValues?.feedUrl || '');
  const [qualityProfile, setQualityProfile] = useState<QualityProfile>(initialValues?.qualityProfile || 'balanced');
  const [autoDownload, setAutoDownload] = useState(initialValues?.autoDownload ?? true);
  const [backfill, setBackfill] = useState(initialValues?.backfill ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showName.trim() || !feedUrl.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ showName: showName.trim(), feedUrl: feedUrl.trim(), qualityProfile, autoDownload, backfill });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="subscription-form">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Show Name</label>
        <input
          type="text"
          value={showName}
          onChange={(e) => setShowName(e.target.value)}
          placeholder="e.g. Breaking Bad"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">RSS Feed URL</label>
        <input
          type="url"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          placeholder="https://showrss.info/show/..."
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">Quality Profile</label>
        <QualityProfileSelector value={qualityProfile} onChange={setQualityProfile} />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoDownload} onChange={(e) => setAutoDownload(e.target.checked)} className="accent-primary" />
          <span className="text-sm text-text-primary">Auto-download new episodes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={backfill} onChange={(e) => setBackfill(e.target.checked)} className="accent-primary" />
          <span className="text-sm text-text-primary">Backfill aired episodes</span>
        </label>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !showName.trim() || !feedUrl.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : 'Subscribe'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-hover transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
