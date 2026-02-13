'use client';

import { Film, Tv, Search } from 'lucide-react';
import type { SearchResult } from '@/types/catalog';
import type { MediaType } from '@/types/content';
import { ContentCard } from '@/components/content/ContentCard';

interface SearchResultsProps {
  results: SearchResult;
  onTypeFilter: (type?: MediaType) => void;
}

interface TypeTab {
  label: string;
  type?: MediaType;
}

const typeTabs: TypeTab[] = [
  { label: 'All' },
  { label: 'Movies', type: 'movie' },
  { label: 'TV Shows', type: 'tv_show' },
  { label: 'Episodes', type: 'episode' },
  { label: 'Podcasts', type: 'podcast' },
  { label: 'Games', type: 'game' },
];

function SearchResults({ results, onTypeFilter }: SearchResultsProps) {
  const { items, totalCount, activeType } = results;

  return (
    <div>
      {/* Type filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-4 md:px-8 scrollbar-hide">
        {typeTabs.map((tab) => {
          const isActive =
            (tab.type === undefined && activeType === undefined) ||
            tab.type === activeType;
          const count =
            tab.type === undefined
              ? totalCount
              : (results.typeCounts?.[tab.type] ?? 0);

          return (
            <button
              key={tab.label}
              onClick={() => onTypeFilter(tab.type)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-border'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 ${isActive ? 'text-white/80' : 'text-text-muted'}`}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-8 mt-6">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} showWatchlistButton />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Search className="h-16 w-16 mb-4" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

export { SearchResults };
export type { SearchResultsProps };
