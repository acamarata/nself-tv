export type MediaType = 'movie' | 'tv_show' | 'episode' | 'podcast' | 'game';

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
  runtime: number | null;
  voteAverage: number | null;
  voteCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TVShow extends MediaItem {
  type: 'tv_show';
  seasonCount: number;
  episodeCount: number;
  network: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
}

export interface Season {
  id: string;
  showId: string;
  seasonNumber: number;
  name: string;
  overview: string | null;
  posterUrl: string | null;
  episodeCount: number;
  airDate: string | null;
}

export interface Episode {
  id: string;
  showId: string;
  seasonId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string | null;
  stillUrl: string | null;
  runtime: number | null;
  airDate: string | null;
}

export interface CastMember {
  id: string;
  name: string;
  character: string;
  profileUrl: string | null;
  order: number;
}

export interface WatchProgress {
  mediaItemId: string;
  profileId: string;
  position: number;
  duration: number;
  percentage: number;
  updatedAt: string;
}

export interface ContentRow {
  id: string;
  title: string;
  type: 'continue_watching' | 'recently_added' | 'trending' | 'genre' | 'recommended' | 'popular';
  items: MediaItem[];
  genreFilter?: string;
}

export interface WatchlistItem {
  id: string;
  mediaItemId: string;
  profileId: string;
  mediaItem: MediaItem;
  sortOrder: number;
  addedAt: string;
}
