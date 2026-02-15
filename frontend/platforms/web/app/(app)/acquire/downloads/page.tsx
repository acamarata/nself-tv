'use client';

import { useState, useMemo } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { DownloadCard } from '@/components/acquire/DownloadCard';
import type { Download as DownloadType, DownloadState } from '@/types/acquisition';

type FilterTab = 'all' | 'downloading' | 'encoding' | 'subtitles';

const MOCK_DOWNLOADS: DownloadType[] = [
  {
    id: 'd1',
    familyId: 'f1',
    contentType: 'episode',
    title: 'Breaking Bad S05E16 - Felina',
    state: 'downloading',
    progress: 64,
    downloadSpeed: 12582912,
    uploadSpeed: 1048576,
    eta: 420,
    size: 4509715660,
    downloadedBytes: 2886220826,
    sourceUrl: 'magnet:?xt=urn:btih:abc123',
    quality: 'bluray',
    error: null,
    retryCount: 0,
    stateHistory: [
      { state: 'created', timestamp: new Date(Date.now() - 3600000).toISOString(), duration: 2000, error: null },
      { state: 'vpn_connecting', timestamp: new Date(Date.now() - 3598000).toISOString(), duration: 5000, error: null },
      { state: 'searching', timestamp: new Date(Date.now() - 3593000).toISOString(), duration: 15000, error: null },
      { state: 'downloading', timestamp: new Date(Date.now() - 3578000).toISOString(), duration: null, error: null },
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd2',
    familyId: 'f1',
    contentType: 'movie',
    title: 'Dune: Part Two (2024)',
    state: 'encoding',
    progress: 38,
    downloadSpeed: null,
    uploadSpeed: null,
    eta: 900,
    size: 8589934592,
    downloadedBytes: 8589934592,
    sourceUrl: 'magnet:?xt=urn:btih:def456',
    quality: 'remux',
    error: null,
    retryCount: 0,
    stateHistory: [
      { state: 'created', timestamp: new Date(Date.now() - 7200000).toISOString(), duration: 1500, error: null },
      { state: 'vpn_connecting', timestamp: new Date(Date.now() - 7198500).toISOString(), duration: 3000, error: null },
      { state: 'searching', timestamp: new Date(Date.now() - 7195500).toISOString(), duration: 8000, error: null },
      { state: 'downloading', timestamp: new Date(Date.now() - 7187500).toISOString(), duration: 3600000, error: null },
      { state: 'encoding', timestamp: new Date(Date.now() - 3587500).toISOString(), duration: null, error: null },
    ],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd3',
    familyId: 'f1',
    contentType: 'episode',
    title: 'The Bear S03E01 - Tomorrow',
    state: 'subtitles',
    progress: 85,
    downloadSpeed: null,
    uploadSpeed: null,
    eta: 120,
    size: 2147483648,
    downloadedBytes: 2147483648,
    sourceUrl: 'magnet:?xt=urn:btih:ghi789',
    quality: 'web-dl',
    error: null,
    retryCount: 0,
    stateHistory: [
      { state: 'created', timestamp: new Date(Date.now() - 5400000).toISOString(), duration: 1000, error: null },
      { state: 'vpn_connecting', timestamp: new Date(Date.now() - 5399000).toISOString(), duration: 4000, error: null },
      { state: 'searching', timestamp: new Date(Date.now() - 5395000).toISOString(), duration: 6000, error: null },
      { state: 'downloading', timestamp: new Date(Date.now() - 5389000).toISOString(), duration: 2400000, error: null },
      { state: 'encoding', timestamp: new Date(Date.now() - 2989000).toISOString(), duration: 1800000, error: null },
      { state: 'subtitles', timestamp: new Date(Date.now() - 1189000).toISOString(), duration: null, error: null },
    ],
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd4',
    familyId: 'f1',
    contentType: 'episode',
    title: 'Severance S02E05 - Trojan Horse',
    state: 'downloading',
    progress: 12,
    downloadSpeed: 5242880,
    uploadSpeed: 524288,
    eta: 1800,
    size: 3221225472,
    downloadedBytes: 386547056,
    sourceUrl: 'magnet:?xt=urn:btih:jkl012',
    quality: 'web-dl',
    error: null,
    retryCount: 0,
    stateHistory: [
      { state: 'created', timestamp: new Date(Date.now() - 600000).toISOString(), duration: 2000, error: null },
      { state: 'vpn_connecting', timestamp: new Date(Date.now() - 598000).toISOString(), duration: 6000, error: null },
      { state: 'searching', timestamp: new Date(Date.now() - 592000).toISOString(), duration: 12000, error: null },
      { state: 'downloading', timestamp: new Date(Date.now() - 580000).toISOString(), duration: null, error: null },
    ],
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd5',
    familyId: 'f1',
    contentType: 'movie',
    title: 'Civil War (2024)',
    state: 'failed',
    progress: 45,
    downloadSpeed: null,
    uploadSpeed: null,
    eta: null,
    size: 6442450944,
    downloadedBytes: 2899102720,
    sourceUrl: 'magnet:?xt=urn:btih:mno345',
    quality: 'web-dl',
    error: 'Encoding failed: FFmpeg timeout after 30 minutes',
    retryCount: 2,
    stateHistory: [
      { state: 'created', timestamp: new Date(Date.now() - 86400000).toISOString(), duration: 1500, error: null },
      { state: 'downloading', timestamp: new Date(Date.now() - 86398500).toISOString(), duration: 7200000, error: null },
      { state: 'encoding', timestamp: new Date(Date.now() - 79198500).toISOString(), duration: 1800000, error: 'FFmpeg timeout' },
      { state: 'failed', timestamp: new Date(Date.now() - 77398500).toISOString(), duration: null, error: 'Encoding failed: FFmpeg timeout after 30 minutes' },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 77398500).toISOString(),
  },
];

const TAB_STATES: Record<FilterTab, DownloadState[]> = {
  all: [],
  downloading: ['created', 'vpn_connecting', 'searching', 'downloading'],
  encoding: ['encoding'],
  subtitles: ['subtitles'],
};

export default function DownloadsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [downloads] = useState(MOCK_DOWNLOADS);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return downloads;
    const states = TAB_STATES[activeTab];
    return downloads.filter((d) => states.includes(d.state));
  }, [downloads, activeTab]);

  const tabs: { key: FilterTab; label: string; count: number }[] = useMemo(() => {
    return [
      { key: 'all', label: 'All', count: downloads.length },
      { key: 'downloading', label: 'Downloading', count: downloads.filter((d) => TAB_STATES.downloading.includes(d.state)).length },
      { key: 'encoding', label: 'Encoding', count: downloads.filter((d) => d.state === 'encoding').length },
      { key: 'subtitles', label: 'Subtitles', count: downloads.filter((d) => d.state === 'subtitles').length },
    ];
  }, [downloads]);

  const handlePause = (id: string) => {
    // Will wire to useDownloads hook when plugins ready
  };
  const handleResume = (id: string) => {
    // Will wire to useDownloads hook when plugins ready
  };
  const handleCancel = (id: string) => {
    // Will wire to useDownloads hook when plugins ready
  };
  const handleRetry = (id: string) => {
    // Will wire to useDownloads hook when plugins ready
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Active Downloads</h1>
        <button
          type="button"
          className="p-2 bg-surface border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors"
          aria-label="Refresh downloads"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs bg-surface-hover px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Download cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="downloads-grid">
          {filtered.map((dl) => (
            <DownloadCard
              key={dl.id}
              download={dl}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onRetry={handleRetry}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Download className="w-16 h-16 text-text-tertiary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No active downloads</h2>
          <p className="text-text-secondary text-sm">
            {activeTab === 'all'
              ? 'No downloads in progress. Subscribe to shows or monitor movies to start.'
              : `No downloads in the "${activeTab}" stage right now.`}
          </p>
        </div>
      )}
    </div>
  );
}
