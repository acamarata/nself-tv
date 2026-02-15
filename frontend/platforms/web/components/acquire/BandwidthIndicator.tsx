import { ArrowDown, ArrowUp } from 'lucide-react';

interface BandwidthIndicatorProps {
  downloadSpeed: number;
  uploadSpeed: number;
  downloadLimit: number;
  uploadLimit: number;
}

function formatSpeed(kbps: number): string {
  if (kbps < 1024) return `${kbps} KB/s`;
  return `${(kbps / 1024).toFixed(1)} MB/s`;
}

export function BandwidthIndicator({ downloadSpeed, uploadSpeed, downloadLimit, uploadLimit }: BandwidthIndicatorProps) {
  const dlPercent = downloadLimit > 0 ? Math.min((downloadSpeed / downloadLimit) * 100, 100) : 0;
  const ulPercent = uploadLimit > 0 ? Math.min((uploadSpeed / uploadLimit) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-4" data-testid="bandwidth-indicator">
      <div className="flex items-center gap-2">
        <ArrowDown className="w-4 h-4 text-green-500" />
        <div className="w-24">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-text-primary">{formatSpeed(downloadSpeed)}</span>
            <span className="text-text-tertiary">{formatSpeed(downloadLimit)}</span>
          </div>
          <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${dlPercent}%` }} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ArrowUp className="w-4 h-4 text-blue-500" />
        <div className="w-24">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-text-primary">{formatSpeed(uploadSpeed)}</span>
            <span className="text-text-tertiary">{formatSpeed(uploadLimit)}</span>
          </div>
          <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${ulPercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
