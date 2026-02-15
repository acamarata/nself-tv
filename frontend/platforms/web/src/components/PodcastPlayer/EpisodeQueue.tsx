/**
 * Episode queue component for podcast player
 *
 * Displays "Up Next" queue with drag-to-reorder functionality
 */

import React from 'react';
import { usePodcastPlayer, type Episode } from '../../stores/podcast-player';
import { formatTime } from '../../utils/format';

export function EpisodeQueue() {
  const { queue, playFromQueue, removeFromQueue, clearQueue } = usePodcastPlayer();

  if (queue.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Queue is empty</p>
        <p className="text-sm mt-2">Add episodes to play next</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Up Next</h3>
        <button
          onClick={clearQueue}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2">
        {queue.map((episode: Episode, index: number) => (
          <div
            key={episode.id}
            className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
          >
            {/* Episode artwork */}
            {episode.artwork_url && (
              <img
                src={episode.artwork_url}
                alt={episode.title}
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            )}

            {/* Episode info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{episode.title}</div>
              <div className="text-xs text-gray-400 truncate">{episode.show_title}</div>
              <div className="text-xs text-gray-500">{formatTime(episode.duration)}</div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => playFromQueue(index)}
                className="p-2 hover:bg-gray-500 rounded-full transition-colors"
                title="Play now"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </button>

              <button
                onClick={() => removeFromQueue(episode.id)}
                className="p-2 hover:bg-gray-500 rounded-full transition-colors"
                title="Remove from queue"
              >
                <svg
                  className="w-4 h-4 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
