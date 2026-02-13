'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import type { MediaItem, MediaType } from '@/types/content';
import type { SearchResult } from '@/types/catalog';
import { SEARCH_CONTENT } from '@/lib/graphql/queries';

const DEBOUNCE_MS = 300;
const RECENT_SEARCHES_KEY = 'ntv_recent_searches';
const MAX_RECENT = 10;

function mapItem(raw: Record<string, unknown>): MediaItem {
  return {
    id: raw.id as string,
    type: raw.type as MediaType,
    title: raw.title as string,
    originalTitle: null,
    year: raw.year as number | null,
    overview: (raw.overview as string) || null,
    posterUrl: (raw.poster_url as string) || null,
    backdropUrl: null,
    genres: (raw.genres as string[]) || [],
    contentRating: (raw.content_rating as string) || null,
    runtime: (raw.runtime as number) || null,
    voteAverage: (raw.vote_average as number) || null,
    voteCount: 0,
    status: 'released',
    createdAt: '',
    updatedAt: '',
  };
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | undefined>();
  const [results, setResults] = useState<SearchResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [executeSearch, { loading }] = useLazyQuery(SEARCH_CONTENT, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const items: MediaItem[] = (data.search_media || []).map(mapItem);
      const typeCounts: Record<MediaType, number> = {
        movie: 0,
        tv_show: 0,
        episode: 0,
        podcast: 0,
        game: 0,
      };
      for (const item of items) {
        typeCounts[item.type]++;
      }
      setResults({
        items,
        totalCount: items.length,
        query,
        activeType: typeFilter,
        typeCounts,
      });
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const search = useCallback((q: string, type?: MediaType) => {
    setQuery(q);
    setTypeFilter(type);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      executeSearch({ variables: { query: q.trim(), type: type || null, limit: 50 } });
    }, DEBOUNCE_MS);
  }, [executeSearch]);

  const addToRecent = useCallback((q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  return {
    query,
    typeFilter,
    results,
    isLoading: loading,
    search,
    setTypeFilter: (type?: MediaType) => search(query, type),
    recentSearches,
    addToRecent,
    clearRecent,
  };
}
