import { describe, it, expect } from 'vitest';
import {
  calculateRecommendationScore,
  sortByRecommendationScore,
  calculateTrendingScore
} from './recommendations';
import type { BaseMedia } from '../models';

const createMedia = (overrides: Partial<BaseMedia> = {}): BaseMedia => ({
  id: '1',
  type: 'movie',
  title: 'Test',
  rating: 'PG',
  genres: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  ...overrides
});

describe('calculateRecommendationScore', () => {
  it('should calculate score with user rating (40% weight)', () => {
    const media = createMedia();
    const score = calculateRecommendationScore(media, 5); // Max rating
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it('should calculate score with view count (30% weight)', () => {
    const media = createMedia();
    const score = calculateRecommendationScore(media, undefined, 10000);
    expect(score).toBeGreaterThan(0);
  });

  it('should calculate score with recency (20% weight)', () => {
    const media = createMedia({ releaseDate: new Date().toISOString() }); // Very recent
    const score = calculateRecommendationScore(media, undefined, 0, media.releaseDate);
    expect(score).toBeGreaterThan(0);
  });

  it('should calculate score with genre match (10% weight)', () => {
    const media = createMedia({ genres: ['Action', 'Thriller'] });
    const score = calculateRecommendationScore(media, undefined, 0, undefined, ['Action', 'Drama']);
    expect(score).toBeGreaterThan(0);
  });

  it('should combine all factors', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7); // 1 week ago

    const media = createMedia({
      genres: ['Action', 'Sci-Fi'],
      releaseDate: recentDate.toISOString()
    });

    const score = calculateRecommendationScore(
      media,
      5, // Max user rating
      10000, // High view count
      media.releaseDate,
      ['Action', 'Sci-Fi'] // Perfect genre match
    );

    expect(score).toBeGreaterThan(50); // Should be high with all factors
  });

  it('should handle missing user rating', () => {
    const media = createMedia();
    const score = calculateRecommendationScore(media, undefined, 1000);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(100);
  });

  it('should normalize view count logarithmically', () => {
    const media = createMedia();
    const score1 = calculateRecommendationScore(media, undefined, 100);
    const score2 = calculateRecommendationScore(media, undefined, 10000);
    expect(score2).toBeGreaterThan(score1);
  });

  it('should decay recency score for old content', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

    const media = createMedia({ releaseDate: oldDate.toISOString() });
    const score = calculateRecommendationScore(media, undefined, 0, media.releaseDate);
    // Recency score should be low or zero for old content
    expect(score).toBeLessThan(20);
  });

  it('should handle partial genre match', () => {
    const media = createMedia({ genres: ['Action', 'Comedy', 'Drama'] });
    const score = calculateRecommendationScore(
      media,
      undefined,
      0,
      undefined,
      ['Action'] // Only 1 of 3 genres match
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(10); // Genre weight is 10%
  });

  it('should handle no genre match', () => {
    const media = createMedia({ genres: ['Action'] });
    const score = calculateRecommendationScore(
      media,
      undefined,
      0,
      undefined,
      ['Drama'] // No match
    );
    expect(score).toBe(0); // No factors contributing
  });

  it('should cap score at 100', () => {
    const recentDate = new Date();
    const media = createMedia({
      genres: ['Action'],
      releaseDate: recentDate.toISOString()
    });

    const score = calculateRecommendationScore(
      media,
      5, // Max rating
      100000, // Very high views
      media.releaseDate,
      ['Action']
    );

    expect(score).toBeLessThanOrEqual(100);
  });

  it('should validate user rating range', () => {
    const media = createMedia();
    // Invalid ratings should be ignored
    expect(calculateRecommendationScore(media, 0, 0)).toBe(0);
    expect(calculateRecommendationScore(media, 6, 0)).toBe(0);
    expect(calculateRecommendationScore(media, -1, 0)).toBe(0);
  });
});

describe('sortByRecommendationScore', () => {
  it('should sort items by score descending', () => {
    const items = [
      { id: '1', score: 50 },
      { id: '2', score: 90 },
      { id: '3', score: 30 }
    ];

    const sorted = sortByRecommendationScore(items);

    expect(sorted[0].score).toBe(90);
    expect(sorted[1].score).toBe(50);
    expect(sorted[2].score).toBe(30);
  });

  it('should not mutate original array', () => {
    const items = [
      { id: '1', score: 50 },
      { id: '2', score: 90 }
    ];

    const sorted = sortByRecommendationScore(items);

    expect(sorted).not.toBe(items);
    expect(items[0].score).toBe(50); // Original unchanged
  });

  it('should handle empty array', () => {
    const sorted = sortByRecommendationScore([]);
    expect(sorted).toEqual([]);
  });

  it('should handle single item', () => {
    const items = [{ id: '1', score: 50 }];
    const sorted = sortByRecommendationScore(items);
    expect(sorted).toEqual(items);
  });
});

describe('calculateTrendingScore', () => {
  it('should calculate score with all factors', () => {
    const score = calculateTrendingScore(
      1000, // High views in 24h
      4.5, // High rating
      80 // High completion rate
    );

    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should weight views at 50%', () => {
    const score = calculateTrendingScore(1000, 0, 0);
    // Should get points from views alone
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(50);
  });

  it('should weight rating at 30%', () => {
    const score = calculateTrendingScore(0, 5, 0);
    expect(score).toBe(30); // 5/5 * 30 = 30
  });

  it('should weight completion at 20%', () => {
    const score = calculateTrendingScore(0, 0, 100);
    expect(score).toBe(20); // 100/100 * 20 = 20
  });

  it('should normalize view count logarithmically', () => {
    const score1 = calculateTrendingScore(100, 0, 0);
    const score2 = calculateTrendingScore(1000, 0, 0);
    expect(score2).toBeGreaterThan(score1);
  });

  it('should handle zero views', () => {
    const score = calculateTrendingScore(0, 4, 50);
    expect(score).toBeGreaterThan(0); // Rating and completion still contribute
  });

  it('should handle zero rating', () => {
    const score = calculateTrendingScore(500, 0, 50);
    expect(score).toBeGreaterThan(0); // Views and completion still contribute
  });

  it('should cap score at 100', () => {
    const score = calculateTrendingScore(10000, 5, 100);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should handle perfect trending content', () => {
    const score = calculateTrendingScore(
      1000, // Max normalized views
      5, // Max rating
      100 // Max completion
    );

    expect(score).toBeGreaterThan(80);
    expect(score).toBeLessThanOrEqual(100);
  });
});
