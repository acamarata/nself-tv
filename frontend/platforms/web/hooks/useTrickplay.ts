'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { TrickplayLoader } from '@/lib/trickplay/loader';
import type { TrickplayConfig, TrickplayCue } from '@/lib/trickplay/loader';

/**
 * Manages trickplay (seek-scrub thumbnail preview) state for the player.
 *
 * Lazy-loads the VTT sprite map on the first seek interaction, then provides
 * the appropriate sprite cue for any given seek position.
 *
 * @param config - Trickplay configuration, or null if trickplay is unavailable
 * @returns Trickplay state and seek event handlers
 */
export function useTrickplay(config: TrickplayConfig | null) {
  const [currentCue, setCurrentCue] = useState<TrickplayCue | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loaderRef = useRef<TrickplayLoader | null>(null);

  // Create or recreate loader when config changes
  useEffect(() => {
    if (!config) {
      loaderRef.current = null;
      setCurrentCue(null);
      setIsLoaded(false);
      return;
    }

    loaderRef.current = new TrickplayLoader(config);
    setCurrentCue(null);
    setIsLoaded(false);
  }, [config]);

  const onSeekStart = useCallback(async () => {
    const loader = loaderRef.current;
    if (!loader || loader.isLoaded()) return;

    try {
      await loader.load();
      setIsLoaded(true);
    } catch {
      // VTT load failure is non-critical — seek still works, just without thumbnails
    }
  }, []);

  const onSeekMove = useCallback((time: number) => {
    const loader = loaderRef.current;
    if (!loader || !loader.isLoaded()) {
      setCurrentCue(null);
      return;
    }

    const cue = loader.getCueAtTime(time);
    setCurrentCue(cue);
  }, []);

  const onSeekEnd = useCallback(() => {
    setCurrentCue(null);
  }, []);

  return {
    currentCue,
    isLoaded,
    onSeekStart,
    onSeekMove,
    onSeekEnd,
  };
}
