/**
 * TMDB (The Movie Database) API Integration
 * Fetches movie and TV show metadata
 */

const axios = require('axios');

class TMDBClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('TMDB API key is required');
    }

    this.apiKey = apiKey;
    this.baseURL = 'https://api.themoviedb.org/3';
    this.imageBaseURL = 'https://image.tmdb.org/t/p';

    this.client = axios.create({
      baseURL: this.baseURL,
      params: { api_key: this.apiKey },
      timeout: 10000,
    });
  }

  /**
   * Search for movies by title
   */
  async searchMovie(query, year = null) {
    const params = { query };
    if (year) params.year = year;

    const response = await this.client.get('/search/movie', { params });
    return response.data.results;
  }

  /**
   * Search for TV shows by title
   */
  async searchTV(query, year = null) {
    const params = { query };
    if (year) params.first_air_date_year = year;

    const response = await this.client.get('/search/tv', { params });
    return response.data.results;
  }

  /**
   * Get detailed movie information
   */
  async getMovie(movieId) {
    const response = await this.client.get(`/movie/${movieId}`, {
      params: { append_to_response: 'credits,videos,images' },
    });
    return this.normalizeMovie(response.data);
  }

  /**
   * Get detailed TV show information
   */
  async getTVShow(tvId) {
    const response = await this.client.get(`/tv/${tvId}`, {
      params: { append_to_response: 'credits,videos,images' },
    });
    return this.normalizeTVShow(response.data);
  }

  /**
   * Get TV season information
   */
  async getTVSeason(tvId, seasonNumber) {
    const response = await this.client.get(`/tv/${tvId}/season/${seasonNumber}`);
    return response.data;
  }

  /**
   * Normalize movie data to our schema
   */
  normalizeMovie(data) {
    return {
      tmdb_id: data.id,
      title: data.title,
      original_title: data.original_title,
      overview: data.overview,
      release_date: data.release_date,
      runtime: data.runtime,
      genres: data.genres?.map(g => g.name) || [],
      poster_path: data.poster_path ? this.getImageURL(data.poster_path, 'w500') : null,
      backdrop_path: data.backdrop_path ? this.getImageURL(data.backdrop_path, 'original') : null,
      vote_average: data.vote_average,
      vote_count: data.vote_count,
      popularity: data.popularity,
      adult: data.adult,
      original_language: data.original_language,
      production_companies: data.production_companies?.map(c => c.name) || [],
      cast: data.credits?.cast?.slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profile_path: c.profile_path ? this.getImageURL(c.profile_path, 'w185') : null,
      })) || [],
      crew: data.credits?.crew?.filter(c => c.job === 'Director').map(c => ({
        name: c.name,
        job: c.job,
      })) || [],
      trailer_key: data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key || null,
    };
  }

  /**
   * Normalize TV show data to our schema
   */
  normalizeTVShow(data) {
    return {
      tmdb_id: data.id,
      name: data.name,
      original_name: data.original_name,
      overview: data.overview,
      first_air_date: data.first_air_date,
      last_air_date: data.last_air_date,
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      episode_run_time: data.episode_run_time?.[0] || null,
      genres: data.genres?.map(g => g.name) || [],
      poster_path: data.poster_path ? this.getImageURL(data.poster_path, 'w500') : null,
      backdrop_path: data.backdrop_path ? this.getImageURL(data.backdrop_path, 'original') : null,
      vote_average: data.vote_average,
      vote_count: data.vote_count,
      popularity: data.popularity,
      original_language: data.original_language,
      production_companies: data.production_companies?.map(c => c.name) || [],
      networks: data.networks?.map(n => n.name) || [],
      status: data.status,
      type: data.type,
      cast: data.credits?.cast?.slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profile_path: c.profile_path ? this.getImageURL(c.profile_path, 'w185') : null,
      })) || [],
      created_by: data.created_by?.map(c => c.name) || [],
    };
  }

  /**
   * Get full image URL
   */
  getImageURL(path, size = 'original') {
    if (!path) return null;
    return `${this.imageBaseURL}/${size}${path}`;
  }

  /**
   * Match filename to TMDB content
   */
  async matchFile(filename, type = 'movie') {
    const { title, year } = this.parseFilename(filename);

    if (type === 'movie') {
      const results = await this.searchMovie(title, year);
      return results[0] || null;
    } else {
      const results = await this.searchTV(title, year);
      return results[0] || null;
    }
  }

  /**
   * Parse filename to extract title and year
   */
  parseFilename(filename) {
    // Remove extension
    const name = filename.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|mpg|mpeg)$/i, '');

    // Extract year (matches 19xx or 20xx in parentheses or brackets)
    const yearMatch = name.match(/[\[\(]?(19\d{2}|20\d{2})[\]\)]?/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;

    // Remove year and clean title
    let title = name;
    if (yearMatch) {
      title = name.replace(yearMatch[0], '');
    }

    // Clean up common patterns
    title = title
      .replace(/[\[\(].*?[\]\)]/g, '') // Remove bracketed content
      .replace(/\./g, ' ')              // Replace dots with spaces
      .replace(/_/g, ' ')               // Replace underscores with spaces
      .replace(/\s+/g, ' ')             // Collapse multiple spaces
      .trim();

    return { title, year };
  }
}

/**
 * Create TMDB client from environment
 */
function createTMDBClient() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY environment variable not set');
  }
  return new TMDBClient(apiKey);
}

module.exports = {
  TMDBClient,
  createTMDBClient,
};
