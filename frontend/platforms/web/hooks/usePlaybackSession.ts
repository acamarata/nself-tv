'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface PlaybackSession {
  sessionId: string;
  mediaId: string;
  signedUrl: string;
  expiresAt: number;
  startedAt: number;
}

const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Manages a playback session lifecycle: start, heartbeat, and end.
 *
 * Uses mock implementations since backend stream APIs don't exist yet.
 * Real implementation will POST to /api/stream/admit, /sessions/:id/heartbeat, /sessions/:id/end.
 *
 * @param mediaId - The media item to create a playback session for
 * @returns Session state and control functions
 */
export function usePlaybackSession(mediaId: string) {
  const { tokens } = useAuth();
  const [session, setSession] = useState<PlaybackSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const heartbeat = useCallback(async () => {
    if (!session) return;
    // TODO: POST to /api/stream/sessions/${session.sessionId}/heartbeat
    // Mock: no-op — heartbeat is silently accepted
    void tokens;
  }, [session, tokens]);

  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: POST to /api/stream/admit with { mediaId }
      // Mock: simulate 500ms network delay and return a stub session
      await new Promise((resolve) => setTimeout(resolve, 500));

      const now = Date.now();
      const mockSession: PlaybackSession = {
        sessionId: crypto.randomUUID(),
        mediaId,
        signedUrl: `/api/stream/${mediaId}/manifest.m3u8?token=${crypto.randomUUID()}`,
        expiresAt: now + 8 * 60 * 60 * 1000, // 8 hours from now
        startedAt: now,
      };

      setSession(mockSession);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start playback session';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [mediaId]);

  const endSession = useCallback(async () => {
    if (!session) return;

    try {
      // TODO: POST to /api/stream/sessions/${session.sessionId}/end
      // Mock: just clear the session state
      void tokens;
    } catch {
      // Best-effort — session end failures are non-critical
    } finally {
      clearHeartbeat();
      setSession(null);
    }
  }, [session, tokens, clearHeartbeat]);

  // Start heartbeat interval when session is active
  useEffect(() => {
    if (!session) return;

    heartbeatRef.current = setInterval(() => {
      heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearHeartbeat();
    };
  }, [session, heartbeat, clearHeartbeat]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearHeartbeat();
    };
  }, [clearHeartbeat]);

  return { session, error, isLoading, startSession, endSession };
}
