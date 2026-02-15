import type { BaseMedia } from '../models';

/**
 * Calculate recommendation score for a media item
 *
 * Scoring factors:
 * - User rating (if provided): 40%
 * - View count popularity: 30%
 * - Recency: 20%
 * - Genre match: 10%
 *
 * @param media - Media item
 * @param userRating - User's rating for this content (1-5), optional
 * @param viewCount - Number of views
 * @param releaseDate - Release date string
 * @param preferredGenres - User's preferred genres
 * @returns Recommendation score (0-100)
 */
export function calculateRecommendationScore(
  media: BaseMedia,
  userRating?: number,
  viewCount: number = 0,
  releaseDate?: string,
  preferredGenres: string[] = []
): number {
  let score = 0;

  // User rating weight: 40%
  if (userRating !== undefined && userRating >= 1 && userRating <= 5) {
    score += (userRating / 5) * 40;
  }

  // View count popularity weight: 30%
  // Normalize view count (logarithmic scale to handle wide ranges)
  const normalizedViews = viewCount > 0 ? Math.log10(viewCount + 1) / Math.log10(10000) : 0;
  score += Math.min(normalizedViews, 1) * 30;

  // Recency weight: 20%
  if (releaseDate) {
    const releaseTimestamp = new Date(releaseDate).getTime();
    const now = Date.now();
    const ageInDays = (now - releaseTimestamp) / (1000 * 60 * 60 * 24);

    // Newer content scores higher (decay over 365 days)
    const recencyScore = Math.max(0, 1 - ageInDays / 365);
    score += recencyScore * 20;
  }

  // Genre match weight: 10%
  if (preferredGenres.length > 0 && media.genres.length > 0) {
    const matchingGenres = media.genres.filter((g) =>
      preferredGenres.some((pg) => pg.toLowerCase() === g.toLowerCase())
    );
    const genreScore = matchingGenres.length / media.genres.length;
    score += genreScore * 10;
  }

  return Math.round(Math.min(score, 100));
}

/**
 * Sort media items by recommendation score (highest first)
 *
 * @param items - Media items with scores
 * @returns Sorted array (highest score first)
 */
export function sortByRecommendationScore<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.score - a.score);
}

/**
 * Get trending score based on views and time
 *
 * Trending algorithm (Phase 2: 50% views + 30% rating + 20% completion)
 * This is a simplified version for client-side filtering
 *
 * @param viewsLast24h - View count in last 24 hours
 * @param averageRating - Average user rating (1-5)
 * @param completionRate - Percentage of viewers who completed (0-100)
 * @returns Trending score (0-100)
 */
export function calculateTrendingScore(
  viewsLast24h: number,
  averageRating: number,
  completionRate: number
): number {
  // Normalize views (logarithmic scale)
  const normalizedViews = viewsLast24h > 0 ? Math.log10(viewsLast24h + 1) / Math.log10(1000) : 0;
  const viewScore = Math.min(normalizedViews, 1) * 50;

  // Rating score (1-5 → 0-30)
  const ratingScore = averageRating > 0 ? (averageRating / 5) * 30 : 0;

  // Completion score (0-100 → 0-20)
  const completionScore = (completionRate / 100) * 20;

  return Math.round(Math.min(viewScore + ratingScore + completionScore, 100));
}
