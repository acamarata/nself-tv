import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGraphQL } from './useGraphQL';
import { trackSearchResponse } from '@/lib/performance/metrics';

export interface SearchFilters {
  mediaType?: 'movie' | 'show' | 'episode' | 'all';
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  ratingMin?: number;
  ratingMax?: number;
  duration?: {
    min?: number;
    max?: number;
  };
  language?: string;
  resolution?: '480p' | '720p' | '1080p' | '4k' | '8k';
  hdr?: boolean;
  subtitles?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  mediaType: 'movie' | 'show' | 'episode';
  year: number;
  rating: number;
  posterUrl: string;
  overview: string;
  genres: string[];
  matchScore: number;
  matchReason: string;
}

/**
 * Advanced search with filters and facets
 */
export function useAdvancedSearch(query: string, filters: SearchFilters = {}) {
  const { request } = useGraphQL();
  const startTime = Date.now();

  return useQuery({
    queryKey: ['advanced-search', query, filters],
    queryFn: async () => {
      // Build where clause based on filters
      const whereConditions: string[] = [];

      // Text search
      if (query) {
        whereConditions.push(`
          _or: [
            { title: { _ilike: "%${query}%" } }
            { overview: { _ilike: "%${query}%" } }
            { tagline: { _ilike: "%${query}%" } }
          ]
        `);
      }

      // Media type
      if (filters.mediaType && filters.mediaType !== 'all') {
        whereConditions.push(`media_type: { _eq: "${filters.mediaType}" }`);
      }

      // Genres
      if (filters.genres && filters.genres.length > 0) {
        whereConditions.push(
          `genres: { _contains: ${JSON.stringify(filters.genres)} }`
        );
      }

      // Year range
      if (filters.yearFrom) {
        whereConditions.push(`year: { _gte: ${filters.yearFrom} }`);
      }
      if (filters.yearTo) {
        whereConditions.push(`year: { _lte: ${filters.yearTo} }`);
      }

      // Rating range
      if (filters.ratingMin) {
        whereConditions.push(`rating: { _gte: ${filters.ratingMin} }`);
      }
      if (filters.ratingMax) {
        whereConditions.push(`rating: { _lte: ${filters.ratingMax} }`);
      }

      // Duration
      if (filters.duration?.min) {
        whereConditions.push(`runtime: { _gte: ${filters.duration.min} }`);
      }
      if (filters.duration?.max) {
        whereConditions.push(`runtime: { _lte: ${filters.duration.max} }`);
      }

      // Language
      if (filters.language) {
        whereConditions.push(`original_language: { _eq: "${filters.language}" }`);
      }

      // Resolution
      if (filters.resolution) {
        whereConditions.push(`resolution: { _eq: "${filters.resolution}" }`);
      }

      // HDR
      if (filters.hdr !== undefined) {
        whereConditions.push(`hdr: { _eq: ${filters.hdr} }`);
      }

      // Subtitles
      if (filters.subtitles && filters.subtitles.length > 0) {
        whereConditions.push(
          `subtitle_languages: { _contains: ${JSON.stringify(filters.subtitles)} }`
        );
      }

      const whereClause = whereConditions.length > 0
        ? `where: { ${whereConditions.join(', ')} }`
        : '';

      const data = await request({
        query: `
          query AdvancedSearch {
            media(
              ${whereClause}
              order_by: [{ popularity: desc }, { rating: desc }]
              limit: 100
            ) {
              id
              title
              media_type
              year
              rating
              poster_url
              overview
              genres
              popularity
            }
          }
        `,
      });

      // Track search performance
      const duration = Date.now() - startTime;
      trackSearchResponse(query, duration);

      // Calculate match scores and reasons
      const results = (data.media || []).map((item: any) => {
        const matchScore = calculateMatchScore(item, query, filters);
        const matchReason = generateMatchReason(item, query, filters);

        return {
          id: item.id,
          title: item.title,
          mediaType: item.media_type,
          year: item.year,
          rating: item.rating,
          posterUrl: item.poster_url,
          overview: item.overview,
          genres: item.genres,
          matchScore,
          matchReason,
        };
      });

      // Sort by match score
      results.sort((a: SearchResult, b: SearchResult) => b.matchScore - a.matchScore);

      return results as SearchResult[];
    },
    enabled: query.length >= 2 || Object.keys(filters).length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Calculate match score (0-100)
 */
function calculateMatchScore(item: any, query: string, filters: SearchFilters): number {
  let score = 0;

  if (!query && Object.keys(filters).length === 0) {
    // No query, sort by popularity
    return item.popularity || 0;
  }

  if (query) {
    const titleMatch = item.title.toLowerCase().includes(query.toLowerCase());
    const overviewMatch = item.overview?.toLowerCase().includes(query.toLowerCase());

    if (titleMatch) score += 50;
    if (overviewMatch) score += 20;

    // Exact match bonus
    if (item.title.toLowerCase() === query.toLowerCase()) {
      score += 30;
    }
  }

  // Filters applied bonus
  if (filters.genres && filters.genres.length > 0) {
    const matchingGenres = filters.genres.filter((g) => item.genres.includes(g)).length;
    score += matchingGenres * 5;
  }

  // Rating bonus
  score += item.rating;

  // Popularity bonus
  score += (item.popularity || 0) / 100;

  return Math.min(100, score);
}

/**
 * Generate human-readable match reason
 */
function generateMatchReason(item: any, query: string, filters: SearchFilters): string {
  const reasons: string[] = [];

  if (query) {
    if (item.title.toLowerCase().includes(query.toLowerCase())) {
      reasons.push('Title match');
    }
    if (item.overview?.toLowerCase().includes(query.toLowerCase())) {
      reasons.push('Description match');
    }
  }

  if (filters.genres && filters.genres.length > 0) {
    const matchingGenres = filters.genres.filter((g) => item.genres.includes(g));
    if (matchingGenres.length > 0) {
      reasons.push(`${matchingGenres.join(', ')} genre`);
    }
  }

  if (filters.yearFrom || filters.yearTo) {
    reasons.push(`Released ${item.year}`);
  }

  if (filters.ratingMin || filters.ratingMax) {
    reasons.push(`Rating ${item.rating}/10`);
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Recommended';
}

/**
 * Get search suggestions (autocomplete)
 */
export function useSearchSuggestions(query: string) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetSearchSuggestions($query: String!) {
            media(
              where: { title: { _ilike: $query } }
              order_by: { popularity: desc }
              limit: 10
            ) {
              id
              title
              media_type
              year
            }
          }
        `,
        variables: { query: `${query}%` },
      });

      return (data.media || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        mediaType: item.media_type,
        year: item.year,
      }));
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search history management
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('search-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const updated = [query, ...prev.filter((q) => q !== query)].slice(0, 10);
      localStorage.setItem('search-history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('search-history');
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const updated = prev.filter((q) => q !== query);
      localStorage.setItem('search-history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { history, addToHistory, clearHistory, removeFromHistory };
}

/**
 * Get available filter options (facets)
 */
export function useSearchFacets() {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['search-facets'],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetSearchFacets {
            # Get all unique genres
            genres: media_aggregate {
              aggregate {
                count
              }
            }

            # Get year range
            years: media_aggregate {
              aggregate {
                min {
                  year
                }
                max {
                  year
                }
              }
            }

            # Get available languages
            languages: media(
              distinct_on: original_language
              order_by: { original_language: asc }
            ) {
              original_language
            }

            # Get available resolutions
            resolutions: media(
              distinct_on: resolution
              order_by: { resolution: desc }
            ) {
              resolution
            }
          }
        `,
      });

      return {
        yearRange: {
          min: data.years.aggregate.min.year || 1900,
          max: data.years.aggregate.max.year || new Date().getFullYear(),
        },
        languages: data.languages.map((l: any) => l.original_language).filter(Boolean),
        resolutions: data.resolutions.map((r: any) => r.resolution).filter(Boolean),
      };
    },
    staleTime: Infinity, // Facets don't change often
  });
}
