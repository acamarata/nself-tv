import { describe, it, expect } from 'vitest';
import {
  filterByContentRating,
  isRatingAllowed,
  getRatingLevel,
  compareRatings
} from './content-rating';
import type { BaseMedia } from '../models';

const createMedia = (rating: string): BaseMedia => ({
  id: '1',
  type: 'movie',
  title: 'Test',
  rating: rating as any,
  genres: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
});

describe('filterByContentRating', () => {
  const tvYItem = createMedia('TV-Y');
  const tvY7Item = createMedia('TV-Y7');
  const gItem = createMedia('G');
  const tvGItem = createMedia('TV-G');
  const pgItem = createMedia('PG');
  const tvPGItem = createMedia('TV-PG');
  const pg13Item = createMedia('PG-13');
  const tv14Item = createMedia('TV-14');
  const rItem = createMedia('R');
  const tvMAItem = createMedia('TV-MA');
  const nc17Item = createMedia('NC-17');
  const nrItem = createMedia('NR');

  const allItems = [
    tvYItem,
    tvY7Item,
    gItem,
    tvGItem,
    pgItem,
    tvPGItem,
    pg13Item,
    tv14Item,
    rItem,
    tvMAItem,
    nc17Item,
    nrItem
  ];

  it('should filter items with TV-Y maxRating', () => {
    const filtered = filterByContentRating(allItems, 'TV-Y');
    expect(filtered).toEqual([tvYItem]);
  });

  it('should filter items with TV-PG maxRating', () => {
    const filtered = filterByContentRating(allItems, 'TV-PG');
    expect(filtered).toEqual([
      tvYItem,
      tvY7Item,
      gItem,
      tvGItem,
      pgItem,
      tvPGItem
    ]);
  });

  it('should filter items with TV-MA maxRating', () => {
    const filtered = filterByContentRating(allItems, 'TV-MA');
    expect(filtered).toEqual([
      tvYItem,
      tvY7Item,
      gItem,
      tvGItem,
      pgItem,
      tvPGItem,
      pg13Item,
      tv14Item,
      rItem,
      tvMAItem
    ]);
  });

  it('should filter items with NR maxRating (all items)', () => {
    const filtered = filterByContentRating(allItems, 'NR');
    expect(filtered).toEqual(allItems);
  });

  it('should exclude items above maxRating', () => {
    const items = [tvPGItem, tvMAItem, rItem];
    const filtered = filterByContentRating(items, 'TV-PG');
    expect(filtered).toEqual([tvPGItem]);
  });

  it('should return all items if maxRating not in hierarchy', () => {
    const items = [tvPGItem, tvMAItem];
    const filtered = filterByContentRating(items, 'UNKNOWN' as any);
    expect(filtered).toEqual(items);
  });

  it('should exclude items with unknown rating (conservative)', () => {
    const unknownItem = createMedia('UNKNOWN');
    const items = [tvPGItem, unknownItem];
    const filtered = filterByContentRating(items, 'TV-PG');
    expect(filtered).toEqual([tvPGItem]);
  });

  it('should handle empty array', () => {
    const filtered = filterByContentRating([], 'TV-PG');
    expect(filtered).toEqual([]);
  });
});

describe('isRatingAllowed', () => {
  it('should allow TV-Y under TV-PG', () => {
    expect(isRatingAllowed('TV-Y', 'TV-PG')).toBe(true);
  });

  it('should allow TV-PG under TV-PG', () => {
    expect(isRatingAllowed('TV-PG', 'TV-PG')).toBe(true);
  });

  it('should not allow TV-MA under TV-PG', () => {
    expect(isRatingAllowed('TV-MA', 'TV-PG')).toBe(false);
  });

  it('should not allow NC-17 under R', () => {
    expect(isRatingAllowed('NC-17', 'R')).toBe(false);
  });

  it('should return false for unknown ratings', () => {
    expect(isRatingAllowed('UNKNOWN' as any, 'TV-PG')).toBe(false);
    expect(isRatingAllowed('TV-PG', 'UNKNOWN' as any)).toBe(false);
  });
});

describe('getRatingLevel', () => {
  it('should return correct level for TV-Y', () => {
    expect(getRatingLevel('TV-Y')).toBe(0);
  });

  it('should return correct level for TV-PG', () => {
    expect(getRatingLevel('TV-PG')).toBe(5);
  });

  it('should return correct level for NR', () => {
    expect(getRatingLevel('NR')).toBe(11);
  });

  it('should return -1 for unknown rating', () => {
    expect(getRatingLevel('UNKNOWN' as any)).toBe(-1);
  });
});

describe('compareRatings', () => {
  it('should return negative when a < b', () => {
    expect(compareRatings('TV-Y', 'TV-PG')).toBeLessThan(0);
    expect(compareRatings('G', 'R')).toBeLessThan(0);
  });

  it('should return 0 when a === b', () => {
    expect(compareRatings('TV-PG', 'TV-PG')).toBe(0);
    expect(compareRatings('R', 'R')).toBe(0);
  });

  it('should return positive when a > b', () => {
    expect(compareRatings('TV-MA', 'TV-PG')).toBeGreaterThan(0);
    expect(compareRatings('NC-17', 'G')).toBeGreaterThan(0);
  });

  it('should handle unknown ratings', () => {
    expect(compareRatings('UNKNOWN' as any, 'UNKNOWN' as any)).toBe(0);
    expect(compareRatings('UNKNOWN' as any, 'TV-PG')).toBeGreaterThan(0); // Unknown considered more restrictive
    expect(compareRatings('TV-PG', 'UNKNOWN' as any)).toBeLessThan(0);
  });
});
