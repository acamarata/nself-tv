/**
 * Podcasts browse page with category filtering
 */

'use client';

import React, { useState } from 'react';
import { usePodcastShows } from '@/hooks/usePodcasts';
import Link from 'next/link';

const CATEGORIES = [
  'All',
  'Arts',
  'Business',
  'Comedy',
  'Education',
  'Fiction',
  'Government',
  'Health & Fitness',
  'History',
  'Kids & Family',
  'Leisure',
  'Music',
  'News',
  'Religion & Spirituality',
  'Science',
  'Society & Culture',
  'Sports',
  'Technology',
  'True Crime',
  'TV & Film',
];

export default function PodcastsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { data, loading, error } = usePodcastShows(
    selectedCategory === 'All' ? undefined : selectedCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading podcasts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Error loading podcasts: {error.message}</div>
      </div>
    );
  }

  const shows = data?.podcast_shows || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">Podcasts</h1>

          <div className="flex gap-3">
            <Link
              href="/podcasts/subscriptions"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              My Subscriptions
            </Link>
            <Link
              href="/podcasts/add"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Podcast
            </Link>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-4">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Show grid */}
      {shows.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>No podcasts found in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {shows.map((show: any) => (
            <Link
              key={show.id}
              href={`/podcasts/${show.id}`}
              className="group"
            >
              <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors">
                {show.artwork_url && (
                  <img
                    src={show.artwork_url}
                    alt={show.title}
                    className="w-full aspect-square object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {show.title}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-1">{show.author}</p>
                  {show.explicit && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded">
                      Explicit
                    </span>
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
