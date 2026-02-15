/**
 * Podcast Player - Main component
 *
 * Renders mini player and full player, manages audio element
 */

import React, { useEffect } from 'react';
import { usePodcastAudio } from '../../hooks/usePodcastAudio';
import { usePodcastPlayer } from '../../stores/podcast-player';
import { MiniPlayer } from './MiniPlayer';
import { FullPlayer } from './FullPlayer';

export function PodcastPlayer() {
  // Initialize audio element and sync with store
  usePodcastAudio();

  // Get player actions for keyboard shortcuts
  const { playing, pause, resume, skipForward, skipBackward, nextChapter, prevChapter } = usePodcastPlayer();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        if (playing) {
          pause();
        } else {
          resume();
        }
      }

      // Left/Right: skip (15s back, 30s forward - standard podcast intervals)
      if (e.code === 'ArrowLeft' && !e.ctrlKey) {
        e.preventDefault();
        skipBackward(15);
      }

      if (e.code === 'ArrowRight' && !e.ctrlKey) {
        e.preventDefault();
        skipForward(30);
      }

      // Ctrl+Left/Right: chapter navigation
      if (e.ctrlKey && e.code === 'ArrowLeft') {
        e.preventDefault();
        prevChapter();
      }

      if (e.ctrlKey && e.code === 'ArrowRight') {
        e.preventDefault();
        nextChapter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, pause, resume, skipForward, skipBackward, nextChapter, prevChapter]);

  return (
    <>
      <MiniPlayer />
      <FullPlayer />
    </>
  );
}

export { MiniPlayer, FullPlayer };
export * from './ChapterList';
export * from './EpisodeQueue';
