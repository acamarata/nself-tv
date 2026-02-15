'use client';

import { useState, useMemo } from 'react';
import { History, RotateCcw, Download } from 'lucide-react';
import { StateBadge } from '@/components/acquire/StateBadge';
import type { Download as DownloadType, DownloadState } from '@/types/acquisition';

type StatusFilter = 'all' | 'completed' | 'failed' | 'cancelled';

const MOCK_HISTORY: DownloadType[] = [
  {
    id: 'h1', familyId: 'f1', contentType: 'episode', title: 'Breaking Bad S05E15 - Granite State', state: 'completed', progress: 100, downloadSpeed: null, uploadSpeed: null, eta: null, size: 4294967296, downloadedBytes: 4294967296, sourceUrl: null, quality: 'bluray', error: null, retryCount: 0, stateHistory: [], createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 82800000).toISOString(),
  },
  {
    id: 'h2', familyId: 'f1', contentType: 'episode', title: 'Breaking Bad S05E14 - Ozymandias', state: 'completed', progress: 100, downloadSpeed: null, uploadSpeed: null, eta: null, size: 4509715660, downloadedBytes: 4509715660, sourceUrl: null, quality: 'bluray', error: null, retryCount: 0, stateHistory: [], createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 169200000).toISOString(),
  },
  {
    id: 'h3', familyId: 'f1', contentType: 'movie', title: 'Oppenheimer (2023)', state: 'completed', progress: 100, downloadSpeed: null, uploadSpeed: null, eta: null, size: 8589934592, downloadedBytes: 8589934592, sourceUrl: null, quality: 'remux', error: null, retryCount: 0, stateHistory: [], createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date(Date.now() - 252000000).toISOString(),
  },
  {
    id: 'h4', familyId: 'f1', contentType: 'episode', title: 'Severance S02E04 - Woe\'s Hollow', state: 'failed', progress: 72, downloadSpeed: null, uploadSpeed: null, eta: null, size: 3221225472, downloadedBytes: 2319282176, sourceUrl: null, quality: 'web-dl', error: 'Encoding failed: Unexpected codec format', retryCount: 3, stateHistory: [], createdAt: new Date(Date.now() - 345600000).toISOString(), updatedAt: new Date(Date.now() - 340000000).toISOString(),
  },
  {
    id: 'h5', familyId: 'f1', contentType: 'movie', title: 'Killers of the Flower Moon (2023)', state: 'completed', progress: 100, downloadSpeed: null, uploadSpeed: null, eta: null, size: 10737418240, downloadedBytes: 10737418240, sourceUrl: null, quality: 'remux', error: null, retryCount: 0, stateHistory: [], createdAt: new Date(Date.now() - 432000000).toISOString(), updatedAt: new Date(Date.now() - 421200000).toISOString(),
  },
  {
    id: 'h6', familyId: 'f1', contentType: 'episode', title: 'The Bear S02E10 - The Bear', state: 'completed', progress: 100, downloadSpeed: null, uploadSpeed: null, eta: null, size: 2684354560, downloadedBytes: 2684354560, sourceUrl: null, quality: 'web-dl', error: null, retryCount: 0, stateHistory: [], createdAt: new Date(Date.now() - 518400000).toISOString(), updatedAt: new Date(Date.now() - 514800000).toISOString(),
  },
  {
    id: 'h7', familyId: 'f1', contentType: 'movie', title: 'Poor Things (2023)', state: 'cancelled', progress: 22, downloadSpeed: null, uploadSpeed: null, eta: null, size: 6442450944, downloadedBytes: 1417339208, sourceUrl: null, quality: 'web-dl', error: null, retryCount: 0, stateHistory: [], createdAt: new Date(Date.now() - 604800000).toISOString(), updatedAt: new Date(Date.now() - 601200000).toISOString(),
  },
  {
    id: 'h8', familyId: 'f1', contentType: 'episode', title: 'Andor S01E12 - Rix Road', state: 'failed', progress: 90, downloadSpeed: null, uploadSpeed: null, eta: null, size: 3758096384, downloadedBytes: 3382286745, sourceUrl: null, quality: 'web-dl', error: 'Subtitle download timed out', retryCount: 1, stateHistory: [], createdAt: new Date(Date.now() - 691200000).toISOString(), updatedAt: new Date(Date.now() - 687600000).toISOString(),
  },
];

const PAGE_SIZE = 10;

function formatSize(bytes: number | null): string {
  if (!bytes) return '--';
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DownloadHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return MOCK_HISTORY;
    return MOCK_HISTORY.filter((d) => d.state === statusFilter);
  }, [statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleRetry = (id: string) => {
    // Will wire to useDownloads hook when plugins ready
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <History className="w-6 h-6" />
          Download History
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {paged.length > 0 ? (
        <>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50">
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Quality</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Size</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-text-secondary font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((dl) => (
                  <tr key={dl.id} className="border-b border-border hover:bg-surface-hover transition-colors" data-testid={`history-row-${dl.id}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary truncate max-w-[240px]">{dl.title}</p>
                      {dl.error && <p className="text-xs text-red-500 mt-0.5 truncate max-w-[240px]" title={dl.error}>{dl.error}</p>}
                    </td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{dl.contentType}</td>
                    <td className="px-4 py-3 text-text-secondary">{dl.quality}</td>
                    <td className="px-4 py-3"><StateBadge state={dl.state} /></td>
                    <td className="px-4 py-3 text-text-secondary">{formatSize(dl.size)}</td>
                    <td className="px-4 py-3 text-text-tertiary text-xs">{formatDate(dl.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {dl.state === 'failed' && (
                        <button
                          type="button"
                          onClick={() => handleRetry(dl.id)}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary-hover text-xs font-medium transition-colors"
                          aria-label={`Retry ${dl.title}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-text-tertiary">
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Download className="w-16 h-16 text-text-tertiary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No download history</h2>
          <p className="text-text-secondary text-sm">
            {statusFilter === 'all'
              ? 'Completed, failed, and cancelled downloads will appear here.'
              : `No ${statusFilter} downloads found.`}
          </p>
        </div>
      )}
    </div>
  );
}
