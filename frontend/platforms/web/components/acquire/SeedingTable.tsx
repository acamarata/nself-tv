'use client';

import { useState } from 'react';
import { Star, ArrowUp } from 'lucide-react';
import type { SeedingStats, SeedingAggregate } from '@/types/acquisition';

function formatSize(bytes: number): string {
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

interface SeedingTableProps {
  stats: SeedingStats[];
  aggregate: SeedingAggregate | null;
  onUpdatePolicy: (hash: string, policy: { seedRatioLimit?: number; seedTimeLimitMinutes?: number; isFavorite?: boolean }) => Promise<void>;
}

export function SeedingTable({ stats, aggregate, onUpdatePolicy }: SeedingTableProps) {
  const [editingHash, setEditingHash] = useState<string | null>(null);
  const [editRatio, setEditRatio] = useState(2.0);

  const startEdit = (s: SeedingStats) => { setEditingHash(s.torrentHash); setEditRatio(s.seedRatioLimit); };
  const saveEdit = async (hash: string) => {
    await onUpdatePolicy(hash, { seedRatioLimit: editRatio });
    setEditingHash(null);
  };

  return (
    <div data-testid="seeding-table">
      {/* Aggregate stats */}
      {aggregate && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface border border-border rounded-lg p-3">
            <p className="text-xs text-text-tertiary">Total Uploaded</p>
            <p className="text-lg font-bold text-text-primary">{formatSize(aggregate.totalUploaded)}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3">
            <p className="text-xs text-text-tertiary">Avg Ratio</p>
            <p className="text-lg font-bold text-text-primary">{aggregate.averageRatio.toFixed(2)}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3">
            <p className="text-xs text-text-tertiary">Active</p>
            <p className="text-lg font-bold text-text-primary">{aggregate.activeTorrents}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3">
            <p className="text-xs text-text-tertiary">Completed</p>
            <p className="text-lg font-bold text-text-primary">{aggregate.completedTorrents}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover/50">
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Ratio</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Uploaded</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Duration</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Limit</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Fav</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.torrentHash} className="border-b border-border hover:bg-surface-hover transition-colors" data-testid={`seeding-row-${s.torrentHash}`}>
                <td className="px-4 py-3 text-text-primary truncate max-w-[200px]">{s.name}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${s.ratio >= s.seedRatioLimit ? 'text-green-500' : 'text-text-primary'}`}>
                    {s.ratio.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" /> {formatSize(s.uploaded)}
                </td>
                <td className="px-4 py-3 text-text-secondary">{formatDuration(s.seedingDuration)}</td>
                <td className="px-4 py-3">
                  {editingHash === s.torrentHash ? (
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.1" min="0" value={editRatio} onChange={(e) => setEditRatio(Number(e.target.value))} className="w-16 px-1 py-0.5 bg-surface border border-border rounded text-xs" />
                      <button type="button" onClick={() => saveEdit(s.torrentHash)} className="text-xs text-primary">Save</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(s)} className="text-xs text-text-secondary hover:text-text-primary">
                      {s.seedRatioLimit.toFixed(1)}x
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onUpdatePolicy(s.torrentHash, { isFavorite: !s.isFavorite })}
                    className="p-1"
                    aria-label={s.isFavorite ? 'Unmark favorite' : 'Mark favorite'}
                  >
                    <Star className={`w-4 h-4 ${s.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-text-tertiary'}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
