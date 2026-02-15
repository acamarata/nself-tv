'use client';

import { useState } from 'react';
import { Plus, Trash2, Rss, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { QualityProfileSelector } from '@/components/acquire/QualityProfileSelector';
import type { TVSubscription, FeedStatus, QualityProfile, SubscribeRequest } from '@/types/acquisition';

const STATUS_COLORS: Record<FeedStatus, string> = {
  active: 'bg-green-500/10 text-green-500',
  dormant: 'bg-yellow-500/10 text-yellow-500',
  inactive: 'bg-gray-500/10 text-gray-400',
  error: 'bg-red-500/10 text-red-500',
};

const MOCK_SUBS: TVSubscription[] = [
  { id: 's1', familyId: 'f1', showName: 'Breaking Bad', feedUrl: 'https://showrss.info/show/1', qualityProfile: 'balanced', autoDownload: true, status: 'active', lastChecked: new Date(Date.now() - 1800000).toISOString(), nextCheck: new Date(Date.now() + 1800000).toISOString(), episodeCount: 62, createdAt: '2026-01-01', updatedAt: '2026-02-14' },
  { id: 's2', familyId: 'f1', showName: 'The Bear', feedUrl: 'https://showrss.info/show/2', qualityProfile: '4k_premium', autoDownload: true, status: 'active', lastChecked: new Date(Date.now() - 3600000).toISOString(), nextCheck: new Date(Date.now() + 600000).toISOString(), episodeCount: 18, createdAt: '2026-01-15', updatedAt: '2026-02-14' },
  { id: 's3', familyId: 'f1', showName: 'Severance', feedUrl: 'https://showrss.info/show/3', qualityProfile: 'balanced', autoDownload: false, status: 'dormant', lastChecked: new Date(Date.now() - 86400000).toISOString(), nextCheck: new Date(Date.now() + 21600000).toISOString(), episodeCount: 19, createdAt: '2026-01-20', updatedAt: '2026-02-10' },
  { id: 's4', familyId: 'f1', showName: 'Andor', feedUrl: 'https://showrss.info/show/4', qualityProfile: 'balanced', autoDownload: true, status: 'error', lastChecked: new Date(Date.now() - 7200000).toISOString(), nextCheck: null, episodeCount: 12, createdAt: '2026-02-01', updatedAt: '2026-02-13' },
];

export default function SubscriptionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [subs] = useState(MOCK_SUBS);

  // Form state
  const [formShowName, setFormShowName] = useState('');
  const [formFeedUrl, setFormFeedUrl] = useState('');
  const [formQuality, setFormQuality] = useState<QualityProfile>('balanced');
  const [formAutoDownload, setFormAutoDownload] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Will wire to useSubscriptions hook when plugins ready
    const _params: SubscribeRequest = {
      showName: formShowName,
      feedUrl: formFeedUrl,
      qualityProfile: formQuality,
      autoDownload: formAutoDownload,
    };
    setShowForm(false);
    setFormShowName('');
    setFormFeedUrl('');
    setFormQuality('balanced');
    setFormAutoDownload(true);
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">TV Subscriptions</h1>
        <button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">New Subscription</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="showName" className="block text-sm font-medium text-text-secondary mb-1">Show Name</label>
              <input
                id="showName"
                type="text"
                value={formShowName}
                onChange={(e) => setFormShowName(e.target.value)}
                placeholder="e.g. Breaking Bad"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label htmlFor="feedUrl" className="block text-sm font-medium text-text-secondary mb-1">Feed URL</label>
              <input
                id="feedUrl"
                type="url"
                value={formFeedUrl}
                onChange={(e) => setFormFeedUrl(e.target.value)}
                placeholder="https://showrss.info/show/..."
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Quality Profile</label>
              <QualityProfileSelector value={formQuality} onChange={setFormQuality} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="autoDownload"
                type="checkbox"
                checked={formAutoDownload}
                onChange={(e) => setFormAutoDownload(e.target.checked)}
                className="accent-primary"
              />
              <label htmlFor="autoDownload" className="text-sm text-text-secondary">Auto-download new episodes</label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                Subscribe
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {subs.length > 0 ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50">
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Show</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Quality</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Episodes</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Auto</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Last Check</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.id} className="border-b border-border hover:bg-surface-hover transition-colors" data-testid={`sub-row-${sub.id}`}>
                  <td className="px-4 py-3 font-medium text-text-primary">{sub.showName}</td>
                  <td className="px-4 py-3 text-text-secondary capitalize">{sub.qualityProfile.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-text-secondary">{sub.episodeCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status]}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {sub.autoDownload ? <CheckCircle className="w-4 h-4 text-green-500" /> : <span className="text-text-tertiary">--</span>}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-xs">
                    {sub.lastChecked ? new Date(sub.lastChecked).toLocaleTimeString() : '--'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-red-500 hover:text-red-400" aria-label={`Delete ${sub.showName}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Rss className="w-16 h-16 text-text-tertiary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No subscriptions</h2>
          <p className="text-text-secondary text-sm">Subscribe to a TV show to auto-download new episodes.</p>
        </div>
      )}
    </div>
  );
}
