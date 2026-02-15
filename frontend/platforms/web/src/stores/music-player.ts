/**
 * Music player state management with Zustand
 *
 * Manages audio playback, queue, shuffle, repeat, and volume
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  filePath: string;
  duration: number; // seconds
}

export interface MusicPlayerState {
  // Current playback
  currentTrack: Track | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;

  // Queue
  queue: Track[];

  // Playback modes
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';

  // Actions - Playback control
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;

  // Actions - Queue management
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  advanceQueue: () => void;

  // Actions - Playback modes
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  // Actions - Internal state updates
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
}

const DEFAULT_VOLUME = 1.0;

export const useMusicPlayer = create<MusicPlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: DEFAULT_VOLUME,
      queue: [],
      shuffle: false,
      repeat: 'off',

      // Playback actions
      play: (track: Track) => {
        set({
          currentTrack: track,
          playing: true,
          currentTime: 0,
          duration: track.duration,
        });
      },

      pause: () => {
        set({ playing: false });
      },

      resume: () => {
        set({ playing: true });
      },

      stop: () => {
        set({
          currentTrack: null,
          playing: false,
          currentTime: 0,
          duration: 0,
        });
      },

      seek: (time: number) => {
        const { duration } = get();
        const clampedTime = Math.max(0, Math.min(time, duration));
        set({ currentTime: clampedTime });
      },

      setVolume: (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ volume: clampedVolume });
      },

      // Queue management
      addToQueue: (track: Track) => {
        const { queue } = get();
        // Don't add duplicates
        if (queue.some((t) => t.id === track.id)) return;
        set({ queue: [...queue, track] });
      },

      removeFromQueue: (trackId: string) => {
        const { queue } = get();
        set({ queue: queue.filter((t) => t.id !== trackId) });
      },

      clearQueue: () => {
        set({ queue: [] });
      },

      playNext: () => {
        const { queue, shuffle, repeat, currentTrack } = get();

        if (queue.length === 0) {
          if (repeat === 'one' && currentTrack) {
            // Replay the current track
            set({ currentTime: 0, playing: true });
          } else {
            get().stop();
          }
          return;
        }

        if (repeat === 'one' && currentTrack) {
          // Replay current track
          set({ currentTime: 0, playing: true });
          return;
        }

        if (shuffle) {
          // Pick a random track from the queue
          const randomIndex = Math.floor(Math.random() * queue.length);
          const nextTrack = queue[randomIndex];
          const remainingQueue = queue.filter((_, i) => i !== randomIndex);

          // If repeat all and queue is now empty, re-add current track
          if (repeat === 'all' && remainingQueue.length === 0 && currentTrack) {
            set({ queue: [currentTrack] });
          } else {
            // If repeat all, add current track back to end of queue
            if (repeat === 'all' && currentTrack) {
              set({ queue: [...remainingQueue, currentTrack] });
            } else {
              set({ queue: remainingQueue });
            }
          }

          get().play(nextTrack);
        } else {
          // Play the first track in queue
          const [nextTrack, ...remainingQueue] = queue;

          // If repeat all, add current track back to end of queue
          if (repeat === 'all' && currentTrack) {
            set({ queue: [...remainingQueue, currentTrack] });
          } else {
            set({ queue: remainingQueue });
          }

          get().play(nextTrack);
        }
      },

      playPrevious: () => {
        const { currentTime, currentTrack } = get();

        // If more than 3 seconds into the track, restart it
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        // Otherwise there's no previous history to go back to in this simple model,
        // so just restart the current track
        if (currentTrack) {
          set({ currentTime: 0, playing: true });
        }
      },

      advanceQueue: () => {
        const { queue, repeat, currentTrack } = get();

        if (repeat === 'one' && currentTrack) {
          // Replay current track
          set({ currentTime: 0, playing: true });
          return;
        }

        if (queue.length > 0) {
          get().playNext();
        } else if (repeat === 'all' && currentTrack) {
          // No queue left but repeat all — replay current track
          set({ currentTime: 0, playing: true });
        } else {
          // No more tracks, stop playback
          get().stop();
        }
      },

      // Playback mode toggles
      toggleShuffle: () => {
        const { shuffle } = get();
        set({ shuffle: !shuffle });
      },

      toggleRepeat: () => {
        const { repeat } = get();
        const nextRepeat: Record<string, 'off' | 'all' | 'one'> = {
          off: 'all',
          all: 'one',
          one: 'off',
        };
        set({ repeat: nextRepeat[repeat] });
      },

      // Internal state updates
      setCurrentTime: (time: number) => {
        set({ currentTime: time });
      },

      setDuration: (duration: number) => {
        set({ duration });
      },

      setPlaying: (playing: boolean) => {
        set({ playing });
      },
    }),
    {
      name: 'music-player-storage',
      partialize: (state) => ({
        // Persist queue, volume, and playback preferences across sessions
        queue: state.queue,
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        // Resume current track and position
        currentTrack: state.currentTrack,
        currentTime: state.currentTime,
      }),
    }
  )
);
