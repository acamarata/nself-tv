'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Play,
  Trash2,
  Film,
  Clock,
  HardDrive,
  LayoutGrid,
  List,
  AlertCircle,
  CheckCircle,
  Circle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { DVRRecording, RecordingStatus } from '@/types/dvr';

// ---- Mock Data ----

const MOCK_RECORDINGS: DVRRecording[] = [
  {
    id: 'rec-1',
    eventId: 'evt-1',
    title: 'NFL Sunday: Eagles vs Cowboys',
    channelName: 'FOX 5',
    status: 'ready',
    startTime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() - 86400000 + 10800000).toISOString(),
    duration: 10800,
    size: 8_500_000_000,
    hasCommercials: true,
    commercialMarkers: [
      { startMs: 900000, endMs: 1080000, confidence: 0.95, source: 'comskip' },
      { startMs: 2700000, endMs: 2880000, confidence: 0.82, source: 'comskip' },
    ],
  },
  {
    id: 'rec-2',
    eventId: 'evt-2',
    title: 'Evening News',
    channelName: 'WCBS',
    status: 'ready',
    startTime: new Date(Date.now() - 43200000).toISOString(),
    endTime: new Date(Date.now() - 43200000 + 3600000).toISOString(),
    duration: 3600,
    size: 2_100_000_000,
    hasCommercials: false,
    commercialMarkers: [],
  },
  {
    id: 'rec-3',
    eventId: 'evt-3',
    title: 'Late Night Comedy',
    channelName: 'WNBC',
    status: 'recording',
    startTime: new Date(Date.now() - 1800000).toISOString(),
    endTime: new Date(Date.now() + 1800000).toISOString(),
    duration: 3600,
    size: 900_000_000,
    hasCommercials: true,
    commercialMarkers: [
      { startMs: 600000, endMs: 780000, confidence: 0.75, source: 'comskip' },
    ],
  },
  {
    id: 'rec-4',
    eventId: 'evt-4',
    title: 'Morning Show',
    channelName: 'WABC',
    status: 'scheduled',
    startTime: new Date(Date.now() + 43200000).toISOString(),
    endTime: new Date(Date.now() + 43200000 + 7200000).toISOString(),
    duration: 7200,
    size: 0,
    hasCommercials: false,
    commercialMarkers: [],
  },
  {
    id: 'rec-5',
    eventId: 'evt-5',
    title: 'Science Documentary',
    channelName: 'WNET',
    status: 'processing',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 3600000).toISOString(),
    duration: 3600,
    size: 2_800_000_000,
    hasCommercials: true,
    commercialMarkers: [],
  },
  {
    id: 'rec-6',
    eventId: 'evt-6',
    title: 'Kids Cartoon Block',
    channelName: 'WLIW',
    status: 'failed',
    startTime: new Date(Date.now() - 172800000).toISOString(),
    endTime: new Date(Date.now() - 172800000 + 5400000).toISOString(),
    duration: 5400,
    size: 0,
    hasCommercials: false,
    commercialMarkers: [],
  },
];

// ---- Helpers ----

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '--';
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: RecordingStatus) {
  const config: Record<RecordingStatus, { icon: React.ReactNode; color: string; label: string }> = {
    scheduled: { icon: <Calendar className="w-3 h-3" />, color: 'bg-blue-500/10 text-blue-500', label: 'Scheduled' },
    recording: { icon: <Circle className="w-3 h-3 fill-red-500 text-red-500" />, color: 'bg-red-500/10 text-red-500', label: 'Recording' },
    processing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'bg-yellow-500/10 text-yellow-500', label: 'Processing' },
    ready: { icon: <CheckCircle className="w-3 h-3" />, color: 'bg-green-500/10 text-green-500', label: 'Ready' },
    failed: { icon: <AlertCircle className="w-3 h-3" />, color: 'bg-red-500/10 text-red-500', label: 'Failed' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function commercialIndicator(recording: DVRRecording) {
  if (recording.status !== 'ready') return null;
  if (!recording.hasCommercials) {
    return (
      <span className="text-green-500 text-xs" title="No commercials" data-testid="commercial-clean">
        Clean
      </span>
    );
  }
  return (
    <span className="text-yellow-500 text-xs" title="Has commercials" data-testid="commercial-detected">
      Commercials
    </span>
  );
}

// ---- Filters ----

type StatusFilter = 'all' | RecordingStatus;
type SortField = 'date' | 'title' | 'size';

// ---- Component ----

export default function RecordingsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const recordings = useMemo(() => {
    let filtered = MOCK_RECORDINGS;
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });

    return sorted;
  }, [statusFilter, sortBy]);

  const handleDelete = useCallback((id: string) => {
    setDeleteTarget(null);
    // In a real app, this would delete the recording
  }, []);

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Recordings</h1>
          <p className="text-sm text-text-tertiary mt-1">{recordings.length} recordings</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="recording">Recording</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready</option>
            <option value="failed">Failed</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Sort by"
          >
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="size">Size</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="recordings-grid">
          {recordings.map((rec) => (
            <div key={rec.id} className="bg-surface border border-border rounded-xl overflow-hidden" data-testid={`recording-card-${rec.id}`}>
              {/* Thumbnail placeholder */}
              <div className="aspect-video bg-surface-hover flex items-center justify-center relative">
                <Film className="w-8 h-8 text-text-tertiary" />
                {rec.status === 'ready' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors cursor-pointer group">
                    <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-text-primary truncate">{rec.title}</h3>
                <p className="text-xs text-text-secondary mt-1">{rec.channelName}</p>
                <p className="text-xs text-text-tertiary mt-1">{formatDate(rec.startTime)}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    {statusBadge(rec.status)}
                    {commercialIndicator(rec)}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(rec.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {formatSize(rec.size)}
                  </span>
                </div>
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(rec.id)}
                  className="mt-3 text-xs text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  aria-label={`Delete ${rec.title}`}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden" data-testid="recordings-list">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50">
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Channel</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Date</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Duration</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Size</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Ads</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((rec) => (
                <tr key={rec.id} className="border-b border-border hover:bg-surface-hover transition-colors" data-testid={`recording-row-${rec.id}`}>
                  <td className="px-4 py-3 font-medium text-text-primary">{rec.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{rec.channelName}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{formatDate(rec.startTime)}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDuration(rec.duration)}</td>
                  <td className="px-4 py-3">{statusBadge(rec.status)}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatSize(rec.size)}</td>
                  <td className="px-4 py-3">{commercialIndicator(rec)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {rec.status === 'ready' && (
                        <button
                          type="button"
                          className="text-primary hover:text-primary-hover transition-colors"
                          aria-label={`Play ${rec.title}`}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(rec.id)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                        aria-label={`Delete ${rec.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {recordings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Film className="w-16 h-16 text-text-tertiary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No recordings found</h2>
          <p className="text-text-secondary text-sm">
            Try changing your filters or schedule a new recording from the Channel Guide.
          </p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
          data-testid="delete-modal"
        >
          <div
            className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
          >
            <h3 className="text-lg font-bold text-text-primary mb-2">Delete Recording?</h3>
            <p className="text-sm text-text-secondary mb-6">
              This action cannot be undone. The recording will be permanently removed.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="danger" onClick={() => handleDelete(deleteTarget)} className="flex-1">
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
