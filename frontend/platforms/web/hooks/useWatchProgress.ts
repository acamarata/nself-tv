'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { useAuth } from '@/hooks/useAuth';

const SAVE_INTERVAL_MS = 15_000;

// ============================================================
// GraphQL
// ============================================================

const GET_WATCH_PROGRESS = gql`
  query GetWatchProgress($media_item_id: uuid!) {
    watch_progress(where: {media_item_id: {_eq: $media_item_id}}, limit: 1) {
      id
      position_seconds
      duration_seconds
      percentage
      completed
      last_watched_at
    }
  }
`;

const UPSERT_WATCH_PROGRESS = gql`
  mutation UpsertWatchProgress(
    $family_id: uuid!
    $media_item_id: uuid!
    $position_seconds: Int!
    $duration_seconds: Int!
  ) {
    insert_watch_progress_one(
      object: {
        family_id: $family_id
        media_item_id: $media_item_id
        position_seconds: $position_seconds
        duration_seconds: $duration_seconds
      }
      on_conflict: {
        constraint: idx_watch_progress_user_media
        update_columns: [position_seconds, duration_seconds, last_watched_at]
      }
    ) {
      id
      position_seconds
      duration_seconds
      percentage
      completed
    }
  }
`;

// ============================================================
// Local storage helpers (offline fallback)
// ============================================================

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

// ============================================================
// Hook
// ============================================================

/**
 * Tracks and persists watch progress for a media item.
 *
 * Uses localStorage for immediate persistence and syncs to the
 * backend GraphQL API (watch_progress table) periodically and on unmount.
 * On load, backend data takes priority over localStorage if newer.
 *
 * @param mediaId - The media item to track progress for
 * @returns Progress state and control functions
 */
export function useWatchProgress(mediaId: string) {
  const { user } = useAuth();
  const familyId = user?.familyId;

  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const positionRef = useRef(position);
  const durationRef = useRef(duration);
  const lastSavedRef = useRef(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaIdRef = useRef(mediaId);
  const familyIdRef = useRef(familyId);

  // Keep refs in sync with state
  positionRef.current = position;
  durationRef.current = duration;
  mediaIdRef.current = mediaId;
  familyIdRef.current = familyId;

  // Backend query
  const { data: serverData } = useQuery(GET_WATCH_PROGRESS, {
    variables: { media_item_id: mediaId },
    skip: !mediaId,
    fetchPolicy: 'network-only',
  });

  // Backend mutation
  const [upsertProgress] = useMutation(UPSERT_WATCH_PROGRESS);

  const syncToBackend = useCallback(
    (mid: string, pos: number, dur: number) => {
      const fid = familyIdRef.current;
      if (!mid || !fid || dur <= 0) return;
      upsertProgress({
        variables: {
          family_id: fid,
          media_item_id: mid,
          position_seconds: Math.round(pos),
          duration_seconds: Math.round(dur),
        },
      }).catch(() => {
        // Sync failed — localStorage has the data, will retry next interval
      });
    },
    [upsertProgress],
  );

  // Load progress: prefer backend if available, fall back to localStorage
  useEffect(() => {
    const serverProgress = serverData?.watch_progress?.[0];
    const localProgress = loadFromStorage(mediaId);

    if (serverProgress) {
      const serverTime = new Date(serverProgress.last_watched_at).getTime();
      const localTime = localProgress ? new Date(localProgress.updatedAt).getTime() : 0;

      if (localTime > serverTime && localProgress) {
        // Local is newer — use it and sync to backend
        setPosition(localProgress.position);
        setDuration(localProgress.duration);
        syncToBackend(mediaId, localProgress.position, localProgress.duration);
      } else {
        // Server is newer or equal
        setPosition(serverProgress.position_seconds);
        setDuration(serverProgress.duration_seconds);
        saveToStorage(mediaId, serverProgress.position_seconds, serverProgress.duration_seconds);
      }
    } else if (localProgress) {
      setPosition(localProgress.position);
      setDuration(localProgress.duration);
      // Push to backend since it has no record
      syncToBackend(mediaId, localProgress.position, localProgress.duration);
    } else {
      setPosition(0);
      setDuration(0);
    }

    lastSavedRef.current = Date.now();
    setIsLoaded(true);
  }, [mediaId, serverData, syncToBackend]);

  // Periodic save to both localStorage and backend
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastSavedRef.current >= SAVE_INTERVAL_MS) {
        const mid = mediaIdRef.current;
        const pos = positionRef.current;
        const dur = durationRef.current;
        saveToStorage(mid, pos, dur);
        syncToBackend(mid, pos, dur);
        lastSavedRef.current = now;
      }
    }, SAVE_INTERVAL_MS);

    return () => {
      if (saveIntervalRef.current !== null) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      // Save on unmount
      const mid = mediaIdRef.current;
      const pos = positionRef.current;
      const dur = durationRef.current;
      saveToStorage(mid, pos, dur);
      syncToBackend(mid, pos, dur);
    };
  }, [mediaId, syncToBackend]);

  const updatePosition = useCallback((pos: number, dur: number) => {
    setPosition(pos);
    setDuration(dur);
  }, []);

  const markAsWatched = useCallback(() => {
    const dur = durationRef.current;
    setPosition(dur);
    const mid = mediaIdRef.current;
    saveToStorage(mid, dur, dur);
    syncToBackend(mid, dur, dur);
    lastSavedRef.current = Date.now();
  }, [syncToBackend]);

  const markAsUnwatched = useCallback(() => {
    const mid = mediaIdRef.current;
    const dur = durationRef.current;
    setPosition(0);
    saveToStorage(mid, 0, dur);
    syncToBackend(mid, 0, dur);
    lastSavedRef.current = Date.now();
  }, [syncToBackend]);

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
