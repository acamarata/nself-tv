'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { mapToMediaItem } from '@/types/content';
import type { MediaType } from '@/types/content';
import type { CatalogFilters, CatalogState, SortOption, ViewMode } from '@/types/catalog';
import { SORT_OPTIONS } from '@/types/catalog';
import { GET_CATALOG_ITEMS } from '@/lib/graphql/queries';

const PAGE_SIZE = 24;

function buildWhereClause(filters: CatalogFilters) {
  const where: Record<string, unknown> = {};
  if (filters.type) where.type = { _eq: filters.type };
  if (filters.genres?.length) where.genres = { _contains: filters.genres };
  if (filters.year) where.year = { _eq: filters.year };
  if (filters.yearFrom || filters.yearTo) {
    where.year = {
      ...(filters.yearFrom ? { _gte: filters.yearFrom } : {}),
      ...(filters.yearTo ? { _lte: filters.yearTo } : {}),
    };
  }
  if (filters.minRating) where.community_rating = { _gte: filters.minRating };
  if (filters.contentRating) where.content_rating = { _lte: filters.contentRating };
  return where;
}

function buildOrderBy(sort: SortOption) {
  const dir = sort.direction;
  switch (sort.field) {
    case 'title': return [{ title: dir }];
    case 'year': return [{ year: dir }];
    case 'rating': return [{ community_rating: `${dir}_nulls_last` }];
    case 'added': return [{ added_at: dir }];
    case 'popularity': return [{ vote_count: dir }];
    default: return [{ title: 'asc' }];
  }
}

export function useCatalog(initialType?: MediaType) {
  const [state, setState] = useState<CatalogState>({
    items: [],
    totalCount: 0,
    filters: initialType ? { type: initialType } : {},
    sort: SORT_OPTIONS[0],
    viewMode: 'grid',
    page: 0,
    pageSize: PAGE_SIZE,
    isLoading: true,
    hasMore: false,
  });

  const [fetchItems, { loading }] = useLazyQuery(GET_CATALOG_ITEMS, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const items = (data.media_items || []).map(mapToMediaItem);
      const total = data.media_items_aggregate?.aggregate?.count || 0;
      setState((prev) => ({
        ...prev,
        items: prev.page === 0 ? items : [...prev.items, ...items],
        totalCount: total,
        isLoading: false,
        hasMore: (prev.page + 1) * PAGE_SIZE < total,
      }));
    },
  });

  const doFetch = useCallback((filters: CatalogFilters, sort: SortOption, page: number) => {
    fetchItems({
      variables: {
        where: buildWhereClause(filters),
        orderBy: buildOrderBy(sort),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      },
    });
  }, [fetchItems]);

  useEffect(() => {
    doFetch(state.filters, state.sort, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilters = useCallback((filters: CatalogFilters) => {
    setState((prev) => ({ ...prev, filters, page: 0, items: [], isLoading: true }));
    doFetch(filters, state.sort, 0);
  }, [doFetch, state.sort]);

  const setSort = useCallback((sort: SortOption) => {
    setState((prev) => ({ ...prev, sort, page: 0, items: [], isLoading: true }));
    doFetch(state.filters, sort, 0);
  }, [doFetch, state.filters]);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setState((prev) => ({ ...prev, viewMode }));
  }, []);

  const loadMore = useCallback(() => {
    if (!state.hasMore || loading) return;
    const nextPage = state.page + 1;
    setState((prev) => ({ ...prev, page: nextPage, isLoading: true }));
    doFetch(state.filters, state.sort, nextPage);
  }, [state.hasMore, state.page, state.filters, state.sort, loading, doFetch]);

  return {
    ...state,
    setFilters,
    setSort,
    setViewMode,
    loadMore,
  };
}
