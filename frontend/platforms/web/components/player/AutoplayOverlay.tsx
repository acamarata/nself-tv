'use client';

import type { NextEpisodeInfo } from '@/hooks/useAutoplayNext';

interface AutoplayOverlayProps {
  nextEpisode: NextEpisodeInfo;
  countdown: number;
  onPlay: () => void;
  onCancel: () => void;
}

/**
 * Displays a "Next Episode" prompt with countdown timer overlaid on the player.
 *
 * Positioned at the bottom-right of the player with a semi-transparent backdrop.
 * Shows episode thumbnail (when available), title in S0XE0X format, countdown,
 * and action buttons.
 */
export function AutoplayOverlay({ nextEpisode, countdown, onPlay, onCancel }: AutoplayOverlayProps) {
  const episodeLabel = `S${String(nextEpisode.seasonNumber).padStart(2, '0')}E${String(nextEpisode.episodeNumber).padStart(2, '0')}`;

  return (
    <div className="absolute bottom-20 right-4 z-50 flex w-80 overflow-hidden rounded-lg bg-black/80 shadow-2xl backdrop-blur-sm">
      {/* Thumbnail */}
      {nextEpisode.stillUrl && (
        <div className="relative h-24 w-40 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nextEpisode.stillUrl}
            alt={nextEpisode.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-3">
        {/* Episode info */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Up Next
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white line-clamp-1">
            {nextEpisode.title}
          </p>
          <p className="text-xs text-gray-400">
            {episodeLabel}
          </p>
        </div>

        {/* Countdown */}
        <p className="mt-1 text-xs text-gray-300">
          Playing in{' '}
          <span className="font-mono font-bold text-white">{countdown}</span>s
        </p>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onPlay}
            className="rounded bg-white px-3 py-1 text-xs font-semibold text-black transition-colors hover:bg-gray-200"
          >
            Play Now
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1 text-xs font-semibold text-gray-300 transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
