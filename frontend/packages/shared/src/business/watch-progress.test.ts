import { describe, it, expect } from 'vitest';
import {
  COMPLETION_THRESHOLD,
  calculateWatchProgress,
  isCompleted,
  getRemainingTime,
  formatTime,
  getResumePosition
} from './watch-progress';

describe('calculateWatchProgress', () => {
  it('should calculate progress correctly', () => {
    expect(calculateWatchProgress(5700, 6000)).toBe(95);
    expect(calculateWatchProgress(3000, 6000)).toBe(50);
    expect(calculateWatchProgress(0, 6000)).toBe(0);
    expect(calculateWatchProgress(6000, 6000)).toBe(100);
  });

  it('should round progress to nearest integer', () => {
    expect(calculateWatchProgress(3333, 10000)).toBe(33); // 33.33% rounded
    expect(calculateWatchProgress(6667, 10000)).toBe(67); // 66.67% rounded
  });

  it('should cap progress at 100%', () => {
    expect(calculateWatchProgress(7000, 6000)).toBe(100);
    expect(calculateWatchProgress(10000, 6000)).toBe(100);
  });

  it('should return 0 for invalid duration', () => {
    expect(calculateWatchProgress(100, 0)).toBe(0);
    expect(calculateWatchProgress(100, -100)).toBe(0);
    expect(calculateWatchProgress(100, Infinity)).toBe(0);
    expect(calculateWatchProgress(100, NaN)).toBe(0);
  });

  it('should return 0 for invalid currentTime', () => {
    expect(calculateWatchProgress(-100, 6000)).toBe(0);
    expect(calculateWatchProgress(Infinity, 6000)).toBe(0);
    expect(calculateWatchProgress(NaN, 6000)).toBe(0);
  });
});

describe('isCompleted', () => {
  it('should return true when progress >= 95', () => {
    expect(isCompleted(95)).toBe(true);
    expect(isCompleted(96)).toBe(true);
    expect(isCompleted(100)).toBe(true);
    expect(isCompleted(COMPLETION_THRESHOLD)).toBe(true);
  });

  it('should return false when progress < 95', () => {
    expect(isCompleted(94)).toBe(false);
    expect(isCompleted(94.9)).toBe(false);
    expect(isCompleted(50)).toBe(false);
    expect(isCompleted(0)).toBe(false);
  });

  it('should handle edge case at exact threshold', () => {
    expect(isCompleted(95.0)).toBe(true);
    expect(isCompleted(94.999)).toBe(false);
  });
});

describe('getRemainingTime', () => {
  it('should calculate remaining time correctly', () => {
    expect(getRemainingTime(300, 6000)).toBe(5700);
    expect(getRemainingTime(5700, 6000)).toBe(300);
    expect(getRemainingTime(0, 6000)).toBe(6000);
  });

  it('should return 0 when currentTime >= duration', () => {
    expect(getRemainingTime(6000, 6000)).toBe(0);
    expect(getRemainingTime(7000, 6000)).toBe(0);
  });

  it('should return 0 for invalid inputs', () => {
    expect(getRemainingTime(100, 0)).toBe(0);
    expect(getRemainingTime(100, -100)).toBe(0);
    expect(getRemainingTime(-100, 6000)).toBe(0);
  });

  it('should handle very small remaining time', () => {
    expect(getRemainingTime(5999, 6000)).toBe(1);
  });
});

describe('formatTime', () => {
  it('should format time with hours', () => {
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7200)).toBe('2:00:00');
    expect(formatTime(3600)).toBe('1:00:00');
  });

  it('should format time without hours', () => {
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(59)).toBe('0:59');
  });

  it('should pad minutes and seconds with zero', () => {
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(3605)).toBe('1:00:05');
  });

  it('should handle invalid inputs', () => {
    expect(formatTime(-100)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('should handle large time values', () => {
    expect(formatTime(36000)).toBe('10:00:00');
    expect(formatTime(359999)).toBe('99:59:59');
  });
});

describe('getResumePosition', () => {
  it('should return 0 when progress < 3%', () => {
    const duration = 6000;
    expect(getResumePosition(100, duration)).toBe(0); // 1.67% → rounds to 2% → < 3
    expect(getResumePosition(149, duration)).toBe(0); // 2.48% → rounds to 2% → < 3
  });

  it('should return currentTime when 3% <= progress < 95%', () => {
    const duration = 6000;
    expect(getResumePosition(200, duration)).toBe(200); // 3.33%
    expect(getResumePosition(3000, duration)).toBe(3000); // 50%
    expect(getResumePosition(5600, duration)).toBe(5600); // 93.33%
  });

  it('should return 0 when progress >= 95% (completed)', () => {
    const duration = 6000;
    expect(getResumePosition(5700, duration)).toBe(0); // 95%
    expect(getResumePosition(5800, duration)).toBe(0); // 96.67%
    expect(getResumePosition(6000, duration)).toBe(0); // 100%
  });

  it('should handle edge cases at thresholds', () => {
    const duration = 10000;
    expect(getResumePosition(299, duration)).toBe(299); // 3% (rounds to 3%)
    expect(getResumePosition(300, duration)).toBe(300); // 3%
    expect(getResumePosition(9449, duration)).toBe(9449); // 94.49% (rounds to 94%, so resume)
    expect(getResumePosition(9500, duration)).toBe(0); // 95% (completed, start from beginning)
  });
});
