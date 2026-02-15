/**
 * Hook for managing HTML5 audio element with podcast player store
 *
 * Handles audio playback, progress tracking, and state synchronization
 */

import { useEffect, useRef } from 'react';
import { usePodcastPlayer } from '@/stores/podcast-player';
import { useSavePodcastProgress } from './usePodcasts';

const PROGRESS_SAVE_INTERVAL = 15000; // 15 seconds

export function usePodcastAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentEpisode,
    playing,
    playbackRate,
    volume,
    currentTime,
    setCurrentTime,
    setDuration,
    setPlaying,
    advanceQueue,
  } = usePodcastPlayer();

  const [savePodcastProgressMutation] = useSavePodcastProgress();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();

      // Set up event listeners
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('durationchange', handleDurationChange);
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('error', handleError);
      audioRef.current.addEventListener('pause', handlePause);
      audioRef.current.addEventListener('play', handlePlay);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('durationchange', handleDurationChange);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('play', handlePlay);
      }

      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // Handle episode changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (currentEpisode) {
      audioRef.current.src = currentEpisode.enclosure_url;
      audioRef.current.load();

      // Restore playback position if resuming
      if (currentTime > 0) {
        audioRef.current.currentTime = currentTime;
      }

      if (playing) {
        audioRef.current.play().catch((error) => {
          console.error('Failed to play audio:', error);
          setPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [currentEpisode?.id]);

  // Handle play/pause changes
  useEffect(() => {
    if (!audioRef.current || !currentEpisode) return;

    if (playing) {
      audioRef.current.play().catch((error) => {
        console.error('Failed to play audio:', error);
        setPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [playing]);

  // Handle playback rate changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle manual seek
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 1) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Set up progress saving interval
  useEffect(() => {
    if (playing && currentEpisode) {
      progressTimerRef.current = setInterval(() => {
        saveProgress();
      }, PROGRESS_SAVE_INTERVAL);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [playing, currentEpisode?.id]);

  // Event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleDurationChange = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    // Save final progress
    saveProgress();

    // Advance to next episode in queue
    advanceQueue();
  };

  const handleError = (event: Event) => {
    console.error('Audio playback error:', event);
    setPlaying(false);
  };

  const handlePause = () => {
    // Only update state if it wasn't paused intentionally
    if (playing) {
      // Audio was paused by browser (e.g., media keys)
      setPlaying(false);
    }
  };

  const handlePlay = () => {
    // Only update state if it wasn't played intentionally
    if (!playing) {
      // Audio was resumed by browser (e.g., media keys)
      setPlaying(true);
    }
  };

  // Progress saving
  const saveProgress = async () => {
    if (!currentEpisode || !audioRef.current) return;

    const position = Math.floor(audioRef.current.currentTime);
    const duration = Math.floor(audioRef.current.duration);
    const completed = duration > 0 && (position / duration >= 0.95);

    try {
      await savePodcastProgressMutation({
        variables: {
          episode_id: currentEpisode.id,
          position,
          duration,
          completed,
        },
      });
    } catch (error) {
      console.error('Failed to save podcast progress:', error);
    }
  };

  return {
    audioElement: audioRef.current,
  };
}
