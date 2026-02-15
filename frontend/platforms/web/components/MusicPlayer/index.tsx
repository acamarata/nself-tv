/**
 * Music Player — persistent bottom bar with playback controls
 *
 * Renders a fixed bottom bar when a track is playing. Manages an HTML5
 * audio element and syncs it with the Zustand music player store.
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useMusicPlayer } from '../../stores/music-player';
import { formatTime } from '../../utils/format';

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentTrack,
    playing,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    setCurrentTime,
    setDuration,
    setPlaying,
    pause,
    resume,
    seek,
    setVolume,
    playNext,
    playPrevious,
    advanceQueue,
    toggleShuffle,
    toggleRepeat,
  } = useMusicPlayer();

  // --- Audio element lifecycle ---

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [setCurrentTime]);

  const handleDurationChange = useCallback(() => {
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  }, [setDuration]);

  const handleEnded = useCallback(() => {
    advanceQueue();
  }, [advanceQueue]);

  const handleError = useCallback(() => {
    setPlaying(false);
  }, [setPlaying]);

  const handleBrowserPause = useCallback(() => {
    if (playing) {
      setPlaying(false);
    }
  }, [playing, setPlaying]);

  const handleBrowserPlay = useCallback(() => {
    if (!playing) {
      setPlaying(true);
    }
  }, [playing, setPlaying]);

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('pause', handleBrowserPause);
    audio.addEventListener('play', handleBrowserPlay);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('pause', handleBrowserPause);
      audio.removeEventListener('play', handleBrowserPlay);
    };
  }, [handleTimeUpdate, handleDurationChange, handleEnded, handleError, handleBrowserPause, handleBrowserPlay]);

  // Handle track changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (currentTrack) {
      audioRef.current.src = currentTrack.filePath;
      audioRef.current.load();

      if (currentTime > 0) {
        audioRef.current.currentTime = currentTime;
      }

      if (playing) {
        audioRef.current.play().catch((error) => {
          console.error('Failed to play audio:', error);
          setPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [currentTrack?.id]);

  // Handle play/pause toggling
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    if (playing) {
      audioRef.current.play().catch((error) => {
        console.error('Failed to play audio:', error);
        setPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [playing]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle manual seek from store
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 1) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // --- Render nothing if no track ---

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const repeatLabel = repeat === 'off' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat one';

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
        {/* Track info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {currentTrack.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-12 h-12 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {currentTrack.title}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {currentTrack.artist} &mdash; {currentTrack.album}
            </div>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-1">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 rounded-full transition-colors ${
              shuffle ? 'text-blue-400 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-800'
            }`}
            title={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 010 1.414l-3.414 3.414A1 1 0 016.586 12H4a1 1 0 01-1-1V4zm10.707-.707a1 1 0 00-1.414 0L9.586 6H13a1 1 0 01.707.293L17.414 10l-3.707 3.707A1 1 0 0113 14H9.586l2.707 2.707a1 1 0 001.414 0l4-4a1 1 0 000-1.414l-4-4z" />
            </svg>
          </button>

          {/* Previous */}
          <button
            onClick={playPrevious}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            title="Previous"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
            </svg>
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

          {/* Next */}
          <button
            onClick={playNext}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            title="Next"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.555 5.168A1 1 0 0010 6v2.798L4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z" />
            </svg>
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={`p-2 rounded-full transition-colors relative ${
              repeat !== 'off' ? 'text-blue-400 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-800'
            }`}
            title={repeatLabel}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M14 4l2 2-2 2V6H5v3H3V5a1 1 0 011-1h10V4zM6 16l-2-2 2-2v2h9v-3h2v4a1 1 0 01-1 1H6v0z" />
            </svg>
            {repeat === 'one' && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold text-blue-400">1</span>
            )}
          </button>
        </div>

        {/* Time display */}
        <div className="text-sm text-gray-400 tabular-nums hidden sm:block">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2 hidden md:flex">
          <button
            onClick={() => setVolume(volume === 0 ? 1 : 0)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zm5.274 3.267a.75.75 0 011.06 0 5.5 5.5 0 010 7.778.75.75 0 01-1.06-1.06 4 4 0 000-5.657.75.75 0 010-1.06z" clipRule="evenodd" />
                <path d="M3 3l14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : volume < 0.5 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zm5.274 3.267a.75.75 0 011.06 0 5.5 5.5 0 010 7.778.75.75 0 01-1.06-1.06 4 4 0 000-5.657.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 accent-blue-500"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
}
