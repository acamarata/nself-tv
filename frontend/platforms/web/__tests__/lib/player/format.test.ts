import { describe, it, expect } from 'vitest';
import { formatTime, parseTime, timeToPercent } from '@/lib/player/format';

describe('formatTime', () => {
  it('returns 00:00 for NaN', () => {
    expect(formatTime(NaN)).toBe('00:00');
  });

  it('returns 00:00 for Infinity', () => {
    expect(formatTime(Infinity)).toBe('00:00');
  });

  it('returns 00:00 for negative Infinity', () => {
    expect(formatTime(-Infinity)).toBe('00:00');
  });

  it('returns 00:00 for negative values', () => {
    expect(formatTime(-1)).toBe('00:00');
    expect(formatTime(-100)).toBe('00:00');
  });

  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(30)).toBe('00:30');
    expect(formatTime(59)).toBe('00:59');
  });

  it('formats exactly 60 seconds as 01:00', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(125)).toBe('02:05');
    expect(formatTime(3599)).toBe('59:59');
  });

  it('formats exactly 3600 seconds with hours', () => {
    expect(formatTime(3600)).toBe('01:00:00');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTime(3661)).toBe('01:01:01');
    expect(formatTime(7200)).toBe('02:00:00');
    expect(formatTime(7384)).toBe('02:03:04');
  });

  it('pads single digits with leading zeros', () => {
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(61)).toBe('01:01');
    expect(formatTime(3601)).toBe('01:00:01');
  });

  it('floors fractional seconds', () => {
    expect(formatTime(1.9)).toBe('00:01');
    expect(formatTime(59.999)).toBe('00:59');
    expect(formatTime(3661.5)).toBe('01:01:01');
  });

  it('handles large values', () => {
    expect(formatTime(86400)).toBe('24:00:00');
    expect(formatTime(360000)).toBe('100:00:00');
  });
});

describe('parseTime', () => {
  it('parses MM:SS format', () => {
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('00:30')).toBe(30);
    expect(parseTime('01:00')).toBe(60);
    expect(parseTime('01:30')).toBe(90);
    expect(parseTime('59:59')).toBe(3599);
  });

  it('parses HH:MM:SS format', () => {
    expect(parseTime('01:00:00')).toBe(3600);
    expect(parseTime('01:01:01')).toBe(3661);
    expect(parseTime('02:03:04')).toBe(7384);
    expect(parseTime('00:00:00')).toBe(0);
  });

  it('returns 0 for invalid format', () => {
    expect(parseTime('')).toBe(0);
    expect(parseTime('abc')).toBe(0);
    expect(parseTime('1')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseTime('')).toBe(0);
  });

  it('handles single-segment string', () => {
    expect(parseTime('30')).toBe(0);
  });
});

describe('formatTime/parseTime round-trip', () => {
  it('round-trips MM:SS values', () => {
    const values = [0, 1, 30, 59, 60, 90, 125, 3599];
    for (const seconds of values) {
      expect(parseTime(formatTime(seconds))).toBe(seconds);
    }
  });

  it('round-trips HH:MM:SS values', () => {
    const values = [3600, 3661, 7200, 7384];
    for (const seconds of values) {
      expect(parseTime(formatTime(seconds))).toBe(seconds);
    }
  });
});

describe('timeToPercent', () => {
  it('returns 0 for NaN currentTime', () => {
    expect(timeToPercent(NaN, 100)).toBe(0);
  });

  it('returns 0 for NaN duration', () => {
    expect(timeToPercent(50, NaN)).toBe(0);
  });

  it('returns 0 for Infinity currentTime', () => {
    expect(timeToPercent(Infinity, 100)).toBe(0);
  });

  it('returns 0 for Infinity duration', () => {
    expect(timeToPercent(50, Infinity)).toBe(0);
  });

  it('returns 0 for zero duration', () => {
    expect(timeToPercent(50, 0)).toBe(0);
  });

  it('returns 0 for negative duration', () => {
    expect(timeToPercent(50, -10)).toBe(0);
  });

  it('calculates correct percentage', () => {
    expect(timeToPercent(50, 100)).toBe(50);
    expect(timeToPercent(25, 100)).toBe(25);
    expect(timeToPercent(100, 100)).toBe(100);
    expect(timeToPercent(0, 100)).toBe(0);
  });

  it('clamps to maximum 100', () => {
    expect(timeToPercent(150, 100)).toBe(100);
    expect(timeToPercent(200, 50)).toBe(100);
  });

  it('clamps to minimum 0', () => {
    expect(timeToPercent(-50, 100)).toBe(0);
  });

  it('handles fractional values', () => {
    expect(timeToPercent(1, 3)).toBeCloseTo(33.333, 2);
    expect(timeToPercent(2, 3)).toBeCloseTo(66.667, 2);
  });
});
