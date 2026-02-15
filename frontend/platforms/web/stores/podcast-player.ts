/**
 * Podcast player state management with Zustand
 *
 * Manages audio playback, queue, chapters, and progress tracking
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Chapter {
  start_time: number; // seconds
  title: string;
  url?: string;
  image?: string;
}

export interface Episode {
  id: string;
  show_id: string;
  guid: string;
  title: string;
  description: string;
  pub_date: string;
  duration: number; // seconds
  enclosure_url: string;
  enclosure_type: string;
  artwork_url?: string;
  show_title: string;
  show_author: string;
  chapters?: Chapter[];
}

export interface PodcastPlayerState {
  // Current playback
  currentEpisode: Episode | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;

  // Queue
  queue: Episode[];

  // Chapters
  chapters: Chapter[];
  currentChapter: Chapter | null;

  // Sleep timer
  sleepTimerEnd: number | null; // timestamp when sleep timer expires

  // UI state
  fullPlayerOpen: boolean;

  // Actions - Playback control
  play: (episode: Episode) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;

  // Actions - Chapter navigation
  nextChapter: () => void;
  prevChapter: () => void;
  seekToChapter: (chapter: Chapter) => void;
  updateCurrentChapter: () => void;

  // Actions - Queue management
  addToQueue: (episode: Episode) => void;
  removeFromQueue: (episodeId: string) => void;
  reorderQueue: (from: number, to: number) => void;
  playNext: (episode: Episode) => void;
  clearQueue: () => void;
  playFromQueue: (index: number) => void;
  advanceQueue: () => void; // Play next episode in queue

  // Actions - Sleep timer
  setSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  checkSleepTimer: () => void;

  // Actions - UI
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  toggleFullPlayer: () => void;

  // Actions - Internal state updates
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
}

const DEFAULT_PLAYBACK_RATE = 1.0;
const DEFAULT_VOLUME = 1.0;
const COMPLETION_THRESHOLD = 0.95; // 95% = completed

export const usePodcastPlayer = create<PodcastPlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentEpisode: null,
      playing: false,
      currentTime: 0,
      duration: 0,
      playbackRate: DEFAULT_PLAYBACK_RATE,
      volume: DEFAULT_VOLUME,
      queue: [],
      chapters: [],
      currentChapter: null,
      sleepTimerEnd: null,
      fullPlayerOpen: false,

      // Playback actions
      play: (episode: Episode) => {
        set({
          currentEpisode: episode,
          playing: true,
          currentTime: 0,
          duration: episode.duration,
          chapters: episode.chapters || [],
          currentChapter: episode.chapters?.[0] || null,
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
          currentEpisode: null,
          playing: false,
          currentTime: 0,
          duration: 0,
          chapters: [],
          currentChapter: null,
        });
      },

      seek: (time: number) => {
        const { duration } = get();
        const clampedTime = Math.max(0, Math.min(time, duration));
        set({ currentTime: clampedTime });
        get().updateCurrentChapter();
      },

      setPlaybackRate: (rate: number) => {
        set({ playbackRate: rate });
      },

      setVolume: (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ volume: clampedVolume });
      },

      skipForward: (seconds: number) => {
        const { currentTime, duration } = get();
        const newTime = Math.min(currentTime + seconds, duration);
        get().seek(newTime);
      },

      skipBackward: (seconds: number) => {
        const { currentTime } = get();
        const newTime = Math.max(currentTime - seconds, 0);
        get().seek(newTime);
      },

      // Chapter navigation
      nextChapter: () => {
        const { chapters, currentChapter } = get();
        if (!chapters.length || !currentChapter) return;

        const currentIndex = chapters.findIndex(
          (ch) => ch.start_time === currentChapter.start_time
        );

        if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
          const nextChapter = chapters[currentIndex + 1];
          get().seekToChapter(nextChapter);
        }
      },

      prevChapter: () => {
        const { chapters, currentChapter, currentTime } = get();
        if (!chapters.length || !currentChapter) return;

        const currentIndex = chapters.findIndex(
          (ch) => ch.start_time === currentChapter.start_time
        );

        // If more than 3s into chapter, go to start of current chapter
        if (currentTime - currentChapter.start_time > 3) {
          get().seek(currentChapter.start_time);
          return;
        }

        // Otherwise go to previous chapter
        if (currentIndex > 0) {
          const prevChapter = chapters[currentIndex - 1];
          get().seekToChapter(prevChapter);
        }
      },

      seekToChapter: (chapter: Chapter) => {
        set({ currentChapter: chapter });
        get().seek(chapter.start_time);
      },

      updateCurrentChapter: () => {
        const { chapters, currentTime } = get();
        if (!chapters.length) return;

        // Find the chapter that should be playing at current time
        let activeChapter = chapters[0];
        for (const chapter of chapters) {
          if (currentTime >= chapter.start_time) {
            activeChapter = chapter;
          } else {
            break;
          }
        }

        set({ currentChapter: activeChapter });
      },

      // Queue management
      addToQueue: (episode: Episode) => {
        const { queue } = get();
        // Don't add duplicates
        if (queue.some((ep) => ep.id === episode.id)) return;
        set({ queue: [...queue, episode] });
      },

      removeFromQueue: (episodeId: string) => {
        const { queue } = get();
        set({ queue: queue.filter((ep) => ep.id !== episodeId) });
      },

      reorderQueue: (from: number, to: number) => {
        const { queue } = get();
        const newQueue = [...queue];
        const [removed] = newQueue.splice(from, 1);
        newQueue.splice(to, 0, removed);
        set({ queue: newQueue });
      },

      playNext: (episode: Episode) => {
        const { queue } = get();
        // Remove if already in queue
        const filtered = queue.filter((ep) => ep.id !== episode.id);
        // Add to front of queue
        set({ queue: [episode, ...filtered] });
      },

      clearQueue: () => {
        set({ queue: [] });
      },

      playFromQueue: (index: number) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;

        const episode = queue[index];
        // Remove from queue and play
        set({ queue: queue.filter((_, i) => i !== index) });
        get().play(episode);
      },

      advanceQueue: () => {
        const { queue, currentTime, duration } = get();

        // Check if current episode is completed
        const completed = duration > 0 && currentTime / duration >= COMPLETION_THRESHOLD;

        if (completed && queue.length > 0) {
          // Play next episode in queue
          const [nextEpisode, ...remainingQueue] = queue;
          set({ queue: remainingQueue });
          get().play(nextEpisode);
        } else {
          // No more episodes, stop playback
          get().stop();
        }
      },

      // Sleep timer
      setSleepTimer: (minutes: number) => {
        const endTime = Date.now() + minutes * 60 * 1000;
        set({ sleepTimerEnd: endTime });
      },

      cancelSleepTimer: () => {
        set({ sleepTimerEnd: null });
      },

      checkSleepTimer: () => {
        const { sleepTimerEnd } = get();
        if (sleepTimerEnd && Date.now() >= sleepTimerEnd) {
          get().pause();
          get().cancelSleepTimer();
        }
      },

      // UI actions
      openFullPlayer: () => {
        set({ fullPlayerOpen: true });
      },

      closeFullPlayer: () => {
        set({ fullPlayerOpen: false });
      },

      toggleFullPlayer: () => {
        const { fullPlayerOpen } = get();
        set({ fullPlayerOpen: !fullPlayerOpen });
      },

      // Internal state updates
      setCurrentTime: (time: number) => {
        set({ currentTime: time });
        get().updateCurrentChapter();
        get().checkSleepTimer();
      },

      setDuration: (duration: number) => {
        set({ duration });
      },

      setPlaying: (playing: boolean) => {
        set({ playing });
      },
    }),
    {
      name: 'podcast-player-storage',
      partialize: (state) => ({
        // Persist queue and playback rate across sessions
        queue: state.queue,
        playbackRate: state.playbackRate,
        volume: state.volume,
        // Resume current episode and position
        currentEpisode: state.currentEpisode,
        currentTime: state.currentTime,
      }),
    }
  )
);
