/**
 * Add Show search page - search and subscribe to TV shows
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchShows, useAddShow } from '@/hooks/useShows';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function ShowSearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const { data, loading } = useSearchShows(debouncedQuery);
  const [addShow, { loading: adding }] = useAddShow();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const shows = data?.media_items || [];

  const handleAddShow = async (show: any) => {
    try {
      await addShow({
        variables: {
          family_id: user?.familyId,
          title: show.title,
          overview: show.overview,
          year: show.year,
          genres: show.genres,
          poster_url: show.poster_url,
          content_rating: show.content_rating,
          community_rating: show.community_rating,
        },
      });
      setAddedIds((prev) => new Set(prev).add(show.id));
    } catch (err) {
      console.error('Failed to add show:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Add TV Show</h1>
        <Link
          href="/shows"
          className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Library
        </Link>
      </div>

      {/* Search input */}
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a TV show by title..."
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
          <p>No TV shows found for &quot;{query}&quot;</p>
        </div>
      ) : (
        <>
          <p className="text-gray-400 mb-6">
            Found {shows.length} show{shows.length !== 1 ? 's' : ''}
          </p>

          <div className="space-y-4">
            {shows.map((show: any) => (
              <div
                key={show.id}
                className="flex gap-4 bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors p-4"
              >
                {/* Poster */}
                {show.poster_url ? (
                  <img
                    src={show.poster_url}
                    alt={show.title}
                    className="w-24 h-36 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-36 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-500 text-sm">No Image</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {show.title}
                      </h3>

                      <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                        {show.year && <span>{show.year}</span>}
                        {show.community_rating && (
                          <span className="text-yellow-400">
                            {Number(show.community_rating).toFixed(1)} / 10
                          </span>
                        )}
                        {show.content_rating && (
                          <span className="px-2 py-0.5 border border-gray-500 rounded text-xs">
                            {show.content_rating}
                          </span>
                        )}
                      </div>

                      {show.genres && show.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {show.genres.map((genre: string) => (
                            <span
                              key={genre}
                              className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}

                      {show.overview && (
                        <p className="text-sm text-gray-300 line-clamp-3">{show.overview}</p>
                      )}
                    </div>

                    {/* Subscribe button */}
                    <div className="flex-shrink-0">
                      {addedIds.has(show.id) ? (
                        <span className="px-6 py-3 bg-green-600 text-white rounded-lg inline-block">
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddShow(show)}
                          disabled={adding}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {adding ? 'Adding...' : 'Subscribe to Show'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
