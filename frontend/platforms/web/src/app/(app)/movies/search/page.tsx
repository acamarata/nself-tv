/**
 * Add Movie search page — search and add movies to the library
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchMovies, useAddMovie } from '@/hooks/useMovies';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function MovieSearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data, loading } = useSearchMovies(debouncedQuery);
  const [addMovie] = useAddMovie();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const results = data?.media_items || [];

  const handleAdd = async (movie: any) => {
    setAddingId(movie.id);
    try {
      await addMovie({
        variables: {
          family_id: user?.familyId,
          title: movie.title,
          overview: movie.overview,
          year: movie.year,
          runtime_minutes: movie.runtime_minutes,
          genres: movie.genres,
          poster_url: movie.poster_url,
          content_rating: movie.content_rating,
          community_rating: movie.community_rating,
        },
      });
      setAddedIds((prev) => new Set(prev).add(movie.id));
    } catch {
      // Error handled by Apollo
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Add Movie</h1>
        <Link
          href="/movies"
          className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Browse Library
        </Link>
      </div>

      {/* Search input */}
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies to add..."
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
      ) : results.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>No movies found for &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <>
          <p className="text-gray-400 mb-6">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((movie: any) => {
              const isAdded = addedIds.has(movie.id);
              const isAdding = addingId === movie.id;

              return (
                <div
                  key={movie.id}
                  className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors"
                >
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 text-5xl">&#127909;</span>
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1 line-clamp-2">
                      {movie.title}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      {movie.year && <span>{movie.year}</span>}
                      {movie.community_rating != null && (
                        <>
                          <span>·</span>
                          <span className="text-yellow-400">&#9733;</span>
                          <span>{movie.community_rating.toFixed(1)}</span>
                        </>
                      )}
                    </div>

                    {movie.genres && movie.genres.length > 0 && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                        {movie.genres.join(', ')}
                      </p>
                    )}

                    {movie.overview && (
                      <p className="text-xs text-gray-500 line-clamp-3 mb-3">
                        {movie.overview}
                      </p>
                    )}

                    {isAdded ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm cursor-default"
                      >
                        Added
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAdd(movie)}
                        disabled={isAdding}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isAdding ? 'Adding...' : 'Add to Library'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
