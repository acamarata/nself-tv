'use client';

import { useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import type { WatchlistItem, MediaItem, MediaType } from '@/types/content';
import { GET_WATCHLIST, ADD_TO_WATCHLIST, REMOVE_FROM_WATCHLIST, REORDER_WATCHLIST } from '@/lib/graphql/queries';
import { useProfiles } from './useProfiles';

function mapItem(raw: Record<string, unknown>): WatchlistItem {
  const mediaRaw = raw.media_item as Record<string, unknown>;
  return {
    id: raw.id as string,
    mediaItemId: raw.media_item_id as string,
    profileId: raw.profile_id as string,
    sortOrder: raw.sort_order as number,
    addedAt: raw.added_at as string,
    mediaItem: {
      id: mediaRaw.id as string,
      type: mediaRaw.type as MediaType,
      title: mediaRaw.title as string,
      originalTitle: null,
      year: mediaRaw.year as number | null,
      overview: null,
      posterUrl: (mediaRaw.poster_url as string) || null,
      backdropUrl: null,
      genres: (mediaRaw.genres as string[]) || [],
      contentRating: (mediaRaw.content_rating as string) || null,
      runtime: (mediaRaw.runtime as number) || null,
      voteAverage: (mediaRaw.vote_average as number) || null,
      voteCount: 0,
      status: 'released',
      createdAt: '',
      updatedAt: '',
    },
  };
}

export function useWatchlist() {
  const { currentProfile } = useProfiles();

  const { data, loading, refetch } = useQuery(GET_WATCHLIST, {
    variables: { profileId: currentProfile?.id },
    skip: !currentProfile?.id,
  });

  const [addMutation] = useMutation(ADD_TO_WATCHLIST);
  const [removeMutation] = useMutation(REMOVE_FROM_WATCHLIST);
  const [reorderMutation] = useMutation(REORDER_WATCHLIST);

  const items: WatchlistItem[] = (data?.watchlist_items || []).map(mapItem);

  const isInWatchlist = useCallback((mediaItemId: string) => {
    return items.some((i) => i.mediaItemId === mediaItemId);
  }, [items]);

  const getWatchlistItem = useCallback((mediaItemId: string) => {
    return items.find((i) => i.mediaItemId === mediaItemId) || null;
  }, [items]);

  const add = useCallback(async (mediaItemId: string) => {
    if (!currentProfile) return;
    await addMutation({
      variables: { profileId: currentProfile.id, mediaItemId },
      optimisticResponse: {
        insert_watchlist_items_one: {
          __typename: 'watchlist_items',
          id: `temp-${Date.now()}`,
          media_item_id: mediaItemId,
          profile_id: currentProfile.id,
          sort_order: items.length,
          added_at: new Date().toISOString(),
        },
      },
    });
    await refetch();
  }, [currentProfile, addMutation, refetch, items.length]);

  const remove = useCallback(async (mediaItemId: string) => {
    const item = getWatchlistItem(mediaItemId);
    if (!item) return;
    await removeMutation({ variables: { id: item.id } });
    await refetch();
  }, [getWatchlistItem, removeMutation, refetch]);

  const toggle = useCallback(async (mediaItemId: string) => {
    if (isInWatchlist(mediaItemId)) {
      await remove(mediaItemId);
    } else {
      await add(mediaItemId);
    }
  }, [isInWatchlist, add, remove]);

  const reorder = useCallback(async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) => ({
      where: { id: { _eq: id } },
      _set: { sort_order: index },
    }));
    await reorderMutation({ variables: { updates } });
    await refetch();
  }, [reorderMutation, refetch]);

  return {
    items,
    isLoading: loading,
    isInWatchlist,
    add,
    remove,
    toggle,
    reorder,
  };
}
