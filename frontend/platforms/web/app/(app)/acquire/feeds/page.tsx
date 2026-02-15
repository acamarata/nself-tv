'use client';

import { useState } from 'react';
import { Plus, Trash2, Rss, AlertCircle, RefreshCw } from 'lucide-react';
import { FeedPreview } from '@/components/acquire/FeedPreview';
import type { RSSFeed, FeedStatus, FeedValidation } from '@/types/acquisition';

const STATUS_COLORS: Record<FeedStatus, string> = {
  active: 'bg-green-500/10 text-green-500',
  dormant: 'bg-yellow-500/10 text-yellow-500',
  inactive: 'bg-gray-500/10 text-gray-400',
  error: 'bg-red-500/10 text-red-500',
};

const MOCK_FEEDS: RSSFeed[] = [
  { id: 'f1', title: 'ShowRSS - Personal Feed', url: 'https://showrss.info/user/12345.rss', status: 'active', lastChecked: new Date(Date.now() - 1800000).toISOString(), errorCount: 0, itemCount: 245, checkIntervalMinutes: 30, createdAt: '2026-01-01' },
  { id: 'f2', title: 'EZTV Latest', url: 'https://eztv.re/ezrss.xml', status: 'active', lastChecked: new Date(Date.now() - 3600000).toISOString(), errorCount: 0, itemCount: 1024, checkIntervalMinutes: 15, createdAt: '2026-01-05' },
  { id: 'f3', title: 'YTS Movies', url: 'https://yts.mx/rss', status: 'dormant', lastChecked: new Date(Date.now() - 86400000).toISOString(), errorCount: 2, itemCount: 50, checkIntervalMinutes: 60, createdAt: '2026-01-10' },
  { id: 'f4', title: 'Private Tracker Feed', url: 'https://tracker.example.com/rss?passkey=abc', status: 'error', lastChecked: new Date(Date.now() - 7200000).toISOString(), errorCount: 5, itemCount: 0, checkIntervalMinutes: 30, createdAt: '2026-02-01' },
  { id: 'f5', title: 'Anime RSS', url: 'https://nyaa.si/?page=rss', status: 'active', lastChecked: new Date(Date.now() - 900000).toISOString(), errorCount: 0, itemCount: 512, checkIntervalMinutes: 15, createdAt: '2026-01-20' },
];

const MOCK_VALIDATION: FeedValidation = {
  valid: true,
  title: 'ShowRSS - Preview Feed',
  itemCount: 12,
  sampleItems: [
    { title: 'Breaking Bad S05E16 720p', publishedAt: new Date(Date.now() - 3600000).toISOString(), magnetUri: 'magnet:?xt=urn:btih:abc', size: 1073741824, quality: 'hdtv', season: 5, episode: 16 },
    { title: 'The Bear S03E01 1080p', publishedAt: new Date(Date.now() - 7200000).toISOString(), magnetUri: 'magnet:?xt=urn:btih:def', size: 2147483648, quality: 'web-dl', season: 3, episode: 1 },
  ],
  errors: [],
};

function timeAgo(iso: string | null): string {
  if (!iso) return '--';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FeedsPage() {
  const [showForm, setShowForm] = useState(false);
  const [feeds] = useState(MOCK_FEEDS);
  const [feedUrl, setFeedUrl] = useState('');
  const [validation, setValidation] = useState<FeedValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    if (!feedUrl.trim()) return;
    setIsValidating(true);
    setValidation(null);
    // Simulated validation delay
    setTimeout(() => {
      setValidation(MOCK_VALIDATION);
      setIsValidating(false);
    }, 800);
  };

  const handleAddFeed = async () => {
    // Will wire to useFeedManagement hook when plugins ready
    setShowForm(false);
    setFeedUrl('');
    setValidation(null);
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">RSS Feeds</h1>
        <button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
          <Plus className="w-4 h-4" /> Add Feed
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Add RSS Feed</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="feedUrl" className="block text-sm font-medium text-text-secondary mb-1">Feed URL</label>
              <div className="flex items-center gap-2">
                <input
                  id="feedUrl"
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://example.com/rss"
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating || !feedUrl.trim()}
                  className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Validate'}
                </button>
              </div>
            </div>

            <FeedPreview validation={validation} isLoading={isValidating} />

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddFeed}
                disabled={!validation?.valid}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Feed
              </button>
              <button type="button" onClick={() => { setShowForm(false); setValidation(null); setFeedUrl(''); }} className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {feeds.length > 0 ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50">
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">URL</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Last Check</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Errors</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Items</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map((feed) => (
                <tr key={feed.id} className="border-b border-border hover:bg-surface-hover transition-colors" data-testid={`feed-row-${feed.id}`}>
                  <td className="px-4 py-3 font-medium text-text-primary">{feed.title}</td>
                  <td className="px-4 py-3 text-text-tertiary text-xs max-w-[200px] truncate" title={feed.url}>
                    {feed.url}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[feed.status]}`}>
                      {feed.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-xs">{timeAgo(feed.lastChecked)}</td>
                  <td className="px-4 py-3">
                    {feed.errorCount > 0 ? (
                      <span className="flex items-center gap-1 text-red-500 text-xs">
                        <AlertCircle className="w-3 h-3" />
                        {feed.errorCount}
                      </span>
                    ) : (
                      <span className="text-text-tertiary text-xs">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{feed.itemCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-red-500 hover:text-red-400" aria-label={`Delete ${feed.title}`}>
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
          <h2 className="text-lg font-semibold text-text-primary mb-2">No RSS feeds</h2>
          <p className="text-text-secondary text-sm">Add an RSS feed to start tracking new content releases.</p>
        </div>
      )}
    </div>
  );
}
