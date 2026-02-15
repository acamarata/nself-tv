import type { HttpClient } from './client';
import type { Movie, Episode, TVShow, MediaPlayback } from '../models';

export interface MediaSearchParams {
  query: string;
  type?: 'movie' | 'episode' | 'live' | 'podcast' | 'game';
  genres?: string[];
  minRating?: string;
  limit?: number;
  offset?: number;
}

export interface MediaBrowseParams {
  type?: 'movie' | 'episode';
  genre?: string;
  year?: number;
  sortBy?: 'title' | 'releaseDate' | 'rating' | 'views';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PlaybackRequest {
  mediaId: string;
  profileId: string;
}

export interface PlaybackTokenResponse {
  streamUrl: string;
  token: string;
  expiresAt: string;
  mediaId: string;
}

/**
 * Media API client
 */
export class MediaAPI {
  constructor(private http: HttpClient) {}

  /**
   * Search media by query
   */
  async search(_params: MediaSearchParams): Promise<Array<Movie | Episode>> {
    const response = await this.http.get<{ results: Array<Movie | Episode> }>(
      '/media/search',
      { headers: { 'Content-Type': 'application/json' } }
    );
    // Note: In real implementation, query params would be serialized to URL
    return response.data.results;
  }

  /**
   * Browse media with filters and pagination
   */
  async browse(_params: MediaBrowseParams): Promise<Array<Movie | Episode>> {
    const response = await this.http.get<{ results: Array<Movie | Episode> }>(
      '/media/browse'
    );
    return response.data.results;
  }

  /**
   * Get movie by ID
   */
  async getMovie(id: string): Promise<Movie> {
    const response = await this.http.get<{ movie: Movie }>(`/media/movies/${id}`);
    return response.data.movie;
  }

  /**
   * Get TV show by ID
   */
  async getShow(id: string): Promise<TVShow> {
    const response = await this.http.get<{ show: TVShow }>(`/media/shows/${id}`);
    return response.data.show;
  }

  /**
   * Get episode by ID
   */
  async getEpisode(id: string): Promise<Episode> {
    const response = await this.http.get<{ episode: Episode }>(`/media/episodes/${id}`);
    return response.data.episode;
  }

  /**
   * Get episodes for a TV show season
   */
  async getSeasonEpisodes(showId: string, seasonNumber: number): Promise<Episode[]> {
    const response = await this.http.get<{ episodes: Episode[] }>(
      `/media/shows/${showId}/seasons/${seasonNumber}/episodes`
    );
    return response.data.episodes;
  }

  /**
   * Request playback token for media
   */
  async requestPlayback(request: PlaybackRequest): Promise<MediaPlayback> {
    const response = await this.http.post<{ playback: MediaPlayback }>(
      '/media/playback/request',
      request
    );
    return response.data.playback;
  }

  /**
   * Send playback heartbeat to maintain session
   */
  async sendHeartbeat(sessionId: string, currentTime: number): Promise<void> {
    await this.http.post('/media/playback/heartbeat', {
      sessionId,
      currentTime
    });
  }

  /**
   * End playback session
   */
  async endPlayback(sessionId: string, finalTime: number): Promise<void> {
    await this.http.post('/media/playback/end', {
      sessionId,
      finalTime
    });
  }

  /**
   * Get trending content
   */
  async getTrending(limit: number = 20): Promise<Array<Movie | Episode>> {
    const response = await this.http.get<{ results: Array<Movie | Episode> }>(
      `/media/trending?limit=${limit}`
    );
    return response.data.results;
  }

  /**
   * Get recently added content
   */
  async getRecentlyAdded(limit: number = 20): Promise<Array<Movie | Episode>> {
    const response = await this.http.get<{ results: Array<Movie | Episode> }>(
      `/media/recent?limit=${limit}`
    );
    return response.data.results;
  }

  /**
   * Get recommended content for profile
   */
  async getRecommendations(profileId: string, limit: number = 20): Promise<Array<Movie | Episode>> {
    const response = await this.http.get<{ results: Array<Movie | Episode> }>(
      `/media/recommendations/${profileId}?limit=${limit}`
    );
    return response.data.results;
  }
}
