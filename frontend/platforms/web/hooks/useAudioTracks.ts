'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Hls, { Events } from 'hls.js';
import type { ManifestParsedData, MediaPlaylist } from 'hls.js';

export interface AudioTrack {
  /** Unique identifier for the track */
  id: string;
  /** BCP 47 language code (e.g. "en", "es", "ar") */
  language: string;
  /** Human-readable label (e.g. "English", "Spanish") */
  label: string;
  /** Audio codec identifier (e.g. "mp4a.40.2", "ac-3") */
  codec: string;
}

interface UseAudioTracksReturn {
  /** Available audio tracks */
  tracks: AudioTrack[];
  /** Currently active track ID */
  activeTrackId: string | null;
  /** Manually load audio tracks (used for non-HLS sources) */
  loadTracks: (trackList: AudioTrack[]) => void;
  /** Switch to a specific audio track by ID */
  switchTrack: (trackId: string) => void;
}

function mediaPlaylistToAudioTrack(track: MediaPlaylist, index: number): AudioTrack {
  return {
    id: `audio-${index}`,
    language: track.lang || 'und',
    label: track.name || `Track ${index + 1}`,
    codec: track.audioCodec || 'unknown',
  };
}

/**
 * Manages audio track state and synchronization with an HLS.js instance.
 *
 * Listens for MANIFEST_PARSED events from HLS.js to discover available audio tracks
 * and provides control for switching between them.
 *
 * @param hlsInstance - The HLS.js instance to bind to, or null if not available
 * @returns Audio track state and control functions
 */
export function useAudioTracks(hlsInstance: Hls | null): UseAudioTracksReturn {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const tracksRef = useRef<AudioTrack[]>([]);

  // Keep ref in sync for use inside event handlers
  tracksRef.current = tracks;

  const loadTracks = useCallback((trackList: AudioTrack[]) => {
    setTracks(trackList);
    if (trackList.length > 0) {
      setActiveTrackId(trackList[0].id);
    }
  }, []);

  const switchTrack = useCallback(
    (trackId: string) => {
      if (!hlsInstance) return;

      const trackIndex = tracksRef.current.findIndex((t) => t.id === trackId);
      if (trackIndex === -1) return;

      hlsInstance.audioTrack = trackIndex;
      setActiveTrackId(trackId);
    },
    [hlsInstance],
  );

  // Listen for HLS.js MANIFEST_PARSED to discover audio tracks
  useEffect(() => {
    if (!hlsInstance) return;

    const handleManifestParsed = (_event: Events.MANIFEST_PARSED, data: ManifestParsedData) => {
      if (!data.audioTracks || data.audioTracks.length === 0) return;

      const parsedTracks = data.audioTracks.map(mediaPlaylistToAudioTrack);
      setTracks(parsedTracks);

      // Set the active track to match the current HLS audio track
      const currentIndex = hlsInstance.audioTrack;
      if (currentIndex >= 0 && currentIndex < parsedTracks.length) {
        setActiveTrackId(parsedTracks[currentIndex].id);
      } else if (parsedTracks.length > 0) {
        setActiveTrackId(parsedTracks[0].id);
      }
    };

    const handleAudioTrackSwitched = (_event: Events.AUDIO_TRACK_SWITCHED, data: MediaPlaylist) => {
      const switchedIndex = data.id;
      const current = tracksRef.current;
      if (switchedIndex >= 0 && switchedIndex < current.length) {
        setActiveTrackId(current[switchedIndex].id);
      }
    };

    hlsInstance.on(Events.MANIFEST_PARSED, handleManifestParsed);
    hlsInstance.on(Events.AUDIO_TRACK_SWITCHED, handleAudioTrackSwitched);

    return () => {
      hlsInstance.off(Events.MANIFEST_PARSED, handleManifestParsed);
      hlsInstance.off(Events.AUDIO_TRACK_SWITCHED, handleAudioTrackSwitched);
    };
  }, [hlsInstance]);

  return { tracks, activeTrackId, loadTracks, switchTrack };
}
