/**
 * Full podcast player - Modal with complete controls
 *
 * Expanded player with artwork, all controls, chapters, and queue
 */

import React, { useState } from 'react';
import { usePodcastPlayer } from '../../stores/podcast-player';
import { formatTime } from '../../utils/format';
import { ChapterList } from './ChapterList';
import { EpisodeQueue } from './EpisodeQueue';

export function FullPlayer() {
  const {
    currentEpisode,
    playing,
    currentTime,
    duration,
    playbackRate,
    volume,
    sleepTimerEnd,
    fullPlayerOpen,
    pause,
    resume,
    seek,
    skipForward,
    skipBackward,
    setPlaybackRate,
    setVolume,
    setSleepTimer,
    cancelSleepTimer,
    closeFullPlayer,
  } = usePodcastPlayer();

  const [showChapters, setShowChapters] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);

  if (!fullPlayerOpen || !currentEpisode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  const sleepTimerOptions = [
    { label: '5 min', minutes: 5 },
    { label: '10 min', minutes: 10 },
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '60 min', minutes: 60 },
  ];

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleSleepTimer = (minutes: number) => {
    setSleepTimer(minutes);
    setShowSleepTimer(false);
  };

  const timeUntilSleep = sleepTimerEnd
    ? Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000))
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Now Playing</h2>
          <button
            onClick={closeFullPlayer}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex gap-8">
            {/* Left: Artwork and episode info */}
            <div className="flex-1">
              {currentEpisode.artwork_url && (
                <img
                  src={currentEpisode.artwork_url}
                  alt={currentEpisode.title}
                  className="w-full aspect-square object-cover rounded-lg shadow-2xl mb-6"
                />
              )}

              <h3 className="text-2xl font-bold text-white mb-2">{currentEpisode.title}</h3>
              <p className="text-lg text-gray-400 mb-4">{currentEpisode.show_title}</p>

              {currentEpisode.description && (
                <p className="text-sm text-gray-500 line-clamp-3">{currentEpisode.description}</p>
              )}
            </div>

            {/* Right: Sidebar (chapters or queue) */}
            {(showChapters || showQueue) && (
              <div className="w-80 bg-gray-800 rounded-lg p-4">
                {showChapters && <ChapterList />}
                {showQueue && <EpisodeQueue />}
              </div>
            )}
          </div>

          {/* Playback controls */}
          <div className="mt-8">
            {/* Progress bar */}
            <div className="mb-4">
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Primary controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => skipBackward(15)}
                className="p-3 hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
              </button>

              <button
                onClick={playing ? pause : resume}
                className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
              >
                {playing ? (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 4h2v12H6V4zm6 0h2v12h-2V4z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => skipForward(30)}
                className="p-3 hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM11.445 7.168A1 1 0 0013 8v4a1 1 0 01-1.555.832l-3-2a1 1 0 010-1.664l3-2z" />
                </svg>
              </button>
            </div>

            {/* Secondary controls */}
            <div className="flex items-center justify-between">
              {/* Left: Volume */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.75a.75.75 0 00-1.264-.546L5.203 6H2.5A1.5 1.5 0 001 7.5v5A1.5 1.5 0 002.5 14h2.703l3.533 2.796A.75.75 0 0010 16.25V3.75z" />
                </svg>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Center: Playback speed */}
              <div className="flex gap-1">
                {playbackRates.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-3 py-1 text-sm rounded ${
                      playbackRate === rate
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Right: Additional controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowChapters(!showChapters)}
                  className={`px-3 py-2 text-sm rounded ${
                    showChapters ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Chapters
                </button>

                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`px-3 py-2 text-sm rounded ${
                    showQueue ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Queue
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowSleepTimer(!showSleepTimer)}
                    className={`px-3 py-2 text-sm rounded ${
                      sleepTimerEnd ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {sleepTimerEnd ? `Sleep: ${timeUntilSleep}m` : 'Sleep Timer'}
                  </button>

                  {showSleepTimer && (
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-lg p-2">
                      {sleepTimerOptions.map((option) => (
                        <button
                          key={option.minutes}
                          onClick={() => handleSleepTimer(option.minutes)}
                          className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded"
                        >
                          {option.label}
                        </button>
                      ))}
                      {sleepTimerEnd && (
                        <button
                          onClick={() => {
                            cancelSleepTimer();
                            setShowSleepTimer(false);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded border-t border-gray-700 mt-1"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
