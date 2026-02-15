import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from './useGraphQL';

export interface Rating {
  id: string;
  userId: string;
  contentId: string;
  rating: number; // 1-10
  reviewText?: string;
  createdAt: string;
  updatedAt: string;
  helpful: number;
  notHelpful: number;
  user: {
    displayName: string;
    avatarUrl?: string;
  };
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    7: number;
    8: number;
    9: number;
    10: number;
  };
}

/**
 * Get user's rating for content
 */
export function useUserRating(contentId: string) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['user-rating', contentId],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetUserRating($contentId: uuid!) {
            user_ratings(
              where: { content_id: { _eq: $contentId } }
              limit: 1
            ) {
              id
              rating
              review_text
              created_at
              updated_at
            }
          }
        `,
        variables: { contentId },
      });

      const rating = data.user_ratings?.[0];
      if (!rating) return null;

      return {
        id: rating.id,
        rating: rating.rating,
        reviewText: rating.review_text,
        createdAt: rating.created_at,
        updatedAt: rating.updated_at,
      };
    },
    enabled: !!contentId,
  });
}

/**
 * Submit or update rating
 */
export function useSubmitRating() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      rating,
      reviewText,
    }: {
      contentId: string;
      rating: number;
      reviewText?: string;
    }) => {
      const data = await request({
        query: `
          mutation SubmitRating(
            $contentId: uuid!
            $rating: Int!
            $reviewText: String
          ) {
            insert_user_ratings_one(
              object: {
                content_id: $contentId
                rating: $rating
                review_text: $reviewText
              }
              on_conflict: {
                constraint: user_ratings_user_id_content_id_key
                update_columns: [rating, review_text, updated_at]
              }
            ) {
              id
              rating
              review_text
            }
          }
        `,
        variables: { contentId, rating, reviewText },
      });

      return data.insert_user_ratings_one;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-rating', variables.contentId] });
      queryClient.invalidateQueries({ queryKey: ['ratings', variables.contentId] });
      queryClient.invalidateQueries({ queryKey: ['rating-stats', variables.contentId] });
    },
  });
}

/**
 * Delete rating
 */
export function useDeleteRating() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ratingId, contentId }: { ratingId: string; contentId: string }) => {
      const data = await request({
        query: `
          mutation DeleteRating($ratingId: uuid!) {
            delete_user_ratings_by_pk(id: $ratingId) {
              id
            }
          }
        `,
        variables: { ratingId },
      });

      return data.delete_user_ratings_by_pk;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-rating', variables.contentId] });
      queryClient.invalidateQueries({ queryKey: ['ratings', variables.contentId] });
      queryClient.invalidateQueries({ queryKey: ['rating-stats', variables.contentId] });
    },
  });
}

/**
 * Get all ratings for content
 */
export function useRatings(contentId: string, sortBy: 'recent' | 'helpful' | 'rating' = 'helpful') {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['ratings', contentId, sortBy],
    queryFn: async () => {
      const orderBy = {
        recent: '{ created_at: desc }',
        helpful: '{ helpful: desc }',
        rating: '{ rating: desc }',
      }[sortBy];

      const data = await request({
        query: `
          query GetRatings($contentId: uuid!, $orderBy: [user_ratings_order_by!]) {
            user_ratings(
              where: {
                content_id: { _eq: $contentId }
                review_text: { _is_null: false }
              }
              order_by: $orderBy
              limit: 50
            ) {
              id
              user_id
              rating
              review_text
              created_at
              updated_at
              helpful
              not_helpful
              user {
                display_name
                avatar_url
              }
            }
          }
        `,
        variables: {
          contentId,
          orderBy: JSON.parse(orderBy),
        },
      });

      return (data.user_ratings || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        contentId,
        rating: r.rating,
        reviewText: r.review_text,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        helpful: r.helpful,
        notHelpful: r.not_helpful,
        user: {
          displayName: r.user.display_name,
          avatarUrl: r.user.avatar_url,
        },
      })) as Rating[];
    },
    enabled: !!contentId,
  });
}

/**
 * Get rating statistics
 */
export function useRatingStats(contentId: string) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['rating-stats', contentId],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetRatingStats($contentId: uuid!) {
            user_ratings_aggregate(
              where: { content_id: { _eq: $contentId } }
            ) {
              aggregate {
                avg {
                  rating
                }
                count
              }
            }

            distribution: user_ratings(
              where: { content_id: { _eq: $contentId } }
            ) {
              rating
            }
          }
        `,
        variables: { contentId },
      });

      const avg = data.user_ratings_aggregate.aggregate.avg.rating || 0;
      const count = data.user_ratings_aggregate.aggregate.count || 0;

      // Calculate distribution
      const distribution: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
      };

      for (const item of data.distribution || []) {
        distribution[item.rating] = (distribution[item.rating] || 0) + 1;
      }

      return {
        averageRating: avg,
        totalRatings: count,
        distribution,
      } as RatingStats;
    },
    enabled: !!contentId,
  });
}

/**
 * Mark rating as helpful/not helpful
 */
export function useMarkRatingHelpful() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ratingId,
      helpful,
    }: {
      ratingId: string;
      helpful: boolean;
    }) => {
      const column = helpful ? 'helpful' : 'not_helpful';

      const data = await request({
        query: `
          mutation MarkRatingHelpful($ratingId: uuid!, $column: String!) {
            update_user_ratings_by_pk(
              pk_columns: { id: $ratingId }
              _inc: { ${column}: 1 }
            ) {
              id
              helpful
              not_helpful
            }
          }
        `,
        variables: { ratingId },
      });

      return data.update_user_ratings_by_pk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
    },
  });
}

/**
 * Get trending ratings (most helpful recent reviews)
 */
export function useTrendingReviews(limit: number = 10) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['trending-reviews', limit],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetTrendingReviews($limit: Int!) {
            user_ratings(
              where: {
                review_text: { _is_null: false }
                created_at: { _gte: "now() - interval '30 days'" }
              }
              order_by: [{ helpful: desc }, { rating: desc }]
              limit: $limit
            ) {
              id
              user_id
              content_id
              rating
              review_text
              created_at
              helpful
              not_helpful
              user {
                display_name
                avatar_url
              }
              content {
                title
                media_type
                poster_url
              }
            }
          }
        `,
        variables: { limit },
      });

      return (data.user_ratings || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        contentId: r.content_id,
        rating: r.rating,
        reviewText: r.review_text,
        createdAt: r.created_at,
        helpful: r.helpful,
        notHelpful: r.not_helpful,
        user: {
          displayName: r.user.display_name,
          avatarUrl: r.user.avatar_url,
        },
        content: {
          title: r.content.title,
          mediaType: r.content.media_type,
          posterUrl: r.content.poster_url,
        },
      }));
    },
  });
}
