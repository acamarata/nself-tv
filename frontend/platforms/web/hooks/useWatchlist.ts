'use client';

import { useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { mapToMediaItem } from '@/types/content';
import type { WatchlistItem } from '@/types/content';
import { GET_WATCHLIST, ADD_TO_WATCHLIST, REMOVE_FROM_WATCHLIST } from '@/lib/graphql/queries';
import { useAuth } from './useAuth';

function mapWatchlistItem(raw: Record<string, unknown>): WatchlistItem {
  const mediaRaw = raw.media_item as Record<string, unknown>;
  return {
    id: raw.id as string,
    mediaItemId: raw.media_item_id as string,
    userId: '',
    mediaItem: mapToMediaItem(mediaRaw),
    position: (raw.position as number) ?? 0,
    addedAt: (raw.added_at as string) ?? '',
  };
}

export function useWatchlist() {
  const { user } = useAuth();

  const { data, loading, refetch } = useQuery(GET_WATCHLIST, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  const [addMutation] = useMutation(ADD_TO_WATCHLIST);
  const [removeMutation] = useMutation(REMOVE_FROM_WATCHLIST);

  const playlistId = data?.playlists?.[0]?.id;
  const items: WatchlistItem[] = (data?.playlists?.[0]?.items || []).map(mapWatchlistItem);

  const isInWatchlist = useCallback((mediaItemId: string) => {
    return items.some((i) => i.mediaItemId === mediaItemId);
  }, [items]);

  const getWatchlistItem = useCallback((mediaItemId: string) => {
    return items.find((i) => i.mediaItemId === mediaItemId) || null;
  }, [items]);

  const add = useCallback(async (mediaItemId: string) => {
    if (!playlistId) return;
    await addMutation({
      variables: { playlistId, mediaItemId },
    });
    await refetch();
  }, [playlistId, addMutation, refetch]);

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

  return {
    items,
    isLoading: loading,
    isInWatchlist,
    add,
    remove,
    toggle,
  };
}
