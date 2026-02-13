'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const SAVE_INTERVAL_MS = 15_000;

interface StoredProgress {
  position: number;
  duration: number;
  updatedAt: string;
}

function getStorageKey(mediaId: string): string {
  return `ntv_progress_${mediaId}`;
}

function loadFromStorage(mediaId: string): StoredProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorageKey(mediaId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredProgress;
  } catch {
    return null;
  }
}

function saveToStorage(mediaId: string, position: number, duration: number): void {
  if (typeof window === 'undefined') return;
  try {
    const data: StoredProgress = {
      position,
      duration,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(getStorageKey(mediaId), JSON.stringify(data));
  } catch {
    // localStorage may be full or unavailable — fail silently
  }
}

/**
 * Tracks and persists watch progress for a media item.
 *
 * Uses localStorage as a stub persistence layer. The real implementation
 * will sync progress to the backend API and merge with server state.
 *
 * Progress is auto-saved every 15 seconds and on unmount.
 *
 * @param mediaId - The media item to track progress for
 * @returns Progress state and control functions
 */
export function useWatchProgress(mediaId: string) {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const positionRef = useRef(position);
  const durationRef = useRef(duration);
  const lastSavedRef = useRef(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaIdRef = useRef(mediaId);

  // Keep refs in sync with state
  positionRef.current = position;
  durationRef.current = duration;
  mediaIdRef.current = mediaId;

  // Load progress from localStorage on mount or mediaId change
  useEffect(() => {
    const stored = loadFromStorage(mediaId);
    if (stored) {
      setPosition(stored.position);
      setDuration(stored.duration);
    } else {
      setPosition(0);
      setDuration(0);
    }
    lastSavedRef.current = Date.now();
    setIsLoaded(true);
  }, [mediaId]);

  // Set up periodic save interval
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastSavedRef.current >= SAVE_INTERVAL_MS) {
        saveToStorage(mediaIdRef.current, positionRef.current, durationRef.current);
        lastSavedRef.current = now;
      }
    }, SAVE_INTERVAL_MS);

    return () => {
      if (saveIntervalRef.current !== null) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      // Save on unmount
      saveToStorage(mediaIdRef.current, positionRef.current, durationRef.current);
    };
  }, [mediaId]);

  const updatePosition = useCallback((pos: number, dur: number) => {
    setPosition(pos);
    setDuration(dur);
  }, []);

  const markAsWatched = useCallback(() => {
    const dur = durationRef.current;
    setPosition(dur);
    saveToStorage(mediaIdRef.current, dur, dur);
    lastSavedRef.current = Date.now();
  }, []);

  const markAsUnwatched = useCallback(() => {
    setPosition(0);
    saveToStorage(mediaIdRef.current, 0, durationRef.current);
    lastSavedRef.current = Date.now();
  }, []);

  const percentage = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;

  return {
    position,
    duration,
    percentage,
    isLoaded,
    updatePosition,
    markAsWatched,
    markAsUnwatched,
  };
}
