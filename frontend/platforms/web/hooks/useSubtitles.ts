'use client';

import { useState, useCallback, useEffect } from 'react';

export interface SubtitleTrack {
  /** Unique identifier for the track */
  id: string;
  /** BCP 47 language code (e.g. "en", "es", "ar") */
  language: string;
  /** Human-readable label (e.g. "English", "Spanish") */
  label: string;
  /** URL to VTT/SRT subtitle file */
  url: string;
  /** Whether this is a closed-caption track (includes sound effects, etc.) */
  isCC?: boolean;
}

interface UseSubtitlesReturn {
  /** Available subtitle tracks */
  tracks: SubtitleTrack[];
  /** Currently active track ID, or null if subtitles are off */
  activeTrackId: string | null;
  /** Load a set of subtitle tracks. Auto-selects based on navigator.language. */
  loadTracks: (trackList: SubtitleTrack[]) => void;
  /** Switch to a specific track by ID, or null to disable subtitles */
  switchTrack: (trackId: string | null) => void;
}

/**
 * Manages subtitle track state and synchronization with the video element's TextTrack API.
 *
 * @param videoElement - The HTMLVideoElement to attach subtitle tracks to
 * @returns Subtitle track state and control functions
 */
export function useSubtitles(videoElement: HTMLVideoElement | null): UseSubtitlesReturn {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

  const disableAllTextTracks = useCallback(() => {
    if (!videoElement) return;
    for (let i = 0; i < videoElement.textTracks.length; i++) {
      videoElement.textTracks[i].mode = 'disabled';
    }
  }, [videoElement]);

  const loadTracks = useCallback(
    (trackList: SubtitleTrack[]) => {
      if (!videoElement) {
        setTracks(trackList);
        return;
      }

      // Remove existing track elements added by this hook
      const existingTracks = videoElement.querySelectorAll('track[data-ntv-subtitle]');
      existingTracks.forEach((el) => el.remove());

      // Add new track elements
      trackList.forEach((track) => {
        const trackEl = document.createElement('track');
        trackEl.kind = track.isCC ? 'captions' : 'subtitles';
        trackEl.label = track.label;
        trackEl.srclang = track.language;
        trackEl.src = track.url;
        trackEl.id = track.id;
        trackEl.setAttribute('data-ntv-subtitle', 'true');
        videoElement.appendChild(trackEl);
      });

      setTracks(trackList);

      // Auto-select based on browser language
      const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
      const matchingTrack = trackList.find((t) => t.language === browserLang);

      if (matchingTrack) {
        setActiveTrackId(matchingTrack.id);
      } else {
        setActiveTrackId(null);
      }
    },
    [videoElement],
  );

  const switchTrack = useCallback(
    (trackId: string | null) => {
      disableAllTextTracks();

      if (trackId && videoElement) {
        for (let i = 0; i < videoElement.textTracks.length; i++) {
          const textTrack = videoElement.textTracks[i];
          // Match by label since textTrack.id is not always populated
          const matchingTrack = tracks.find((t) => t.id === trackId);
          if (matchingTrack && textTrack.label === matchingTrack.label && textTrack.language === matchingTrack.language) {
            textTrack.mode = 'showing';
            break;
          }
        }
      }

      setActiveTrackId(trackId);
    },
    [videoElement, tracks, disableAllTextTracks],
  );

  // Synchronize active track when it changes
  useEffect(() => {
    if (!videoElement || tracks.length === 0) return;

    disableAllTextTracks();

    if (activeTrackId) {
      const matchingTrack = tracks.find((t) => t.id === activeTrackId);
      if (matchingTrack) {
        for (let i = 0; i < videoElement.textTracks.length; i++) {
          const textTrack = videoElement.textTracks[i];
          if (textTrack.label === matchingTrack.label && textTrack.language === matchingTrack.language) {
            textTrack.mode = 'showing';
            break;
          }
        }
      }
    }
  }, [videoElement, activeTrackId, tracks, disableAllTextTracks]);

  return { tracks, activeTrackId, loadTracks, switchTrack };
}
