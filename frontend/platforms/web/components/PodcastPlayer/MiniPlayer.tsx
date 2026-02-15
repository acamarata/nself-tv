/**
 * Mini podcast player - Bottom bar with basic controls
 *
 * Persistent player bar shown at bottom of screen when episode is playing
 */

import React from 'react';
import { usePodcastPlayer } from '../../stores/podcast-player';
import { formatTime } from '../../utils/format';

export function MiniPlayer() {
  const {
    currentEpisode,
    playing,
    currentTime,
    duration,
    play,
    pause,
    resume,
    skipForward,
    skipBackward,
    seek,
    openFullPlayer,
  } = usePodcastPlayer();

  if (!currentEpisode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    seek(newTime);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
      {/* Progress bar */}
      <div
        className="h-1 bg-gray-700 cursor-pointer hover:h-2 transition-all"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        {/* Artwork and episode info */}
        <button
          onClick={openFullPlayer}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-gray-800 rounded-lg p-2 transition-colors"
        >
          {currentEpisode.artwork_url && (
            <img
              src={currentEpisode.artwork_url}
              alt={currentEpisode.title}
              className="w-12 h-12 rounded object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {currentEpisode.title}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {currentEpisode.show_title}
            </div>
          </div>
        </button>

        {/* Playback controls */}
        <div className="flex items-center gap-2">
          {/* Skip backward */}
          <button
            onClick={() => skipBackward(15)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            title="Skip backward 15s"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
            <span className="sr-only">Skip backward 15 seconds</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={playing ? pause : resume}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
          >
            {playing ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4h2v12H6V4zm6 0h2v12h-2V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
            <span className="sr-only">{playing ? 'Pause' : 'Play'}</span>
          </button>

          {/* Skip forward */}
          <button
            onClick={() => skipForward(30)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            title="Skip forward 30s"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM11.445 7.168A1 1 0 0013 8v4a1 1 0 01-1.555.832l-3-2a1 1 0 010-1.664l3-2z" />
            </svg>
            <span className="sr-only">Skip forward 30 seconds</span>
          </button>
        </div>

        {/* Time display */}
        <div className="text-sm text-gray-400 tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
