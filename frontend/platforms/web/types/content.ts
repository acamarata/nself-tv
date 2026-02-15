export type MediaType = 'movie' | 'tv_show' | 'episode' | 'podcast' | 'game' | 'music' | 'live_event';

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  originalTitle: string | null;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  contentRating: string | null;
  runtimeMinutes: number | null;
  communityRating: number | null;
  voteCount: number;
  status: string;
  addedAt: string;
}

/** All content lives in media_items — episodes use parent_id to reference their show */
export interface Episode extends MediaItem {
  type: 'episode';
  parentId: string;
  seasonNumber: number;
  episodeNumber: number;
  thumbnailUrl: string | null;
  hlsMasterUrl: string | null;
}

export interface CastMember {
  name: string;
  character: string;
  profileUrl: string | null;
  order: number;
}

export interface WatchProgress {
  mediaItemId: string;
  userId: string;
  positionSeconds: number;
  durationSeconds: number;
  percentage: number;
  lastWatchedAt: string;
}

export interface ContentRowData {
  id: string;
  title: string;
  type: 'continue_watching' | 'recently_added' | 'trending' | 'genre' | 'recommended' | 'popular';
  items: MediaItem[];
  genreFilter?: string;
}

export interface WatchlistItem {
  id: string;
  mediaItemId: string;
  userId: string;
  mediaItem: MediaItem;
  position: number;
  addedAt: string;
}

/**
 * Maps raw GraphQL snake_case data to a camelCase MediaItem.
 * Use this whenever passing raw GQL results to typed components.
 */
export function mapToMediaItem(raw: Record<string, unknown>): MediaItem {
  return {
    id: raw.id as string,
    type: raw.type as MediaType,
    title: (raw.title as string) ?? '',
    originalTitle: (raw.original_title as string) ?? null,
    year: (raw.year as number) ?? null,
    overview: (raw.overview as string) ?? null,
    posterUrl: (raw.poster_url as string) ?? null,
    backdropUrl: (raw.backdrop_url as string) ?? null,
    genres: (raw.genres as string[]) ?? [],
    contentRating: (raw.content_rating as string) ?? null,
    runtimeMinutes: (raw.runtime_minutes as number) ?? null,
    communityRating: (raw.community_rating as number) ?? null,
    voteCount: (raw.vote_count as number) ?? 0,
    status: (raw.status as string) ?? '',
    addedAt: (raw.added_at as string) ?? (raw.created_at as string) ?? '',
  };
}
