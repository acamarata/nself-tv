/**
 * Movies browse page with genre filtering and recently added section
 */

'use client';

import React, { useState } from 'react';
import { useMovies, useRecentMovies, usePendingMovies } from '@/hooks/useMovies';
import Link from 'next/link';

const GENRES = [
  'All',
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Thriller',
  'Romance',
  'Animation',
  'Documentary',
];

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  const stars = Math.round(rating / 2);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= stars ? 'text-yellow-400' : 'text-gray-600'}
        >
          &#9733;
        </span>
      ))}
      <span className="text-xs text-gray-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function MoviesPage() {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const { data, loading, error } = useMovies(
    selectedGenre === 'All' ? undefined : selectedGenre
  );
  const { data: recentData, loading: recentLoading } = useRecentMovies();
  const { data: pendingData } = usePendingMovies();

  if (loading && recentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading movies...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Error loading movies: {error.message}</div>
      </div>
    );
  }

  const movies = data?.media_items || [];
  const totalCount = data?.media_items_aggregate?.aggregate?.count || 0;
  const recentMovies = recentData?.media_items || [];
  const pendingMovies = pendingData?.media_items || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Movies</h1>
          <p className="text-gray-400 mt-1">{totalCount} movie{totalCount !== 1 ? 's' : ''} in library</p>
        </div>
        <Link
          href="/movies/search"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Add Movie
        </Link>
      </div>

      {/* Genre filter */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedGenre === genre
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Pending / Processing */}
      {selectedGenre === 'All' && pendingMovies.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Processing</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {pendingMovies.map((movie: any) => (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="flex-shrink-0 w-40 group"
              >
                <div className="bg-gray-800 rounded-lg overflow-hidden relative">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 text-4xl">&#127909;</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      movie.status === 'pending' ? 'bg-yellow-600 text-white' :
                      movie.status === 'downloading' ? 'bg-blue-600 text-white' :
                      movie.status === 'processing' ? 'bg-purple-600 text-white' :
                      movie.status === 'error' ? 'bg-red-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {movie.status === 'pending' ? 'Pending' :
                       movie.status === 'downloading' ? 'Downloading' :
                       movie.status === 'processing' ? 'Processing' :
                       movie.status === 'error' ? 'Error' :
                       movie.status}
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm line-clamp-1">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-gray-400">{movie.year}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recently Added */}
      {selectedGenre === 'All' && recentMovies.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Recently Added</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {recentMovies.map((movie: any) => (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="flex-shrink-0 w-40 group"
              >
                <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 text-4xl">&#127909;</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-blue-400 transition-colors">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-gray-400">{movie.year}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main movie grid */}
      {movies.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>No movies found{selectedGenre !== 'All' ? ` in ${selectedGenre}` : ''}</p>
          <Link
            href="/movies/search"
            className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Movie
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {movies.map((movie: any) => (
            <Link
              key={movie.id}
              href={`/movies/${movie.id}`}
              className="group"
            >
              <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors">
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
                  <h3 className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    {movie.year && <span>{movie.year}</span>}
                    {movie.runtime_minutes && (
                      <>
                        <span>·</span>
                        <span>{formatRuntime(movie.runtime_minutes)}</span>
                      </>
                    )}
                  </div>
                  <StarRating rating={movie.community_rating} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
