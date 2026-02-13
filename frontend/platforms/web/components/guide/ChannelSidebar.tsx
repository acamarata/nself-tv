'use client';

import { Star } from 'lucide-react';
import type { LiveChannel } from '@/types/dvr';

export interface ChannelSidebarProps {
  /** List of channels to display */
  channels: LiveChannel[];
  /** Currently selected channel ID */
  selectedChannelId?: string;
  /** Called when a channel row is clicked */
  onChannelClick?: (channel: LiveChannel) => void;
}

/**
 * Left sidebar in the EPG grid showing channel logos, numbers, and names.
 */
function ChannelSidebar({ channels, selectedChannelId, onChannelClick }: ChannelSidebarProps) {
  return (
    <div className="flex-shrink-0 w-48 bg-surface border-r border-border" data-testid="channel-sidebar">
      {/* Header spacer to align with time header */}
      <div className="h-10 border-b border-border" />

      {/* Channel rows */}
      {channels.map((channel) => {
        const isSelected = channel.id === selectedChannelId;

        return (
          <button
            key={channel.id}
            type="button"
            className={`w-full h-12 flex items-center gap-2 px-3 border-b border-border transition-colors ${
              isSelected
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-surface-hover'
            }`}
            onClick={() => onChannelClick?.(channel)}
            data-testid={`channel-${channel.id}`}
          >
            {/* Channel logo or number */}
            {channel.logoUrl ? (
              <img
                src={channel.logoUrl}
                alt={channel.name}
                className="w-6 h-6 rounded object-contain flex-shrink-0"
              />
            ) : (
              <span className="w-6 h-6 rounded bg-surface-hover flex items-center justify-center text-xs font-bold flex-shrink-0">
                {channel.number}
              </span>
            )}

            <span className="text-sm font-medium truncate">{channel.name}</span>

            {channel.isFavorite && (
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0 ml-auto" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { ChannelSidebar };
