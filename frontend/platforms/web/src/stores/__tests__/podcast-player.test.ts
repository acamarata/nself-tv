/**
 * Tests for podcast player Zustand store
 */

import { renderHook, act } from '@testing-library/react';
import { usePodcastPlayer, Episode } from '../podcast-player';

// Mock episode data
const mockEpisode: Episode = {
  id: 'ep-1',
  show_id: 'show-1',
  guid: 'guid-1',
  title: 'Test Episode',
  description: 'Test description',
  pub_date: '2024-01-01',
  duration: 3600, // 1 hour
  enclosure_url: 'https://example.com/episode.mp3',
  enclosure_type: 'audio/mpeg',
  show_title: 'Test Podcast',
  show_author: 'Test Author',
  chapters: [
    { start_time: 0, title: 'Intro' },
    { start_time: 300, title: 'Chapter 1' },
    { start_time: 1800, title: 'Chapter 2' },
  ],
};

const mockEpisode2: Episode = {
  ...mockEpisode,
  id: 'ep-2',
  title: 'Test Episode 2',
};

describe('Podcast Player Store', () => {
  beforeEach(() => {
    // Reset store between tests
    const { result } = renderHook(() => usePodcastPlayer());
    act(() => {
      result.current.stop();
      result.current.clearQueue();
    });
  });

  describe('Playback Control', () => {
    it('should play an episode', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
      });

      expect(result.current.currentEpisode).toEqual(mockEpisode);
      expect(result.current.playing).toBe(true);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(3600);
    });

    it('should pause playback', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.pause();
      });

      expect(result.current.playing).toBe(false);
      expect(result.current.currentEpisode).toEqual(mockEpisode);
    });

    it('should resume playback', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.pause();
        result.current.resume();
      });

      expect(result.current.playing).toBe(true);
    });

    it('should stop playback', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.stop();
      });

      expect(result.current.currentEpisode).toBeNull();
      expect(result.current.playing).toBe(false);
      expect(result.current.currentTime).toBe(0);
    });
  });

  describe('Seeking', () => {
    it('should seek to specific time', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.seek(1000);
      });

      expect(result.current.currentTime).toBe(1000);
    });

    it('should clamp seek time to valid range', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.seek(-100); // Negative
      });

      expect(result.current.currentTime).toBe(0);

      act(() => {
        result.current.seek(5000); // Beyond duration
      });

      expect(result.current.currentTime).toBe(3600);
    });

    it('should skip forward', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.setCurrentTime(100);
        result.current.skipForward(30);
      });

      expect(result.current.currentTime).toBe(130);
    });

    it('should skip backward', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.setCurrentTime(100);
        result.current.skipBackward(15);
      });

      expect(result.current.currentTime).toBe(85);
    });
  });

  describe('Playback Rate', () => {
    it('should change playback rate', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.setPlaybackRate(1.5);
      });

      expect(result.current.playbackRate).toBe(1.5);

      act(() => {
        result.current.setPlaybackRate(2.0);
      });

      expect(result.current.playbackRate).toBe(2.0);
    });
  });

  describe('Volume Control', () => {
    it('should change volume', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.setVolume(0.5);
      });

      expect(result.current.volume).toBe(0.5);
    });

    it('should clamp volume to valid range', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.setVolume(-0.5);
      });

      expect(result.current.volume).toBe(0);

      act(() => {
        result.current.setVolume(1.5);
      });

      expect(result.current.volume).toBe(1);
    });
  });

  describe('Chapter Navigation', () => {
    it('should update current chapter when seeking', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
      });

      expect(result.current.currentChapter?.title).toBe('Intro');

      act(() => {
        result.current.seek(500);
      });

      expect(result.current.currentChapter?.title).toBe('Chapter 1');

      act(() => {
        result.current.seek(2000);
      });

      expect(result.current.currentChapter?.title).toBe('Chapter 2');
    });

    it('should go to next chapter', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.nextChapter();
      });

      expect(result.current.currentChapter?.title).toBe('Chapter 1');
      expect(result.current.currentTime).toBe(300);
    });

    it('should go to previous chapter', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.seek(500);
        result.current.prevChapter();
      });

      expect(result.current.currentChapter?.title).toBe('Chapter 1');
      expect(result.current.currentTime).toBe(300);
    });

    it('should restart current chapter if >3s in', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.seek(310); // 10s into Chapter 1
        result.current.prevChapter();
      });

      expect(result.current.currentChapter?.title).toBe('Chapter 1');
      expect(result.current.currentTime).toBe(300);
    });
  });

  describe('Queue Management', () => {
    it('should add episode to queue', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.addToQueue(mockEpisode);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0]).toEqual(mockEpisode);
    });

    it('should not add duplicate episodes', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.addToQueue(mockEpisode);
        result.current.addToQueue(mockEpisode);
      });

      expect(result.current.queue).toHaveLength(1);
    });

    it('should remove episode from queue', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.addToQueue(mockEpisode);
        result.current.addToQueue(mockEpisode2);
        result.current.removeFromQueue('ep-1');
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe('ep-2');
    });

    it('should play next (add to front of queue)', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.addToQueue(mockEpisode);
        result.current.playNext(mockEpisode2);
      });

      expect(result.current.queue[0].id).toBe('ep-2');
      expect(result.current.queue[1].id).toBe('ep-1');
    });

    it('should advance to next episode in queue', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.play(mockEpisode);
        result.current.addToQueue(mockEpisode2);
        result.current.setCurrentTime(3600); // Complete episode
        result.current.setDuration(3600);
        result.current.advanceQueue();
      });

      expect(result.current.currentEpisode?.id).toBe('ep-2');
      expect(result.current.queue).toHaveLength(0);
    });

    it('should clear queue', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.addToQueue(mockEpisode);
        result.current.addToQueue(mockEpisode2);
        result.current.clearQueue();
      });

      expect(result.current.queue).toHaveLength(0);
    });
  });

  describe('Sleep Timer', () => {
    it('should set sleep timer', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.setSleepTimer(30);
      });

      expect(result.current.sleepTimerEnd).toBeGreaterThan(Date.now());
    });

    it('should cancel sleep timer', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      act(() => {
        result.current.setSleepTimer(30);
        result.current.cancelSleepTimer();
      });

      expect(result.current.sleepTimerEnd).toBeNull();
    });
  });

  describe('UI State', () => {
    it('should toggle full player', () => {
      const { result } = renderHook(() => usePodcastPlayer());

      expect(result.current.fullPlayerOpen).toBe(false);

      act(() => {
        result.current.openFullPlayer();
      });

      expect(result.current.fullPlayerOpen).toBe(true);

      act(() => {
        result.current.toggleFullPlayer();
      });

      expect(result.current.fullPlayerOpen).toBe(false);
    });
  });
});
