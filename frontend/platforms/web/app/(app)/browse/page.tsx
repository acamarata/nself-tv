'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCatalog } from '@/hooks/useCatalog';
import { ContentGrid } from '@/components/content/ContentGrid';
import { Spinner } from '@/components/ui/Spinner';
import { SORT_OPTIONS, GENRES } from '@/types/catalog';

function sortKey(opt: typeof SORT_OPTIONS[number]) {
  return `${opt.field}:${opt.direction}`;
}

export default function BrowsePage() {
  const {
    items,
    totalCount,
    filters,
    sort,
    viewMode,
    isLoading,
    hasMore,
    setFilters,
    setSort,
    setViewMode,
    loadMore,
  } = useCatalog();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        loadMore();
      }
    },
    [hasMore, isLoading, loadMore],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  const activeGenres = filters.genres ?? [];

  const toggleGenre = (genre: string) => {
    const current = activeGenres;
    const next = current.includes(genre)
      ? current.filter((g: string) => g !== genre)
      : [...current, genre];
    setFilters({ ...filters, genres: next });
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Browse</h1>
          {totalCount > 0 && (
            <p className="text-sm text-text-tertiary mt-1">
              {totalCount.toLocaleString()} titles
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <select
            value={sortKey(sort)}
            onChange={(e) => {
              const found = SORT_OPTIONS.find((o) => sortKey(o) === e.target.value);
              if (found) setSort(found);
            }}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={sortKey(option)} value={sortKey(option)}>
                {option.label}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
              aria-label="Grid view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
              aria-label="List view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Genre Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => toggleGenre(genre)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeGenres.includes(genre)
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {genre}
          </button>
        ))}
        {activeGenres.length > 0 && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Content Grid */}
      <ContentGrid items={items} viewMode={viewMode} isLoading={isLoading && items.length === 0} />

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading More Indicator */}
      {isLoading && items.length > 0 && (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      )}

      {/* End of Results */}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-text-tertiary text-sm py-8">
          You&apos;ve reached the end
        </p>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="w-16 h-16 text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <h2 className="text-lg font-semibold text-text-primary mb-2">No content found</h2>
          <p className="text-text-secondary text-sm">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}
    </div>
  );
}
