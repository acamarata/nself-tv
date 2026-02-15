import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { useGraphQL } from './useGraphQL';

const GET_RECOMMENDATIONS = gql`
  query GetRecommendations($profileId: uuid!, $limit: Int = 20) {
    recommendations(
      where: { profile_id: { _eq: $profileId } }
      order_by: { score: desc }
      limit: $limit
    ) {
      id
      content_id
      score
      reason
      content {
        id
        title
        poster_url
        backdrop_url
        media_type
        year
        rating
        genres
        overview
      }
    }
  }
`;

const GET_PERSONALIZED_SUGGESTIONS = gql`
  query GetPersonalizedSuggestions($profileId: uuid!) {
    # Get viewing history for this profile
    watch_history(
      where: { profile_id: { _eq: $profileId } }
      order_by: { last_watched: desc }
      limit: 50
    ) {
      content_id
      content {
        genres
        rating
      }
    }

    # Get user ratings
    user_ratings(where: { profile_id: { _eq: $profileId } }) {
      content_id
      rating
      content {
        genres
      }
    }
  }
`;

export interface Recommendation {
  id: string;
  contentId: string;
  score: number;
  reason: string;
  content: {
    id: string;
    title: string;
    posterUrl: string | null;
    backdropUrl: string | null;
    mediaType: 'movie' | 'tv_show';
    year: number;
    rating: number;
    genres: string[];
    overview: string;
  };
}

export interface RecommendationWeights {
  genreMatch: number; // 0-1, default 0.4
  ratingSimilarity: number; // 0-1, default 0.3
  recency: number; // 0-1, default 0.2
  popularity: number; // 0-1, default 0.1
}

const DEFAULT_WEIGHTS: RecommendationWeights = {
  genreMatch: 0.4,
  ratingSimilarity: 0.3,
  recency: 0.2,
  popularity: 0.1,
};

/**
 * Calculate personalized recommendation score
 */
function calculateScore(
  candidate: any,
  viewingHistory: any[],
  userRatings: any[],
  weights: RecommendationWeights
): number {
  let score = 0;

  // Genre match score
  const userGenres = new Set(
    viewingHistory.flatMap((h) => h.content?.genres || [])
  );
  const matchedGenres = candidate.genres.filter((g: string) => userGenres.has(g));
  const genreScore = userGenres.size > 0 ? matchedGenres.length / userGenres.size : 0;
  score += genreScore * weights.genreMatch;

  // Rating similarity score
  const avgUserRating =
    userRatings.reduce((sum, r) => sum + r.rating, 0) / (userRatings.length || 1);
  const ratingDiff = Math.abs(candidate.rating - avgUserRating);
  const ratingScore = Math.max(0, 1 - ratingDiff / 5); // Normalize to 0-1
  score += ratingScore * weights.ratingSimilarity;

  // Recency score (newer is better)
  const currentYear = new Date().getFullYear();
  const age = currentYear - candidate.year;
  const recencyScore = Math.max(0, 1 - age / 10); // Decay over 10 years
  score += recencyScore * weights.recency;

  // Popularity score (normalized)
  const popularityScore = Math.min(1, candidate.popularity / 1000); // Normalize to 0-1
  score += popularityScore * weights.popularity;

  return score;
}

export function useRecommendations(profileId: string, limit: number = 20) {
  const graphql = useGraphQL();

  return useQuery({
    queryKey: ['recommendations', profileId, limit],
    queryFn: async () => {
      const data = await graphql.request<any>(GET_RECOMMENDATIONS, {
        profileId,
        limit,
      });
      return data.recommendations as Recommendation[];
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function usePersonalizedSuggestions(
  profileId: string,
  weights: RecommendationWeights = DEFAULT_WEIGHTS,
  limit: number = 20
) {
  const graphql = useGraphQL();

  return useQuery({
    queryKey: ['personalized-suggestions', profileId, weights, limit],
    queryFn: async () => {
      // Get user's viewing history and ratings
      const userData = await graphql.request<any>(GET_PERSONALIZED_SUGGESTIONS, {
        profileId,
      });

      const viewingHistory = userData.watch_history || [];
      const userRatings = userData.user_ratings || [];

      // Fetch candidate content from external API (TMDB)
      const candidatesResponse = await fetch('/api/v1/discover/suggestions');
      const candidates = await candidatesResponse.json();

      // Calculate scores for each candidate
      const scored = candidates.map((candidate: any) => ({
        ...candidate,
        score: calculateScore(candidate, viewingHistory, userRatings, weights),
      }));

      // Sort by score and filter out already watched
      const watchedIds = new Set(viewingHistory.map((h: any) => h.content_id));
      const filtered = scored
        .filter((s: any) => !watchedIds.has(s.id))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit);

      return filtered;
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (refresh daily)
  });
}

export function useRecommendationWeights(profileId: string) {
  const graphql = useGraphQL();

  return useQuery({
    queryKey: ['recommendation-weights', profileId],
    queryFn: async () => {
      const data = await graphql.request<any>(
        gql`
          query GetRecommendationWeights($profileId: uuid!) {
            profiles_by_pk(id: $profileId) {
              recommendation_weights
            }
          }
        `,
        { profileId }
      );

      return (data.profiles_by_pk?.recommendation_weights as RecommendationWeights) || DEFAULT_WEIGHTS;
    },
    enabled: !!profileId,
  });
}
