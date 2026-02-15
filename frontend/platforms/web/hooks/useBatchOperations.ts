import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from './useGraphQL';

export interface BatchOperation {
  type:
    | 'add-to-watchlist'
    | 'remove-from-watchlist'
    | 'add-to-favorites'
    | 'remove-from-favorites'
    | 'mark-watched'
    | 'mark-unwatched'
    | 'delete'
    | 'change-quality'
    | 'download'
    | 'remove-download';
  contentIds: string[];
  options?: Record<string, any>;
}

/**
 * Batch selection manager
 */
export function useBatchSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const enableSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const disableSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    isSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    enableSelectionMode,
    disableSelectionMode,
  };
}

/**
 * Batch add to watchlist
 */
export function useBatchAddToWatchlist() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentIds: string[]) => {
      const data = await request({
        query: `
          mutation BatchAddToWatchlist($objects: [watchlist_insert_input!]!) {
            insert_watchlist(
              objects: $objects
              on_conflict: {
                constraint: watchlist_user_id_content_id_key
                update_columns: []
              }
            ) {
              affected_rows
            }
          }
        `,
        variables: {
          objects: contentIds.map((id) => ({ content_id: id })),
        },
      });

      return data.insert_watchlist.affected_rows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

/**
 * Batch remove from watchlist
 */
export function useBatchRemoveFromWatchlist() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentIds: string[]) => {
      const data = await request({
        query: `
          mutation BatchRemoveFromWatchlist($contentIds: [uuid!]!) {
            delete_watchlist(
              where: { content_id: { _in: $contentIds } }
            ) {
              affected_rows
            }
          }
        `,
        variables: { contentIds },
      });

      return data.delete_watchlist.affected_rows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

/**
 * Batch add to favorites
 */
export function useBatchAddToFavorites() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentIds: string[]) => {
      const data = await request({
        query: `
          mutation BatchAddToFavorites($objects: [favorites_insert_input!]!) {
            insert_favorites(
              objects: $objects
              on_conflict: {
                constraint: favorites_user_id_profile_id_content_id_key
                update_columns: []
              }
            ) {
              affected_rows
            }
          }
        `,
        variables: {
          objects: contentIds.map((id) => ({ content_id: id })),
        },
      });

      return data.insert_favorites.affected_rows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

/**
 * Batch mark as watched
 */
export function useBatchMarkWatched() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentIds: string[]) => {
      const data = await request({
        query: `
          mutation BatchMarkWatched($objects: [watch_history_insert_input!]!) {
            insert_watch_history(
              objects: $objects
              on_conflict: {
                constraint: watch_history_user_id_content_id_key
                update_columns: [completed, progress, watched_at]
              }
            ) {
              affected_rows
            }
          }
        `,
        variables: {
          objects: contentIds.map((id) => ({
            content_id: id,
            completed: true,
            progress: 100,
            watched_at: new Date().toISOString(),
          })),
        },
      });

      return data.insert_watch_history.affected_rows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-history'] });
      queryClient.invalidateQueries({ queryKey: ['watch-progress'] });
    },
  });
}

/**
 * Batch download
 */
export function useBatchDownload() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentIds,
      quality,
    }: {
      contentIds: string[];
      quality: string;
    }) => {
      const data = await request({
        query: `
          mutation BatchDownload($objects: [downloads_insert_input!]!) {
            insert_downloads(
              objects: $objects
              on_conflict: {
                constraint: downloads_user_id_content_id_key
                update_columns: [status, quality]
              }
            ) {
              affected_rows
              returning {
                id
                content_id
              }
            }
          }
        `,
        variables: {
          objects: contentIds.map((id) => ({
            content_id: id,
            quality,
            status: 'pending',
          })),
        },
      });

      return data.insert_downloads;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });
}

/**
 * Batch delete downloads
 */
export function useBatchRemoveDownloads() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentIds: string[]) => {
      const data = await request({
        query: `
          mutation BatchRemoveDownloads($contentIds: [uuid!]!) {
            delete_downloads(
              where: { content_id: { _in: $contentIds } }
            ) {
              affected_rows
            }
          }
        `,
        variables: { contentIds },
      });

      return data.delete_downloads.affected_rows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });
}

/**
 * Unified batch operation executor
 */
export function useBatchExecutor() {
  const addToWatchlist = useBatchAddToWatchlist();
  const removeFromWatchlist = useBatchRemoveFromWatchlist();
  const addToFavorites = useBatchAddToFavorites();
  const markWatched = useBatchMarkWatched();
  const download = useBatchDownload();
  const removeDownloads = useBatchRemoveDownloads();

  const execute = useCallback(
    async (operation: BatchOperation) => {
      const { type, contentIds, options } = operation;

      switch (type) {
        case 'add-to-watchlist':
          return addToWatchlist.mutateAsync(contentIds);

        case 'remove-from-watchlist':
          return removeFromWatchlist.mutateAsync(contentIds);

        case 'add-to-favorites':
          return addToFavorites.mutateAsync(contentIds);

        case 'mark-watched':
          return markWatched.mutateAsync(contentIds);

        case 'download':
          if (!options?.quality) throw new Error('Quality required for download');
          return download.mutateAsync({
            contentIds,
            quality: options.quality,
          });

        case 'remove-download':
          return removeDownloads.mutateAsync(contentIds);

        default:
          throw new Error(`Unknown operation: ${type}`);
      }
    },
    [
      addToWatchlist,
      removeFromWatchlist,
      addToFavorites,
      markWatched,
      download,
      removeDownloads,
    ]
  );

  const isPending =
    addToWatchlist.isPending ||
    removeFromWatchlist.isPending ||
    addToFavorites.isPending ||
    markWatched.isPending ||
    download.isPending ||
    removeDownloads.isPending;

  return { execute, isPending };
}

/**
 * Progress tracking for batch operations
 */
export function useBatchProgress() {
  const [progress, setProgress] = useState<{
    total: number;
    completed: number;
    errors: number;
    currentOperation?: string;
  }>({
    total: 0,
    completed: 0,
    errors: 0,
  });

  const start = useCallback((total: number, operation: string) => {
    setProgress({
      total,
      completed: 0,
      errors: 0,
      currentOperation: operation,
    });
  }, []);

  const incrementCompleted = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      completed: prev.completed + 1,
    }));
  }, []);

  const incrementErrors = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      errors: prev.errors + 1,
    }));
  }, []);

  const reset = useCallback(() => {
    setProgress({
      total: 0,
      completed: 0,
      errors: 0,
    });
  }, []);

  const percentage =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return {
    ...progress,
    percentage,
    isInProgress: progress.total > 0 && progress.completed < progress.total,
    start,
    incrementCompleted,
    incrementErrors,
    reset,
  };
}
