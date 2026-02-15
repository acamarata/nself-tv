/**
 * Tests for formatting utilities
 */

import { formatTime, formatBytes, formatRelativeTime } from '../format';

describe('formatTime', () => {
  it('should format seconds as MM:SS', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(599)).toBe('9:59');
  });

  it('should format seconds as HH:MM:SS for >= 1 hour', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7200)).toBe('2:00:00');
  });

  it('should handle edge cases', () => {
    expect(formatTime(-10)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('should pad single digits', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
  });
});

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should use decimal places for non-exact values', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2024-01-01T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should format recent times', () => {
    expect(formatRelativeTime(new Date('2024-01-01T11:59:30Z'))).toBe('just now');
    expect(formatRelativeTime(new Date('2024-01-01T11:50:00Z'))).toBe('10m ago');
    expect(formatRelativeTime(new Date('2024-01-01T10:00:00Z'))).toBe('2h ago');
  });

  it('should format days and weeks', () => {
    expect(formatRelativeTime(new Date('2023-12-30T12:00:00Z'))).toBe('2d ago');
    expect(formatRelativeTime(new Date('2023-12-25T12:00:00Z'))).toBe('1w ago');
  });

  it('should format months and years', () => {
    expect(formatRelativeTime(new Date('2023-11-01T12:00:00Z'))).toBe('2mo ago');
    expect(formatRelativeTime(new Date('2022-01-01T12:00:00Z'))).toBe('2y ago');
  });

  it('should handle string dates', () => {
    expect(formatRelativeTime('2024-01-01T11:50:00Z')).toBe('10m ago');
  });
});
