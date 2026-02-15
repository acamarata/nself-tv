import type { DownloadState } from '@/types/acquisition';

const STATE_CONFIG: Record<DownloadState, { label: string; color: string }> = {
  created: { label: 'Created', color: 'bg-gray-500/10 text-gray-500' },
  vpn_connecting: { label: 'VPN', color: 'bg-blue-500/10 text-blue-500' },
  searching: { label: 'Searching', color: 'bg-blue-500/10 text-blue-400' },
  downloading: { label: 'Downloading', color: 'bg-yellow-500/10 text-yellow-500' },
  encoding: { label: 'Encoding', color: 'bg-purple-500/10 text-purple-500' },
  subtitles: { label: 'Subtitles', color: 'bg-indigo-500/10 text-indigo-500' },
  uploading: { label: 'Uploading', color: 'bg-cyan-500/10 text-cyan-500' },
  finalizing: { label: 'Finalizing', color: 'bg-teal-500/10 text-teal-500' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500' },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-400' },
};

interface StateBadgeProps {
  state: DownloadState;
}

export function StateBadge({ state }: StateBadgeProps) {
  const config = STATE_CONFIG[state];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      data-testid={`state-badge-${state}`}
    >
      {config.label}
    </span>
  );
}
