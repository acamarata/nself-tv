import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDuration,
  formatFileSize,
  formatPercentage,
  formatNumber,
  truncate,
  formatRelativeTime
} from './format';

describe('formatDate', () => {
  it('should format date without time', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDate(date);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('should format date with time', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDate(date, true);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('should handle date string input', () => {
    const formatted = formatDate('2024-01-15T10:30:00Z');
    expect(formatted).toContain('2024');
  });

  it('should handle invalid date', () => {
    expect(formatDate('invalid')).toBe('Invalid date');
    expect(formatDate(new Date('invalid'))).toBe('Invalid date');
  });
});

describe('formatDuration', () => {
  it('should format duration with hours and minutes', () => {
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(7200)).toBe('2h');
    expect(formatDuration(7260)).toBe('2h 1m');
  });

  it('should format duration with only minutes', () => {
    expect(formatDuration(2700)).toBe('45m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(300)).toBe('5m');
  });

  it('should handle zero duration', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('should handle invalid inputs', () => {
    expect(formatDuration(-100)).toBe('0m');
    expect(formatDuration(Infinity)).toBe('0m');
    expect(formatDuration(NaN)).toBe('0m');
  });

  it('should handle very large durations', () => {
    expect(formatDuration(36000)).toBe('10h');
    expect(formatDuration(36060)).toBe('10h 1m');
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
    expect(formatFileSize(1610612736)).toBe('1.5 GB');
  });

  it('should format terabytes', () => {
    expect(formatFileSize(1099511627776)).toBe('1 TB');
  });

  it('should handle custom decimals', () => {
    expect(formatFileSize(1536, 0)).toBe('2 KB');
    expect(formatFileSize(1536, 1)).toBe('1.5 KB');
    expect(formatFileSize(1536, 3)).toBe('1.5 KB');
  });

  it('should handle invalid inputs', () => {
    expect(formatFileSize(-100)).toBe('Invalid size');
    expect(formatFileSize(Infinity)).toBe('Invalid size');
    expect(formatFileSize(NaN)).toBe('Invalid size');
  });
});

describe('formatPercentage', () => {
  it('should format percentage without decimals', () => {
    expect(formatPercentage(50)).toBe('50%');
    expect(formatPercentage(100)).toBe('100%');
    expect(formatPercentage(0)).toBe('0%');
  });

  it('should format percentage with decimals', () => {
    expect(formatPercentage(50.5, 1)).toBe('50.5%');
    expect(formatPercentage(99.99, 2)).toBe('99.99%');
  });

  it('should handle invalid inputs', () => {
    expect(formatPercentage(Infinity)).toBe('0%');
    expect(formatPercentage(NaN)).toBe('0%');
  });
});

describe('formatNumber', () => {
  it('should format numbers with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('should handle small numbers', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(999)).toBe('999');
  });

  it('should handle invalid inputs', () => {
    expect(formatNumber(Infinity)).toBe('0');
    expect(formatNumber(NaN)).toBe('0');
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
    expect(truncate('This is a very long string', 10)).toBe('This is...');
  });

  it('should not truncate short strings', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
    expect(truncate('Test', 4)).toBe('Test');
  });

  it('should handle exact length match', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('should handle empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('formatRelativeTime', () => {
  it('should handle "just now"', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('should handle minutes ago', () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - 5);
    expect(formatRelativeTime(date)).toBe('5 minutes ago');

    date.setMinutes(date.getMinutes() + 4); // 1 minute ago
    expect(formatRelativeTime(date)).toBe('1 minute ago');
  });

  it('should handle hours ago', () => {
    const date = new Date();
    date.setHours(date.getHours() - 3);
    expect(formatRelativeTime(date)).toBe('3 hours ago');

    date.setHours(date.getHours() + 2); // 1 hour ago
    expect(formatRelativeTime(date)).toBe('1 hour ago');
  });

  it('should handle days ago', () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    expect(formatRelativeTime(date)).toBe('3 days ago');

    date.setDate(date.getDate() + 2); // 1 day ago
    expect(formatRelativeTime(date)).toBe('1 day ago');
  });

  it('should handle weeks ago', () => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    expect(formatRelativeTime(date)).toBe('2 weeks ago');
  });

  it('should handle months ago', () => {
    const date = new Date();
    date.setDate(date.getDate() - 60);
    expect(formatRelativeTime(date)).toBe('2 months ago');
  });

  it('should handle years ago', () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 2);
    expect(formatRelativeTime(date)).toBe('2 years ago');
  });

  it('should handle date string input', () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - 5);
    expect(formatRelativeTime(date.toISOString())).toBe('5 minutes ago');
  });

  it('should handle invalid date', () => {
    expect(formatRelativeTime('invalid')).toBe('Invalid date');
    expect(formatRelativeTime(new Date('invalid'))).toBe('Invalid date');
  });
});
