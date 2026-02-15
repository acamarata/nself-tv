/**
 * Chapter list component for podcast player
 *
 * Displays chapters with navigation controls
 */

import React from 'react';
import { usePodcastPlayer } from '../../stores/podcast-player';
import { formatTime } from '../../utils/format';

export function ChapterList() {
  const { chapters, currentChapter, seekToChapter } = usePodcastPlayer();

  if (chapters.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No chapters available for this episode</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Chapters</h3>
      <div className="space-y-2">
        {chapters.map((chapter, index) => {
          const isActive = currentChapter?.start_time === chapter.start_time;

          return (
            <button
              key={index}
              onClick={() => seekToChapter(chapter)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                {chapter.image && (
                  <img
                    src={chapter.image}
                    alt={chapter.title}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{chapter.title}</div>
                  <div className="text-sm opacity-75">{formatTime(chapter.start_time)}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
