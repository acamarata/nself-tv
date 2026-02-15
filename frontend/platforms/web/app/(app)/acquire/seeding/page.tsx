'use client';

import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, HardDrive, Star, Leaf } from 'lucide-react';
import type { SeedingStats, SeedingAggregate } from '@/types/acquisition';

const MOCK_STATS: SeedingStats[] = [
  { id: 'sd1', torrentHash: 'abc123def456', name: 'Breaking Bad S05E16 - Felina [BluRay-1080p]', ratio: 2.45, uploaded: 10468982784, downloaded: 4294967296, seedingDuration: 604800, isFavorite: true, seedRatioLimit: 3.0, seedTimeLimitMinutes: 10080 },
  { id: 'sd2', torrentHash: 'def456ghi789', name: 'Oppenheimer (2023) [Remux-4K]', ratio: 1.82, uploaded: 15616364134, downloaded: 8589934592, seedingDuration: 432000, isFavorite: false, seedRatioLimit: 2.0, seedTimeLimitMinutes: 10080 },
  { id: 'sd3', torrentHash: 'ghi789jkl012', name: 'The Bear S03E01 [WEB-DL-1080p]', ratio: 0.64, uploaded: 1374389534, downloaded: 2147483648, seedingDuration: 86400, isFavorite: false, seedRatioLimit: 2.0, seedTimeLimitMinutes: 10080 },
  { id: 'sd4', torrentHash: 'jkl012mno345', name: 'Dune Part Two (2024) [BluRay-4K]', ratio: 3.12, uploaded: 26756260618, downloaded: 8589934592, seedingDuration: 864000, isFavorite: true, seedRatioLimit: 3.0, seedTimeLimitMinutes: 20160 },
  { id: 'sd5', torrentHash: 'mno345pqr678', name: 'Severance S02E04 [WEB-DL-1080p]', ratio: 1.05, uploaded: 3382286745, downloaded: 3221225472, seedingDuration: 259200, isFavorite: false, seedRatioLimit: 2.0, seedTimeLimitMinutes: 10080 },
  { id: 'sd6', torrentHash: 'pqr678stu901', name: 'Killers of the Flower Moon (2023) [Remux-4K]', ratio: 1.98, uploaded: 21260528025, downloaded: 10737418240, seedingDuration: 518400, isFavorite: true, seedRatioLimit: 2.5, seedTimeLimitMinutes: 14400 },
];

const MOCK_AGGREGATE: SeedingAggregate = {
  totalUploaded: 78858811840,
  totalDownloaded: 37580963840,
  averageRatio: 1.84,
  activeTorrents: 6,
  completedTorrents: 42,
};

function formatSize(bytes: number): string {
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)} MB`;
  if (bytes < 1099511627776) return `${(bytes / 1073741824).toFixed(1)} GB`;
  return `${(bytes / 1099511627776).toFixed(2)} TB`;
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function ratioColor(ratio: number): string {
  if (ratio >= 2.0) return 'text-green-500';
  if (ratio >= 1.0) return 'text-yellow-500';
  return 'text-red-500';
}

type SortField = 'name' | 'ratio' | 'uploaded' | 'duration';

export default function SeedingPage() {
  const [sortBy, setSortBy] = useState<SortField>('ratio');
  const [sortDesc, setSortDesc] = useState(true);
  const [stats] = useState(MOCK_STATS);
  const aggregate = MOCK_AGGREGATE;

  const sorted = useMemo(() => {
    const items = [...stats];
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'ratio': cmp = a.ratio - b.ratio; break;
        case 'uploaded': cmp = a.uploaded - b.uploaded; break;
        case 'duration': cmp = a.seedingDuration - b.seedingDuration; break;
      }
      return sortDesc ? -cmp : cmp;
    });
    return items;
  }, [stats, sortBy, sortDesc]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDesc((d) => !d);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortBy !== field) return null;
    return sortDesc ? ' \u2193' : ' \u2191';
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Leaf className="w-6 h-6" />
          Seeding
        </h1>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-text-tertiary">Total Uploaded</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{formatSize(aggregate.totalUploaded)}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDown className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-text-tertiary">Total Downloaded</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{formatSize(aggregate.totalDownloaded)}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-tertiary">Average Ratio</span>
          </div>
          <p className={`text-xl font-bold ${ratioColor(aggregate.averageRatio)}`}>{aggregate.averageRatio.toFixed(2)}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <HardDrive className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-text-tertiary">Active Torrents</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{aggregate.activeTorrents}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-tertiary">Completed</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{aggregate.completedTorrents}</p>
        </div>
      </div>

      {/* Seeding table */}
      {sorted.length > 0 ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50">
                <th className="w-8 px-2 py-3" />
                <th
                  className="text-left px-4 py-3 text-text-secondary font-medium cursor-pointer hover:text-text-primary select-none"
                  onClick={() => handleSort('name')}
                >
                  Name{sortIndicator('name')}
                </th>
                <th
                  className="text-left px-4 py-3 text-text-secondary font-medium cursor-pointer hover:text-text-primary select-none"
                  onClick={() => handleSort('ratio')}
                >
                  Ratio{sortIndicator('ratio')}
                </th>
                <th
                  className="text-left px-4 py-3 text-text-secondary font-medium cursor-pointer hover:text-text-primary select-none"
                  onClick={() => handleSort('uploaded')}
                >
                  Uploaded{sortIndicator('uploaded')}
                </th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Downloaded</th>
                <th
                  className="text-left px-4 py-3 text-text-secondary font-medium cursor-pointer hover:text-text-primary select-none"
                  onClick={() => handleSort('duration')}
                >
                  Seeding Time{sortIndicator('duration')}
                </th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Limit</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-surface-hover transition-colors" data-testid={`seed-row-${item.id}`}>
                  <td className="px-2 py-3 text-center">
                    {item.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mx-auto" />}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary truncate max-w-[300px]" title={item.name}>{item.name}</p>
                    <p className="text-xs text-text-tertiary mt-0.5 font-mono">{item.torrentHash.substring(0, 12)}...</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${ratioColor(item.ratio)}`}>{item.ratio.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <span className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-green-500" />
                      {formatSize(item.uploaded)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <span className="flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-blue-500" />
                      {formatSize(item.downloaded)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatDuration(item.seedingDuration)}</td>
                  <td className="px-4 py-3 text-text-tertiary text-xs">
                    {item.seedRatioLimit.toFixed(1)}x / {Math.floor(item.seedTimeLimitMinutes / 60 / 24)}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Leaf className="w-16 h-16 text-text-tertiary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No active seeds</h2>
          <p className="text-text-secondary text-sm">Completed downloads will appear here for seeding.</p>
        </div>
      )}
    </div>
  );
}
