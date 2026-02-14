'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface NextEpisodeInfo {
  id: string;
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  stillUrl: string | null;
}

const DEFAULT_COUNTDOWN = 15;

/**
 * Manages autoplay-next-episode behavior with a visible countdown.
 *
 * When a video ends, triggers a countdown prompt. If the user doesn't cancel,
 * the next episode plays automatically when the countdown reaches zero.
 *
 * Mock implementation: nextEpisode is always null (no next episode data
 * available without backend). Wire to real API once episode graph queries exist.
 *
 * @param mediaId - Current media item ID (used to look up the next episode)
 * @param enabled - Whether autoplay is enabled in user preferences
 * @param onAutoplay - Callback invoked with the next media ID when autoplay fires
 * @returns Autoplay state and control functions
 */
export function useAutoplayNext(
  mediaId: string,
  enabled: boolean,
  onAutoplay: (nextMediaId: string) => void,
) {
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
  const [showPrompt, setShowPrompt] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAutoplayRef = useRef(onAutoplay);
  const nextEpisodeRef = useRef(nextEpisode);

  // Keep refs in sync
  onAutoplayRef.current = onAutoplay;
  nextEpisodeRef.current = nextEpisode;

  const clearCountdown = useCallback(() => {
    if (countdownRef.current !== null) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Fetch next episode info on mount / mediaId change
  useEffect(() => {
    // Phase 6 will add the episode graph API; until then, autoplay stays inert.
    setNextEpisode(null);
    setShowPrompt(false);
    setCountdownActive(false);
    setCountdown(DEFAULT_COUNTDOWN);
    clearCountdown();
  }, [mediaId, clearCountdown]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  const cancelAutoplay = useCallback(() => {
    clearCountdown();
    setShowPrompt(false);
    setCountdownActive(false);
    setCountdown(DEFAULT_COUNTDOWN);
  }, [clearCountdown]);

  const playNow = useCallback(() => {
    clearCountdown();
    setShowPrompt(false);
    setCountdownActive(false);
    setCountdown(DEFAULT_COUNTDOWN);
    if (nextEpisodeRef.current) {
      onAutoplayRef.current(nextEpisodeRef.current.id);
    }
  }, [clearCountdown]);

  const triggerAutoplay = useCallback(() => {
    if (!enabled || !nextEpisodeRef.current) return;

    setShowPrompt(true);
    setCountdownActive(true);
    setCountdown(DEFAULT_COUNTDOWN);

    clearCountdown();
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearCountdown();
          setShowPrompt(false);
          setCountdownActive(false);
          if (nextEpisodeRef.current) {
            onAutoplayRef.current(nextEpisodeRef.current.id);
          }
          return DEFAULT_COUNTDOWN;
        }
        return next;
      });
    }, 1000);
  }, [enabled, clearCountdown]);

  return {
    nextEpisode,
    countdown,
    showPrompt,
    countdownActive,
    triggerAutoplay,
    cancelAutoplay,
    playNow,
  };
}
