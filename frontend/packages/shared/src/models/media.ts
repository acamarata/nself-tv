import type { ContentRating, QualityTier } from '../constants';

export type MediaType = 'movie' | 'episode' | 'live' | 'podcast' | 'game';

export interface BaseMedia {
  id: string;
  type: MediaType;
  title: string;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating: ContentRating;
  releaseDate?: string;
  runtime?: number;
  genres: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Movie extends BaseMedia {
  type: 'movie';
  director?: string;
  cast: string[];
  tmdbId?: number;
}

export interface TVShow {
  id: string;
  title: string;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating: ContentRating;
  genres: string[];
  seasons: number;
  totalEpisodes: number;
  status: 'ongoing' | 'ended' | 'cancelled';
  tmdbId?: number;
}

export interface Episode extends BaseMedia {
  type: 'episode';
  showId: string;
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate?: string;
  tmdbId?: number;
}

export interface MediaPlayback {
  mediaId: string;
  streamUrl: string;
  qualityTier: QualityTier;
  duration: number;
  subtitleTracks: SubtitleTrackInfo[];
  audioTracks: AudioTrackInfo[];
  trickplayUrl?: string;
}

export interface SubtitleTrackInfo {
  id: number;
  language: string;
  label: string;
  url: string;
  format: 'vtt' | 'srt';
}

export interface AudioTrackInfo {
  id: number;
  language: string;
  label: string;
  codec: string;
  channels: number;
}
