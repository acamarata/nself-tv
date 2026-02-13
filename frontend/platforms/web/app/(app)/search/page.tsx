'use client';

import { useSearch } from '@/hooks/useSearch';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { Spinner } from '@/components/ui/Spinner';

export default function SearchPage() {
  const {
    query,
    results,
    isLoading,
    search,
    setTypeFilter,
    recentSearches,
    addToRecent,
    clearRecent,
  } = useSearch();

  const handleSearch = (value: string) => {
    search(value);
  };

  const handleSubmit = () => {
    if (query.trim()) {
      addToRecent(query.trim());
    }
  };

  const handleRecentClick = (term: string) => {
    search(term);
    addToRecent(term);
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Search</h1>

      {/* Search Bar */}
      <div className="max-w-2xl mb-8">
        <SearchBar
          value={query}
          onChange={handleSearch}
          onSubmit={handleSubmit}
          placeholder="Search movies, TV shows, and more..."
        />
      </div>

      {/* Search Results */}
      {hasQuery && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : results && results.items.length > 0 ? (
            <SearchResults results={results} onTypeFilter={setTypeFilter} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <svg
                className="w-16 h-16 text-text-tertiary mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                No results found
              </h2>
              <p className="text-text-secondary text-sm">
                Try searching with different keywords.
              </p>
            </div>
          )}
        </>
      )}

      {/* Recent Searches (shown when no query) */}
      {!hasQuery && recentSearches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Recent Searches
            </h2>
            <button
              onClick={clearRecent}
              className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-1">
            {recentSearches.map((term, index) => (
              <button
                key={`${term}-${index}`}
                onClick={() => handleRecentClick(term)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <svg
                  className="w-4 h-4 text-text-tertiary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State (no query, no recents) */}
      {!hasQuery && recentSearches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <svg
            className="w-16 h-16 text-text-tertiary mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Find your next watch
          </h2>
          <p className="text-text-secondary text-sm">
            Search for movies, TV shows, actors, and more.
          </p>
        </div>
      )}
    </div>
  );
}
