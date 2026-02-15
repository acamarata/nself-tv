import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from './useGraphQL';

export interface Favorite {
  id: string;
  userId: string;
  profileId?: string;
  contentId: string;
  addedAt: string;
  notes?: string;
  content: {
    id: string;
    title: string;
    mediaType: 'movie' | 'show' | 'episode';
    year: number;
    genres: string[];
    rating: number;
    posterUrl: string;
    backdropUrl?: string;
    overview: string;
  };
  inWatchlist: boolean;
  watchProgress?: number;
}

export interface FavoriteCollection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get user's favorites with content details
 */
export function useFavorites(profileId?: string) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['favorites', profileId],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetFavorites($profileId: uuid) {
            favorites_with_content(
              where: { profile_id: { _eq: $profileId } }
              order_by: { added_at: desc }
            ) {
              id
              user_id
              profile_id
              content_id
              added_at
              notes
              title
              media_type
              year
              genres
              rating
              poster_url
              backdrop_url
              overview
              in_watchlist
              watch_progress
            }
          }
        `,
        variables: { profileId },
      });

      return (data.favorites_with_content || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        profileId: item.profile_id,
        contentId: item.content_id,
        addedAt: item.added_at,
        notes: item.notes,
        content: {
          id: item.content_id,
          title: item.title,
          mediaType: item.media_type,
          year: item.year,
          genres: item.genres,
          rating: item.rating,
          posterUrl: item.poster_url,
          backdropUrl: item.backdrop_url,
          overview: item.overview,
        },
        inWatchlist: item.in_watchlist,
        watchProgress: item.watch_progress,
      })) as Favorite[];
    },
    enabled: !!profileId,
  });
}

/**
 * Toggle favorite status
 */
export function useToggleFavorite() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      profileId,
      notes,
    }: {
      contentId: string;
      profileId?: string;
      notes?: string;
    }) => {
      const data = await request({
        query: `
          mutation ToggleFavorite($contentId: uuid!, $profileId: uuid, $notes: String) {
            toggle_favorite(
              p_content_id: $contentId
              p_profile_id: $profileId
              p_notes: $notes
            )
          }
        `,
        variables: { contentId, profileId, notes },
      });

      return data.toggle_favorite; // Returns true if added, false if removed
    },
    onSuccess: (_, variables) => {
      // Invalidate favorites query to refetch
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      // Invalidate content detail to update favorite button
      queryClient.invalidateQueries({ queryKey: ['content', variables.contentId] });
    },
  });
}

/**
 * Check if content is favorited
 */
export function useIsFavorited(contentId: string, profileId?: string) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['is-favorited', contentId, profileId],
    queryFn: async () => {
      const data = await request({
        query: `
          query IsFavorited($contentId: uuid!, $profileId: uuid) {
            is_favorited(
              p_content_id: $contentId
              p_profile_id: $profileId
            )
          }
        `,
        variables: { contentId, profileId },
      });

      return data.is_favorited as boolean;
    },
    enabled: !!contentId,
  });
}

/**
 * Get favorite count for content
 */
export function useFavoriteCount(contentId: string) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['favorite-count', contentId],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetFavoriteCount($contentId: uuid!) {
            get_favorite_count(p_content_id: $contentId)
          }
        `,
        variables: { contentId },
      });

      return data.get_favorite_count as number;
    },
    enabled: !!contentId,
  });
}

/**
 * Get user's favorite genres (for recommendations)
 */
export function useFavoriteGenres(profileId?: string, limit: number = 10) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['favorite-genres', profileId, limit],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetFavoriteGenres($profileId: uuid, $limit: Int) {
            get_favorite_genres(
              p_profile_id: $profileId
              p_limit: $limit
            ) {
              genre
              count
            }
          }
        `,
        variables: { profileId, limit },
      });

      return (data.get_favorite_genres || []) as Array<{
        genre: string;
        count: number;
      }>;
    },
    enabled: !!profileId,
  });
}

/**
 * Get favorite collections
 */
export function useFavoriteCollections(profileId?: string) {
  const { request } = useGraphQL();

  return useQuery({
    queryKey: ['favorite-collections', profileId],
    queryFn: async () => {
      const data = await request({
        query: `
          query GetFavoriteCollections($profileId: uuid) {
            favorite_collections(
              where: { profile_id: { _eq: $profileId } }
              order_by: { updated_at: desc }
            ) {
              id
              name
              description
              icon
              is_public
              created_at
              updated_at
              items: favorite_collection_items_aggregate {
                aggregate {
                  count
                }
              }
            }
          }
        `,
        variables: { profileId },
      });

      return (data.favorite_collections || []).map((collection: any) => ({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        icon: collection.icon,
        isPublic: collection.is_public,
        itemCount: collection.items.aggregate.count,
        createdAt: collection.created_at,
        updatedAt: collection.updated_at,
      })) as FavoriteCollection[];
    },
    enabled: !!profileId,
  });
}

/**
 * Create favorite collection
 */
export function useCreateFavoriteCollection() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      name,
      description,
      icon,
      isPublic,
    }: {
      profileId?: string;
      name: string;
      description?: string;
      icon?: string;
      isPublic?: boolean;
    }) => {
      const data = await request({
        query: `
          mutation CreateFavoriteCollection(
            $profileId: uuid
            $name: String!
            $description: String
            $icon: String
            $isPublic: Boolean
          ) {
            insert_favorite_collections_one(
              object: {
                profile_id: $profileId
                name: $name
                description: $description
                icon: $icon
                is_public: $isPublic
              }
            ) {
              id
              name
            }
          }
        `,
        variables: { profileId, name, description, icon, isPublic },
      });

      return data.insert_favorite_collections_one;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-collections'] });
    },
  });
}

/**
 * Add favorite to collection
 */
export function useAddToFavoriteCollection() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      favoriteId,
      position,
    }: {
      collectionId: string;
      favoriteId: string;
      position?: number;
    }) => {
      const data = await request({
        query: `
          mutation AddToFavoriteCollection(
            $collectionId: uuid!
            $favoriteId: uuid!
            $position: Int
          ) {
            insert_favorite_collection_items_one(
              object: {
                collection_id: $collectionId
                favorite_id: $favoriteId
                position: $position
              }
              on_conflict: {
                constraint: favorite_collection_items_collection_id_favorite_id_key
                update_columns: [position]
              }
            ) {
              id
            }
          }
        `,
        variables: { collectionId, favoriteId, position },
      });

      return data.insert_favorite_collection_items_one;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorite-collections'] });
      queryClient.invalidateQueries({
        queryKey: ['favorite-collection', variables.collectionId],
      });
    },
  });
}
