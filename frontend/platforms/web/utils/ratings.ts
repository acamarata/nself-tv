import type { ContentRating, MovieRating } from '@/types/profile';

const TV_RATING_ORDER: ContentRating[] = ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA'];
const MOVIE_RATING_ORDER: MovieRating[] = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

export function tvRatingIndex(rating: ContentRating): number {
  return TV_RATING_ORDER.indexOf(rating);
}

export function movieRatingIndex(rating: MovieRating): number {
  return MOVIE_RATING_ORDER.indexOf(rating);
}

export function isTvRatingAllowed(rating: string, maxRating: ContentRating): boolean {
  const idx = TV_RATING_ORDER.indexOf(rating as ContentRating);
  const maxIdx = tvRatingIndex(maxRating);
  if (idx === -1) return true; // Unknown ratings are allowed
  return idx <= maxIdx;
}

export function isMovieRatingAllowed(rating: string, maxRating: MovieRating): boolean {
  const idx = MOVIE_RATING_ORDER.indexOf(rating as MovieRating);
  const maxIdx = movieRatingIndex(maxRating);
  if (idx === -1) return true;
  return idx <= maxIdx;
}

export function isContentAllowed(
  contentRating: string | null,
  maxTvRating: ContentRating,
  maxMovieRating: MovieRating,
): boolean {
  if (!contentRating) return true;
  if (TV_RATING_ORDER.includes(contentRating as ContentRating)) {
    return isTvRatingAllowed(contentRating, maxTvRating);
  }
  if (MOVIE_RATING_ORDER.includes(contentRating as MovieRating)) {
    return isMovieRatingAllowed(contentRating, maxMovieRating);
  }
  return true;
}

export function formatRuntime(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatProgress(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

export { TV_RATING_ORDER, MOVIE_RATING_ORDER };
