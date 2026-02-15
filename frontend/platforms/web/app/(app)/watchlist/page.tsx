'use client';

import { useWatchlist } from '@/hooks/useWatchlist';
import { ContentCard } from '@/components/content/ContentCard';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function WatchlistPage() {
  const { items, isLoading, remove } = useWatchlist();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Watchlist</h1>
          {items.length > 0 && (
            <p className="text-sm text-text-tertiary mt-1">
              {items.length} {items.length === 1 ? 'title' : 'titles'}
            </p>
          )}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              <Link href={`/${item.mediaItem?.id ?? item.id}`}>
                <ContentCard item={item.mediaItem ?? item} />
              </Link>

              {/* Remove Button */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    remove(item.mediaItemId);
                  }}
                  className="w-7 h-7 flex items-center justify-center bg-red-600/80 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Remove from watchlist"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
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
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Your watchlist is empty
          </h2>
          <p className="text-text-secondary text-sm mb-6">
            Browse content and add titles to your watchlist to keep track of what you want to watch.
          </p>
          <Link href="/browse">
            <Button variant="primary">Browse Content</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
