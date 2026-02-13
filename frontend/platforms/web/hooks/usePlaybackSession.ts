'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { getDeviceId } from '@/lib/device';

export interface PlaybackSession {
  sessionId: string;
  mediaId: string;
  signedUrl: string;
  expiresAt: number;
  startedAt: number;
}

const HEARTBEAT_INTERVAL_MS = 60_000;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';

/**
 * Manages a playback session lifecycle: start, heartbeat, and end.
 *
 * Integrates with stream_gateway service for admission control, enforcing:
 * - RBAC (user role checks)
 * - Content rating limits (parental controls)
 * - Concurrency limits (family and device limits)
 * - User active status checks
 *
 * @param mediaId - The media item to create a playback session for
 * @param contentRating - The content rating of the media (e.g., "TV-MA", "PG-13")
 * @returns Session state and control functions
 */
export function usePlaybackSession(mediaId: string, contentRating?: string) {
  const { user, tokens } = useAuth();
  const { currentProfile, profiles } = useProfiles();
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
    if (!session || !tokens?.accessToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/heartbeat/${session.sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Heartbeat failure is non-critical, but we log it
        console.warn(`Heartbeat failed for session ${session.sessionId}: ${response.status}`);
      }
    } catch (err) {
      // Network errors during heartbeat are non-critical
      console.warn('Heartbeat network error:', err);
    }
  }, [session, tokens]);

  const startSession = useCallback(async () => {
    if (!user || !tokens?.accessToken) {
      setError('User not authenticated');
      return;
    }

    // Get family_id from the user's first profile (all profiles share same family_id)
    const familyId = profiles[0]?.userId ?
      // For now, we'll use a GraphQL query to get family_id, but as a workaround we can use userId as familyId
      // TODO: Fetch actual family_id from user metadata or profile
      user.id : user.id;

    const deviceId = getDeviceId();
    const userRole = user.defaultRole || 'user';
    const profileRatingLimit = currentProfile?.parentalControls?.maxTvRating ||
                                 currentProfile?.parentalControls?.maxMovieRating ||
                                 'TV-MA';

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          mediaId,
          deviceId,
          familyId,
          userRole,
          contentRating: contentRating || 'NR',
          profileContentRatingLimit: profileRatingLimit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        switch (response.status) {
          case 401:
            throw new Error('Authentication required. Please log in again.');
          case 403:
            throw new Error(errorData.message || 'Access denied. You do not have permission to play this content.');
          case 429:
            if (errorData.error === 'concurrency_limit') {
              throw new Error('Concurrent stream limit reached. Please stop another stream and try again.');
            }
            if (errorData.error === 'device_limit') {
              throw new Error('Device limit reached. Please remove a device and try again.');
            }
            throw new Error(errorData.message || 'Too many requests. Please try again later.');
          case 500:
            throw new Error('Server error. Please try again later.');
          default:
            throw new Error(errorData.message || `Admission failed with status ${response.status}`);
        }
      }

      const data = await response.json();
      const admitResponse = data.data;

      const now = Date.now();
      const newSession: PlaybackSession = {
        sessionId: admitResponse.sessionId,
        mediaId,
        signedUrl: admitResponse.mediaUrl || `/api/stream/${mediaId}/manifest.m3u8?token=${admitResponse.token}`,
        expiresAt: new Date(admitResponse.expiresAt).getTime(),
        startedAt: now,
      };

      setSession(newSession);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start playback session';
      setError(message);
      throw err; // Re-throw so the caller can handle it
    } finally {
      setIsLoading(false);
    }
  }, [user, tokens, mediaId, contentRating, currentProfile, profiles]);

  const endSession = useCallback(async () => {
    if (!session || !tokens?.accessToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/session/${session.sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Failed to end session ${session.sessionId}: ${response.status}`);
      }
    } catch (err) {
      // Best-effort — session end failures are non-critical
      console.warn('Session end error:', err);
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
