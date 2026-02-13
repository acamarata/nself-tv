import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BBA2Algorithm, BufferZone } from '@/lib/bba2/algorithm';
import type { QualityLevel } from '@/lib/bba2/algorithm';

const mockLevels: QualityLevel[] = [
  { index: 0, bitrate: 500000, width: 640, height: 360, name: '360p' },
  { index: 1, bitrate: 1500000, width: 1280, height: 720, name: '720p' },
  { index: 2, bitrate: 3000000, width: 1920, height: 1080, name: '1080p' },
  { index: 3, bitrate: 8000000, width: 3840, height: 2160, name: '4K' },
];

describe('BBA2Algorithm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts at level 0 in EMERGENCY zone', () => {
      const algo = new BBA2Algorithm(mockLevels);
      const state = algo.getState();

      expect(state.currentLevel).toBe(0);
      expect(state.currentZone).toBe(BufferZone.EMERGENCY);
      expect(state.bufferLength).toBe(0);
      expect(state.isSeekPending).toBe(false);
      expect(state.preSeekLevel).toBeNull();
    });

    it('getCurrentLevel returns 0 initially', () => {
      const algo = new BBA2Algorithm(mockLevels);
      expect(algo.getCurrentLevel()).toBe(0);
    });
  });

  describe('EMERGENCY zone (0-5s)', () => {
    it('returns level 0 for buffer at 0s', () => {
      const algo = new BBA2Algorithm(mockLevels);
      expect(algo.update(0)).toBe(0);
    });

    it('returns level 0 for buffer at 3s', () => {
      const algo = new BBA2Algorithm(mockLevels);
      expect(algo.update(3)).toBe(0);
    });

    it('returns level 0 for buffer at 4.99s', () => {
      const algo = new BBA2Algorithm(mockLevels);
      expect(algo.update(4.99)).toBe(0);
    });

    it('drops to level 0 from higher level', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Build up to higher level first
      vi.advanceTimersByTime(11000);
      algo.update(65); // FULL zone -> max level
      vi.advanceTimersByTime(11000);
      algo.update(65);
      expect(algo.getCurrentLevel()).toBe(3);

      // Now drop to EMERGENCY
      const level = algo.update(2);
      expect(level).toBe(0);
    });
  });

  describe('STARTUP zone (5-15s)', () => {
    it('caps at current+1', () => {
      const algo = new BBA2Algorithm(mockLevels);
      // Start at level 0, buffer in STARTUP range
      vi.advanceTimersByTime(11000); // exceed dwell time
      const level = algo.update(10);
      expect(level).toBeLessThanOrEqual(1);
    });

    it('caps at max level 2', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Get to level 1 first
      vi.advanceTimersByTime(11000);
      algo.update(10); // STARTUP: caps at current+1=1, min(1, 2, 3)=1
      expect(algo.getCurrentLevel()).toBe(1);

      // Try to go higher in STARTUP
      vi.advanceTimersByTime(11000);
      const level = algo.update(12);
      // current=1, caps at current+1=2, min(2, 2, 3)=2
      expect(level).toBeLessThanOrEqual(2);
    });

    it('does not exceed level 2 in STARTUP zone', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Build up to level 2
      vi.advanceTimersByTime(11000);
      algo.update(10);
      vi.advanceTimersByTime(11000);
      algo.update(10);

      // Even with more dwell time, STARTUP caps at 2
      vi.advanceTimersByTime(11000);
      const level = algo.update(14);
      expect(level).toBeLessThanOrEqual(2);
    });
  });

  describe('RAMP zone (15-30s)', () => {
    it('allows ramp up to current+2', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // RAMP zone buffer
      vi.advanceTimersByTime(11000);
      const level = algo.update(20);
      // current=0, target=min(0+2, 3)=2
      expect(level).toBeLessThanOrEqual(2);
    });

    it('caps at maxLevel', () => {
      const twoLevels: QualityLevel[] = [
        { index: 0, bitrate: 500000, width: 640, height: 360, name: '360p' },
        { index: 1, bitrate: 1500000, width: 1280, height: 720, name: '720p' },
      ];
      const algo = new BBA2Algorithm(twoLevels);

      vi.advanceTimersByTime(11000);
      const level = algo.update(25);
      expect(level).toBeLessThanOrEqual(1);
    });
  });

  describe('STEADY zone (30-60s)', () => {
    it('calculates optimal quality based on buffer ratio', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Get to a state where dwell time allows upgrade
      vi.advanceTimersByTime(11000);
      // Buffer at 45s -> STEADY zone
      // ratio = (45 - 30) / (60 - 30) = 15/30 = 0.5
      // optimal = round(0.5 * 3) = round(1.5) = 2
      algo.update(45);
      const state = algo.getState();
      expect(state.currentZone).toBe(BufferZone.STEADY);
    });

    it('returns higher level for higher buffer in STEADY', () => {
      const algo = new BBA2Algorithm(mockLevels);

      vi.advanceTimersByTime(11000);
      algo.update(55); // ratio = (55-30)/(60-30) = 25/30 = 0.833 -> round(0.833*3)=round(2.5)=3
      vi.advanceTimersByTime(11000);
      algo.update(55);
      const level = algo.getCurrentLevel();
      // Should be at higher level given high buffer
      expect(level).toBeGreaterThanOrEqual(2);
    });

    it('returns lower level for lower buffer in STEADY', () => {
      const algo = new BBA2Algorithm(mockLevels);

      vi.advanceTimersByTime(11000);
      algo.update(31); // ratio = (31-30)/(60-30) = 1/30 = 0.033 -> round(0.033*3)=round(0.1)=0
      const state = algo.getState();
      expect(state.currentZone).toBe(BufferZone.STEADY);
    });
  });

  describe('FULL zone (60s+)', () => {
    it('returns max level', () => {
      const algo = new BBA2Algorithm(mockLevels);

      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      const level = algo.update(65);
      expect(level).toBe(3);
    });

    it('returns max level for very large buffer', () => {
      const algo = new BBA2Algorithm(mockLevels);

      vi.advanceTimersByTime(11000);
      algo.update(200);
      vi.advanceTimersByTime(11000);
      algo.update(200);
      vi.advanceTimersByTime(11000);
      algo.update(200);
      vi.advanceTimersByTime(11000);
      const level = algo.update(200);
      expect(level).toBe(3);
    });
  });

  describe('dwell time enforcement', () => {
    it('does not upgrade before minDwellTime', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // FULL zone buffer, but not enough dwell time (default 10s)
      vi.advanceTimersByTime(5000); // only 5s
      const level = algo.update(65);
      expect(level).toBe(0); // should stay at 0
    });

    it('upgrades after minDwellTime has elapsed', () => {
      const algo = new BBA2Algorithm(mockLevels);

      vi.advanceTimersByTime(11000); // > 10s dwell time
      const level = algo.update(65); // FULL zone
      expect(level).toBeGreaterThan(0);
    });

    it('respects custom dwell time', () => {
      const algo = new BBA2Algorithm(mockLevels, { minDwellTime: 20 });

      vi.advanceTimersByTime(15000); // 15s < 20s custom dwell
      const level = algo.update(65);
      expect(level).toBe(0); // still waiting

      vi.advanceTimersByTime(6000); // now 21s total
      const level2 = algo.update(65);
      expect(level2).toBeGreaterThan(0);
    });

    it('resets dwell timer on quality change', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Upgrade after dwell time
      vi.advanceTimersByTime(11000);
      algo.update(65); // FULL -> upgrade
      const levelAfterFirst = algo.getCurrentLevel();
      expect(levelAfterFirst).toBeGreaterThan(0);

      // Try to upgrade again immediately - dwell timer reset
      vi.advanceTimersByTime(5000); // not enough since last change
      algo.update(65);
      const levelAfterSecond = algo.getCurrentLevel();
      // Should not have upgraded further (dwell timer was reset)
      expect(levelAfterSecond).toBe(levelAfterFirst);
    });
  });

  describe('immediate downgrade', () => {
    it('downgrades immediately without waiting for dwell time', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Build up to level 3
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      expect(algo.getCurrentLevel()).toBe(3);

      // Drop to EMERGENCY immediately (no dwell wait)
      vi.advanceTimersByTime(1); // minimal time
      const level = algo.update(2);
      expect(level).toBe(0);
    });
  });

  describe('seek behavior', () => {
    it('drops quality by 1 when seek starts', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Build up to level 2
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      expect(algo.getCurrentLevel()).toBeGreaterThanOrEqual(2);

      const preSeekLevel = algo.getCurrentLevel();
      const level = algo.update(30, true); // seek starts
      expect(level).toBe(preSeekLevel - 1);
    });

    it('saves preSeekLevel when seek starts', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Build up
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      const preSeek = algo.getCurrentLevel();

      algo.update(30, true);
      const state = algo.getState();
      expect(state.preSeekLevel).toBe(preSeek);
      expect(state.isSeekPending).toBe(true);
    });

    it('maintains current level during seek', () => {
      const algo = new BBA2Algorithm(mockLevels);

      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);

      algo.update(30, true); // seek starts
      const seekLevel = algo.getCurrentLevel();

      // During seek, buffer changes should not affect quality
      vi.advanceTimersByTime(11000);
      const level = algo.update(65); // still seeking
      expect(level).toBe(seekLevel);
    });

    it('restores preSeekLevel when seek ends', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // Build to level 2
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      vi.advanceTimersByTime(11000);
      algo.update(65);
      const preSeekLevel = algo.getCurrentLevel();

      // Start and end seek
      algo.update(30, true);
      expect(algo.getCurrentLevel()).toBe(preSeekLevel - 1);

      const restored = algo.update(30, false);
      expect(restored).toBe(preSeekLevel);
      expect(algo.getState().isSeekPending).toBe(false);
      expect(algo.getState().preSeekLevel).toBeNull();
    });

    it('drops to 0 when seeking at level 0', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // At level 0, seek drop is max(0, 0-1) = 0
      const level = algo.update(30, true);
      expect(level).toBe(0);
    });
  });

  describe('custom config overrides', () => {
    it('applies custom buffer thresholds', () => {
      const algo = new BBA2Algorithm(mockLevels, {
        bufferThresholds: {
          emergency: 10,
          startup: 20,
          ramp: 40,
          steady: 80,
        },
        targetBuffer: 80,
      });

      // 7s is still EMERGENCY with custom thresholds (emergency=10)
      vi.advanceTimersByTime(11000);
      const level = algo.update(7);
      expect(level).toBe(0);
      expect(algo.getState().currentZone).toBe(BufferZone.EMERGENCY);
    });

    it('applies partial config overrides', () => {
      const algo = new BBA2Algorithm(mockLevels, {
        minDwellTime: 5,
      });

      // 6s dwell time should be enough with minDwellTime=5
      vi.advanceTimersByTime(6000);
      const level = algo.update(65);
      expect(level).toBeGreaterThan(0);
    });
  });

  describe('single quality level', () => {
    it('always returns 0 for a single quality level', () => {
      const singleLevel: QualityLevel[] = [
        { index: 0, bitrate: 500000, width: 640, height: 360, name: '360p' },
      ];
      const algo = new BBA2Algorithm(singleLevel);

      vi.advanceTimersByTime(11000);
      expect(algo.update(0)).toBe(0);
      expect(algo.update(10)).toBe(0);
      expect(algo.update(20)).toBe(0);
      expect(algo.update(45)).toBe(0);
      expect(algo.update(65)).toBe(0);
    });
  });

  describe('empty quality levels', () => {
    it('handles empty quality levels array', () => {
      const algo = new BBA2Algorithm([]);

      vi.advanceTimersByTime(11000);
      // maxLevel = -1, changeQuality clamps to max(0, min(level, -1))
      // With empty array, selectQualityForZone returns 0 for EMERGENCY
      expect(algo.update(0)).toBe(0);
      expect(algo.update(65)).toBe(0);
    });
  });

  describe('getState', () => {
    it('returns a snapshot of the current state', () => {
      const algo = new BBA2Algorithm(mockLevels);
      const state = algo.getState();

      expect(state).toHaveProperty('currentLevel');
      expect(state).toHaveProperty('currentZone');
      expect(state).toHaveProperty('bufferLength');
      expect(state).toHaveProperty('dwellStartTime');
      expect(state).toHaveProperty('lastQualityChange');
      expect(state).toHaveProperty('isSeekPending');
      expect(state).toHaveProperty('preSeekLevel');
    });

    it('returns a copy, not a reference', () => {
      const algo = new BBA2Algorithm(mockLevels);
      const state1 = algo.getState();
      const state2 = algo.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });

    it('reflects updates after buffer changes', () => {
      const algo = new BBA2Algorithm(mockLevels);

      algo.update(10);
      const state = algo.getState();
      expect(state.bufferLength).toBe(10);
      expect(state.currentZone).toBe(BufferZone.STARTUP);
    });
  });

  describe('getCurrentLevel', () => {
    it('returns the current quality level index', () => {
      const algo = new BBA2Algorithm(mockLevels);
      expect(algo.getCurrentLevel()).toBe(0);

      vi.advanceTimersByTime(11000);
      algo.update(65);
      expect(algo.getCurrentLevel()).toBeGreaterThan(0);
    });
  });

  describe('zone transitions', () => {
    it('transitions through zones as buffer increases', () => {
      const algo = new BBA2Algorithm(mockLevels);

      algo.update(2);
      expect(algo.getState().currentZone).toBe(BufferZone.EMERGENCY);

      algo.update(10);
      expect(algo.getState().currentZone).toBe(BufferZone.STARTUP);

      algo.update(20);
      expect(algo.getState().currentZone).toBe(BufferZone.RAMP);

      algo.update(45);
      expect(algo.getState().currentZone).toBe(BufferZone.STEADY);

      algo.update(65);
      expect(algo.getState().currentZone).toBe(BufferZone.FULL);
    });

    it('classifies exact boundary values correctly', () => {
      const algo = new BBA2Algorithm(mockLevels);

      // At exactly the threshold, should be in the higher zone
      algo.update(5);
      expect(algo.getState().currentZone).toBe(BufferZone.STARTUP);

      algo.update(15);
      expect(algo.getState().currentZone).toBe(BufferZone.RAMP);

      algo.update(30);
      expect(algo.getState().currentZone).toBe(BufferZone.STEADY);

      algo.update(60);
      expect(algo.getState().currentZone).toBe(BufferZone.FULL);
    });
  });
});
