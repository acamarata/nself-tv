import { RATING_HIERARCHY, type ContentRating } from '../constants';
import type { BaseMedia } from '../models';

/**
 * Filter media items by content rating
 *
 * Filters out content that exceeds the specified maximum rating
 * based on the rating hierarchy (TV-Y < TV-Y7 < G < TV-G < PG < TV-PG < PG-13 < TV-14 < R < TV-MA < NC-17 < NR)
 *
 * @param items - Array of media items to filter
 * @param maxRating - Maximum allowed content rating
 * @returns Filtered array containing only items with rating <= maxRating
 *
 * @example
 * filterByContentRating([{rating: 'TV-MA'}, {rating: 'TV-PG'}], 'TV-PG')
 * // Returns [{rating: 'TV-PG'}]
 */
export function filterByContentRating<T extends BaseMedia>(
  items: T[],
  maxRating: ContentRating
): T[] {
  const maxRatingIndex = RATING_HIERARCHY.indexOf(maxRating);

  // If maxRating not found in hierarchy, return all items (permissive fallback)
  if (maxRatingIndex === -1) {
    return items;
  }

  return items.filter((item) => {
    const itemRatingIndex = RATING_HIERARCHY.indexOf(item.rating);

    // If item rating not found, exclude it (conservative fallback)
    if (itemRatingIndex === -1) {
      return false;
    }

    // Include if item rating is less restrictive or equal to max rating
    return itemRatingIndex <= maxRatingIndex;
  });
}

/**
 * Check if a content rating is allowed under a maximum rating
 *
 * @param rating - Rating to check
 * @param maxRating - Maximum allowed rating
 * @returns True if rating is allowed (less restrictive or equal)
 */
export function isRatingAllowed(rating: ContentRating, maxRating: ContentRating): boolean {
  const ratingIndex = RATING_HIERARCHY.indexOf(rating);
  const maxRatingIndex = RATING_HIERARCHY.indexOf(maxRating);

  if (ratingIndex === -1 || maxRatingIndex === -1) {
    return false; // Conservative: disallow unknown ratings
  }

  return ratingIndex <= maxRatingIndex;
}

/**
 * Get the restrictiveness level of a rating (0 = least restrictive, higher = more restrictive)
 *
 * @param rating - Content rating
 * @returns Numeric restrictiveness level (0-11), or -1 if unknown
 */
export function getRatingLevel(rating: ContentRating): number {
  return RATING_HIERARCHY.indexOf(rating);
}

/**
 * Compare two content ratings
 *
 * @param a - First rating
 * @param b - Second rating
 * @returns Negative if a < b, 0 if equal, positive if a > b
 */
export function compareRatings(a: ContentRating, b: ContentRating): number {
  const aIndex = RATING_HIERARCHY.indexOf(a);
  const bIndex = RATING_HIERARCHY.indexOf(b);

  if (aIndex === -1 && bIndex === -1) return 0;
  if (aIndex === -1) return 1; // Unknown ratings are considered more restrictive
  if (bIndex === -1) return -1;

  return aIndex - bIndex;
}
