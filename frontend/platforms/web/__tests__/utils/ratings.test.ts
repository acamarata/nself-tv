import { describe, it, expect } from 'vitest';
import {
  tvRatingIndex,
  movieRatingIndex,
  isTvRatingAllowed,
  isMovieRatingAllowed,
  isContentAllowed,
  formatRuntime,
  formatProgress,
  TV_RATING_ORDER,
  MOVIE_RATING_ORDER,
} from '@/utils/ratings';

describe('tvRatingIndex', () => {
  it('returns correct indices', () => {
    expect(tvRatingIndex('TV-Y')).toBe(0);
    expect(tvRatingIndex('TV-Y7')).toBe(1);
    expect(tvRatingIndex('TV-G')).toBe(2);
    expect(tvRatingIndex('TV-PG')).toBe(3);
    expect(tvRatingIndex('TV-14')).toBe(4);
    expect(tvRatingIndex('TV-MA')).toBe(5);
  });
});

describe('movieRatingIndex', () => {
  it('returns correct indices', () => {
    expect(movieRatingIndex('G')).toBe(0);
    expect(movieRatingIndex('PG')).toBe(1);
    expect(movieRatingIndex('PG-13')).toBe(2);
    expect(movieRatingIndex('R')).toBe(3);
    expect(movieRatingIndex('NC-17')).toBe(4);
  });
});

describe('isTvRatingAllowed', () => {
  it('allows ratings at or below max', () => {
    expect(isTvRatingAllowed('TV-Y', 'TV-PG')).toBe(true);
    expect(isTvRatingAllowed('TV-Y7', 'TV-PG')).toBe(true);
    expect(isTvRatingAllowed('TV-G', 'TV-PG')).toBe(true);
    expect(isTvRatingAllowed('TV-PG', 'TV-PG')).toBe(true);
  });

  it('blocks ratings above max', () => {
    expect(isTvRatingAllowed('TV-14', 'TV-PG')).toBe(false);
    expect(isTvRatingAllowed('TV-MA', 'TV-PG')).toBe(false);
  });

  it('allows unknown ratings', () => {
    expect(isTvRatingAllowed('UNKNOWN', 'TV-PG')).toBe(true);
  });

  it('handles TV-MA max allowing everything', () => {
    for (const rating of TV_RATING_ORDER) {
      expect(isTvRatingAllowed(rating, 'TV-MA')).toBe(true);
    }
  });

  it('handles TV-Y max blocking most', () => {
    expect(isTvRatingAllowed('TV-Y', 'TV-Y')).toBe(true);
    expect(isTvRatingAllowed('TV-Y7', 'TV-Y')).toBe(false);
    expect(isTvRatingAllowed('TV-MA', 'TV-Y')).toBe(false);
  });
});

describe('isMovieRatingAllowed', () => {
  it('allows ratings at or below max', () => {
    expect(isMovieRatingAllowed('G', 'PG-13')).toBe(true);
    expect(isMovieRatingAllowed('PG', 'PG-13')).toBe(true);
    expect(isMovieRatingAllowed('PG-13', 'PG-13')).toBe(true);
  });

  it('blocks ratings above max', () => {
    expect(isMovieRatingAllowed('R', 'PG-13')).toBe(false);
    expect(isMovieRatingAllowed('NC-17', 'PG-13')).toBe(false);
  });

  it('allows unknown ratings', () => {
    expect(isMovieRatingAllowed('NR', 'PG-13')).toBe(true);
  });
});

describe('isContentAllowed', () => {
  it('allows null content rating', () => {
    expect(isContentAllowed(null, 'TV-PG', 'PG-13')).toBe(true);
  });

  it('checks TV ratings correctly', () => {
    expect(isContentAllowed('TV-Y', 'TV-PG', 'PG-13')).toBe(true);
    expect(isContentAllowed('TV-MA', 'TV-PG', 'PG-13')).toBe(false);
  });

  it('checks movie ratings correctly', () => {
    expect(isContentAllowed('G', 'TV-PG', 'PG-13')).toBe(true);
    expect(isContentAllowed('R', 'TV-PG', 'PG-13')).toBe(false);
  });

  it('allows unknown rating types', () => {
    expect(isContentAllowed('CUSTOM', 'TV-PG', 'PG-13')).toBe(true);
  });
});

describe('formatRuntime', () => {
  it('formats hours and minutes', () => {
    expect(formatRuntime(142)).toBe('2h 22m');
  });

  it('formats hours only', () => {
    expect(formatRuntime(120)).toBe('2h');
  });

  it('formats minutes only', () => {
    expect(formatRuntime(45)).toBe('45m');
  });

  it('returns empty string for null', () => {
    expect(formatRuntime(null)).toBe('');
  });

  it('returns empty string for 0', () => {
    expect(formatRuntime(0)).toBe('');
  });
});

describe('formatProgress', () => {
  it('rounds to nearest integer', () => {
    expect(formatProgress(45.7)).toBe('46%');
    expect(formatProgress(33.3)).toBe('33%');
    expect(formatProgress(100)).toBe('100%');
    expect(formatProgress(0)).toBe('0%');
  });
});

describe('rating order arrays', () => {
  it('TV_RATING_ORDER has 6 ratings', () => {
    expect(TV_RATING_ORDER).toHaveLength(6);
  });

  it('MOVIE_RATING_ORDER has 5 ratings', () => {
    expect(MOVIE_RATING_ORDER).toHaveLength(5);
  });
});
