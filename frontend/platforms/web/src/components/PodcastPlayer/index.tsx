/**
 * Podcast Player - Main component
 *
 * Renders mini player and full player, manages audio element
 */

import React, { useEffect } from 'react';
import { usePodcastAudio } from '../../hooks/usePodcastAudio';
import { MiniPlayer } from './MiniPlayer';
import { FullPlayer } from './FullPlayer';

export function PodcastPlayer() {
  // Initialize audio element and sync with store
  usePodcastAudio();

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
        // TODO: Toggle play/pause
      }

      // Left/Right: skip
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        // TODO: Skip backward
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        // TODO: Skip forward
      }

      // Ctrl+Left/Right: chapter navigation
      if (e.ctrlKey && e.code === 'ArrowLeft') {
        e.preventDefault();
        // TODO: Previous chapter
      }

      if (e.ctrlKey && e.code === 'ArrowRight') {
        e.preventDefault();
        // TODO: Next chapter
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
