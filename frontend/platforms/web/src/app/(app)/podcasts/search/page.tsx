/**
 * Podcast search page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearchPodcasts } from '@/hooks/usePodcasts';
import Link from 'next/link';

export default function PodcastSearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  const { data, loading } = useSearchPodcasts(debouncedQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const shows = data?.podcast_shows || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Search Podcasts</h1>

      {/* Search input */}
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or description..."
          className="w-full px-6 py-4 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          autoFocus
        />
      </div>

      {/* Search results */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">
          <p>Searching...</p>
        </div>
      ) : query.length < 2 ? (
        <div className="text-center text-gray-400 py-12">
          <p>Enter at least 2 characters to search</p>
        </div>
      ) : shows.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>No podcasts found for &quot;{query}&quot;</p>
        </div>
      ) : (
        <>
          <p className="text-gray-400 mb-6">
            Found {shows.length} podcast{shows.length !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shows.map((show: any) => (
              <Link
                key={show.id}
                href={`/podcasts/${show.id}`}
                className="flex gap-4 bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors p-4"
              >
                {show.artwork_url && (
                  <img
                    src={show.artwork_url}
                    alt={show.title}
                    className="w-24 h-24 rounded object-cover flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-1 line-clamp-2">
                    {show.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-2">{show.author}</p>
                  {show.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {show.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
