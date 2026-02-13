'use client';

import { useEffect, useCallback } from 'react';

interface UsePlayerKeyboardOptions {
  /** Toggle play/pause state */
  onPlayPause: () => void;
  /** Seek to a specific time in seconds */
  onSeek: (time: number) => void;
  /** Set volume (0-1) */
  onVolumeChange: (volume: number) => void;
  /** Toggle mute state */
  onMuteToggle: () => void;
  /** Toggle fullscreen mode */
  onFullscreenToggle: () => void;
  /** Cycle through subtitle tracks (optional) */
  onSubtitleToggle?: () => void;
  /** Total duration in seconds */
  duration: number;
  /** Current playback time in seconds */
  currentTime: number;
  /** Current volume (0-1) */
  volume: number;
}

const SEEK_STEP = 10;
const VOLUME_STEP = 0.05;

/**
 * Keyboard shortcut handler for video player controls.
 *
 * Bindings:
 * - Space: play/pause
 * - ArrowLeft/Right: seek -/+ 10s
 * - ArrowUp/Down: volume +/- 5%
 * - F: fullscreen toggle
 * - M: mute toggle
 * - 0-9: seek to 0%-90% of duration
 * - C: cycle subtitles
 *
 * Ignores keystrokes when an input or textarea is focused.
 */
export function usePlayerKeyboard({
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onSubtitleToggle,
  duration,
  currentTime,
  volume,
}: UsePlayerKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();

      if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          onPlayPause();
          break;

        case 'ArrowLeft':
          event.preventDefault();
          onSeek(Math.max(0, currentTime - SEEK_STEP));
          break;

        case 'ArrowRight':
          event.preventDefault();
          onSeek(Math.min(duration, currentTime + SEEK_STEP));
          break;

        case 'ArrowUp':
          event.preventDefault();
          onVolumeChange(Math.min(1, volume + VOLUME_STEP));
          break;

        case 'ArrowDown':
          event.preventDefault();
          onVolumeChange(Math.max(0, volume - VOLUME_STEP));
          break;

        case 'f':
        case 'F':
          event.preventDefault();
          onFullscreenToggle();
          break;

        case 'm':
        case 'M':
          event.preventDefault();
          onMuteToggle();
          break;

        case 'c':
        case 'C':
          if (onSubtitleToggle) {
            event.preventDefault();
            onSubtitleToggle();
          }
          break;

        default: {
          const num = parseInt(event.key, 10);
          if (!isNaN(num) && num >= 0 && num <= 9 && Number.isFinite(duration) && duration > 0) {
            event.preventDefault();
            onSeek((num / 10) * duration);
          }
          break;
        }
      }
    },
    [onPlayPause, onSeek, onVolumeChange, onMuteToggle, onFullscreenToggle, onSubtitleToggle, duration, currentTime, volume],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
