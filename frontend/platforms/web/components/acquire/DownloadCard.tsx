import { Pause, Play, X, RotateCcw, ArrowDown, ArrowUp } from 'lucide-react';
import { StateBadge } from './StateBadge';
import type { Download } from '@/types/acquisition';

function formatSpeed(bytesPerSec: number | null): string {
  if (!bytesPerSec) return '--';
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1048576) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '--';
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function formatEta(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface DownloadCardProps {
  download: Download;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}

export function DownloadCard({ download, onPause, onResume, onCancel, onRetry }: DownloadCardProps) {
  const isActive = !['completed', 'failed', 'cancelled'].includes(download.state);
  const isPaused = download.state === 'created'; // simplified
  const canRetry = download.state === 'failed';

  return (
    <div className="bg-surface border border-border rounded-xl p-4" data-testid={`download-card-${download.id}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">{download.title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{download.contentType}</p>
        </div>
        <StateBadge state={download.state} />
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
            <span>{Math.round(download.progress)}%</span>
            <span>{formatSize(download.downloadedBytes)} / {formatSize(download.size)}</span>
          </div>
          <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.min(download.progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Speed and ETA */}
      {download.state === 'downloading' && (
        <div className="flex items-center gap-4 text-xs text-text-tertiary mb-3">
          <span className="flex items-center gap-1">
            <ArrowDown className="w-3 h-3" />
            {formatSpeed(download.downloadSpeed)}
          </span>
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            {formatSpeed(download.uploadSpeed)}
          </span>
          <span>ETA: {formatEta(download.eta)}</span>
        </div>
      )}

      {/* Error */}
      {download.error && (
        <p className="text-xs text-red-500 mb-3 truncate" title={download.error}>
          {download.error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isActive && download.state === 'downloading' && onPause && (
          <button
            type="button"
            onClick={() => onPause(download.id)}
            className="p-1.5 rounded-lg bg-surface-hover hover:bg-surface text-text-secondary transition-colors"
            aria-label="Pause"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
        {isPaused && onResume && (
          <button
            type="button"
            onClick={() => onResume(download.id)}
            className="p-1.5 rounded-lg bg-surface-hover hover:bg-surface text-text-secondary transition-colors"
            aria-label="Resume"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
        {isActive && onCancel && (
          <button
            type="button"
            onClick={() => onCancel(download.id)}
            className="p-1.5 rounded-lg bg-surface-hover hover:bg-surface text-red-500 transition-colors"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {canRetry && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(download.id)}
            className="p-1.5 rounded-lg bg-surface-hover hover:bg-surface text-primary transition-colors"
            aria-label="Retry"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
