const { TMDBClient } = require('../tmdb');

describe('TMDBClient', () => {
  let client;

  beforeEach(() => {
    client = new TMDBClient('test-api-key');
  });

  describe('constructor', () => {
    it('should create client with API key', () => {
      expect(client.apiKey).toBe('test-api-key');
      expect(client.baseURL).toBe('https://api.themoviedb.org/3');
    });

    it('should throw error without API key', () => {
      expect(() => new TMDBClient()).toThrow('TMDB API key is required');
    });
  });

  describe('getImageURL', () => {
    it('should return full image URL', () => {
      const url = client.getImageURL('/abc123.jpg', 'w500');
      expect(url).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
    });

    it('should return null for empty path', () => {
      expect(client.getImageURL(null)).toBeNull();
      expect(client.getImageURL('')).toBeNull();
    });

    it('should default to original size', () => {
      const url = client.getImageURL('/abc123.jpg');
      expect(url).toBe('https://image.tmdb.org/t/p/original/abc123.jpg');
    });
  });

  describe('parseFilename', () => {
    it('should parse movie with year', () => {
      const result = client.parseFilename('The Matrix (1999).mp4');
      expect(result.title).toBe('The Matrix');
      expect(result.year).toBe(1999);
    });

    it('should parse movie with year in brackets', () => {
      const result = client.parseFilename('Inception [2010].mkv');
      expect(result.title).toBe('Inception');
      expect(result.year).toBe(2010);
    });

    it('should parse filename with dots', () => {
      const result = client.parseFilename('The.Dark.Knight.2008.1080p.mp4');
      expect(result.title).toBe('The Dark Knight');
      expect(result.year).toBe(2008);
    });

    it('should parse filename with underscores', () => {
      const result = client.parseFilename('Pulp_Fiction_1994.avi');
      expect(result.title).toBe('Pulp Fiction');
      expect(result.year).toBe(1994);
    });

    it('should handle filename without year', () => {
      const result = client.parseFilename('Some Movie.mp4');
      expect(result.title).toBe('Some Movie');
      expect(result.year).toBeNull();
    });

    it('should remove bracketed content', () => {
      const result = client.parseFilename('Movie Name [1080p BluRay] (2020).mkv');
      expect(result.title).toBe('Movie Name');
      expect(result.year).toBe(2020);
    });

    it('should handle various video extensions', () => {
      const extensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'];
      extensions.forEach(ext => {
        const result = client.parseFilename(`Movie.${ext}`);
        expect(result.title).toBe('Movie');
      });
    });

    it('should collapse multiple spaces', () => {
      const result = client.parseFilename('Movie    Title   (2020).mp4');
      expect(result.title).toBe('Movie Title');
    });
  });

  describe('normalizeMovie', () => {
    it('should normalize movie data', () => {
      const rawData = {
        id: 123,
        title: 'Test Movie',
        original_title: 'Test Movie Original',
        overview: 'A test movie',
        release_date: '2020-01-01',
        runtime: 120,
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Drama' }],
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 7.5,
        vote_count: 1000,
        popularity: 100,
        adult: false,
        original_language: 'en',
        production_companies: [{ name: 'Company A' }, { name: 'Company B' }],
      };

      const normalized = client.normalizeMovie(rawData);

      expect(normalized.tmdb_id).toBe(123);
      expect(normalized.title).toBe('Test Movie');
      expect(normalized.genres).toEqual(['Action', 'Drama']);
      expect(normalized.poster_path).toContain('/poster.jpg');
      expect(normalized.production_companies).toEqual(['Company A', 'Company B']);
    });

    it('should handle missing optional fields', () => {
      const rawData = {
        id: 123,
        title: 'Test Movie',
        overview: 'A test movie',
      };

      const normalized = client.normalizeMovie(rawData);

      expect(normalized.genres).toEqual([]);
      expect(normalized.cast).toEqual([]);
      expect(normalized.crew).toEqual([]);
      expect(normalized.trailer_key).toBeNull();
    });

    it('should extract cast and crew', () => {
      const rawData = {
        id: 123,
        title: 'Test Movie',
        credits: {
          cast: [
            { name: 'Actor 1', character: 'Character 1', profile_path: '/actor1.jpg' },
            { name: 'Actor 2', character: 'Character 2', profile_path: null },
          ],
          crew: [
            { name: 'Director 1', job: 'Director' },
            { name: 'Producer 1', job: 'Producer' },
          ],
        },
      };

      const normalized = client.normalizeMovie(rawData);

      expect(normalized.cast).toHaveLength(2);
      expect(normalized.cast[0].name).toBe('Actor 1');
      expect(normalized.crew).toHaveLength(1); // Only directors
      expect(normalized.crew[0].name).toBe('Director 1');
    });

    it('should extract trailer key', () => {
      const rawData = {
        id: 123,
        title: 'Test Movie',
        videos: {
          results: [
            { type: 'Teaser', site: 'YouTube', key: 'teaser123' },
            { type: 'Trailer', site: 'YouTube', key: 'trailer123' },
          ],
        },
      };

      const normalized = client.normalizeMovie(rawData);
      expect(normalized.trailer_key).toBe('trailer123');
    });
  });

  describe('normalizeTVShow', () => {
    it('should normalize TV show data', () => {
      const rawData = {
        id: 456,
        name: 'Test Show',
        original_name: 'Test Show Original',
        overview: 'A test show',
        first_air_date: '2020-01-01',
        last_air_date: '2023-12-31',
        number_of_seasons: 3,
        number_of_episodes: 30,
        episode_run_time: [45, 50],
        genres: [{ id: 1, name: 'Sci-Fi' }],
        poster_path: '/poster.jpg',
        status: 'Ended',
        type: 'Scripted',
        networks: [{ name: 'Network A' }],
        created_by: [{ name: 'Creator 1' }],
      };

      const normalized = client.normalizeTVShow(rawData);

      expect(normalized.tmdb_id).toBe(456);
      expect(normalized.name).toBe('Test Show');
      expect(normalized.number_of_seasons).toBe(3);
      expect(normalized.episode_run_time).toBe(45);
      expect(normalized.genres).toEqual(['Sci-Fi']);
      expect(normalized.networks).toEqual(['Network A']);
      expect(normalized.created_by).toEqual(['Creator 1']);
    });
  });
});
