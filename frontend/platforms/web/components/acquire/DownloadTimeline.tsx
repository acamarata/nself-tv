import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { DownloadStateEntry } from '@/types/acquisition';
import { StateBadge } from './StateBadge';

function formatDuration(ms: number | null): string {
  if (!ms) return '--';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

interface DownloadTimelineProps {
  entries: DownloadStateEntry[];
}

export function DownloadTimeline({ entries }: DownloadTimelineProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="download-timeline">
      {entries.map((entry, i) => (
        <div key={`${entry.state}-${entry.timestamp}`} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            {entry.error ? (
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
            {i < entries.length - 1 && (
              <div className="w-px h-6 bg-border mt-1" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <StateBadge state={entry.state} />
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(entry.duration)}
              </span>
            </div>
            {entry.error && (
              <p className="text-xs text-red-500 mt-1 truncate" title={entry.error}>
                {entry.error}
              </p>
            )}
            <p className="text-xs text-text-tertiary mt-0.5">
              {new Date(entry.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
