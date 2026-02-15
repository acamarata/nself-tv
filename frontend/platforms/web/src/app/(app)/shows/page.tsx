/**
 * TV Shows browse page with genre filtering
 */

'use client';

import React, { useState } from 'react';
import { useShows, usePendingShows } from '@/hooks/useShows';
import Link from 'next/link';

const GENRES = [
  'All',
  'Drama',
  'Comedy',
  'Action',
  'Sci-Fi',
  'Crime',
  'Fantasy',
  'Horror',
  'Documentary',
  'Animation',
  'Reality',
];

export default function ShowsPage() {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const { data, loading, error } = useShows(
    selectedGenre === 'All' ? undefined : selectedGenre
  );
  const { data: pendingData } = usePendingShows();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading TV shows...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Error loading TV shows: {error.message}</div>
      </div>
    );
  }

  const shows = data?.media_items || [];
  const pendingShows = pendingData?.media_items || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">TV Shows</h1>
          <Link
            href="/shows/search"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Add Show
          </Link>
        </div>

        {/* Genre filter */}
        <div className="flex gap-2 overflow-x-auto pb-4">
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
      </div>

      {/* Pending / Processing */}
      {selectedGenre === 'All' && pendingShows.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Processing</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {pendingShows.map((show: any) => (
              <Link
                key={show.id}
                href={`/shows/${show.id}`}
                className="flex-shrink-0 w-40 group"
              >
                <div className="bg-gray-800 rounded-lg overflow-hidden relative">
                  {show.poster_url ? (
                    <img
                      src={show.poster_url}
                      alt={show.title}
                      className="w-full aspect-[2/3] object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 text-4xl">TV</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      show.status === 'pending' ? 'bg-yellow-600 text-white' :
                      show.status === 'downloading' ? 'bg-blue-600 text-white' :
                      show.status === 'processing' ? 'bg-purple-600 text-white' :
                      show.status === 'error' ? 'bg-red-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {show.status === 'pending' ? 'Pending' :
                       show.status === 'downloading' ? 'Downloading' :
                       show.status === 'processing' ? 'Processing' :
                       show.status === 'error' ? 'Error' :
                       show.status}
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm line-clamp-1">
                      {show.title}
                    </h3>
                    <p className="text-xs text-gray-400">{show.year}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Show grid */}
      {shows.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>No TV shows found{selectedGenre !== 'All' ? ` in ${selectedGenre}` : ''}.</p>
          <Link
            href="/shows/search"
            className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Show
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {shows.map((show: any) => (
            <Link
              key={show.id}
              href={`/shows/${show.id}`}
              className="group"
            >
              <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors">
                {show.poster_url ? (
                  <img
                    src={show.poster_url}
                    alt={show.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-500 text-4xl">TV</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {show.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    {show.year && <span>{show.year}</span>}
                    {show.community_rating && (
                      <>
                        <span>-</span>
                        <span className="text-yellow-400">
                          {Number(show.community_rating).toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                  {show.genres && show.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {show.genres.slice(0, 2).map((genre: string) => (
                        <span
                          key={genre}
                          className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
