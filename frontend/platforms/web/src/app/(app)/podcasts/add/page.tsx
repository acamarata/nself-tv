/**
 * Add Podcast page — add by RSS feed URL or browse & subscribe
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchPodcasts, useSubscribe, useAddPodcastByFeed } from '@/hooks/usePodcasts';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'url' | 'browse';

export default function AddPodcastPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('url');

  // RSS Feed state
  const [feedUrl, setFeedUrl] = useState('');
  const [feedSuccess, setFeedSuccess] = useState<{ id: string; title: string } | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());

  // Mutations
  const [addByFeed, { loading: addingFeed }] = useAddPodcastByFeed();
  const [subscribe, { loading: subscribing }] = useSubscribe();

  // Search results
  const { data: searchData, loading: searching } = useSearchPodcasts(searchQuery);
  const searchResults = searchData?.podcast_shows || [];

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedError(null);
    setFeedSuccess(null);

    const trimmedUrl = feedUrl.trim();
    if (!trimmedUrl) return;

    try {
      const { data } = await addByFeed({
        variables: {
          family_id: user?.familyId,
          feed_url: trimmedUrl,
          title: 'Loading...',
        },
      });

      if (data?.insert_podcast_shows_one) {
        setFeedSuccess(data.insert_podcast_shows_one);
        setFeedUrl('');
      } else {
        setFeedError('This feed URL may already exist in your library.');
      }
    } catch (err: any) {
      setFeedError(err.message || 'Failed to add podcast feed.');
    }
  };

  const handleSubscribe = async (showId: string) => {
    try {
      await subscribe({ variables: { show_id: showId } });
      setSubscribedIds((prev) => new Set(prev).add(showId));
    } catch (err: any) {
      console.error('Subscribe error:', err.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Add Podcast</h1>
        <Link
          href="/podcasts"
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Podcasts
        </Link>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('url')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Add by URL
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'browse'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Browse &amp; Subscribe
        </button>
      </div>

      {/* Tab: Add by URL */}
      {activeTab === 'url' && (
        <div className="max-w-2xl">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Add RSS Feed</h2>
            <p className="text-gray-400 mb-6">
              Paste a podcast RSS feed URL to add it to your library. The feed will be
              fetched and episodes will appear automatically.
            </p>

            <form onSubmit={handleAddFeed} className="flex gap-3">
              <input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="Paste RSS feed URL..."
                className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                required
              />
              <button
                type="submit"
                disabled={addingFeed || !feedUrl.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {addingFeed ? 'Adding...' : 'Add Feed'}
              </button>
            </form>

            {/* Success message */}
            {feedSuccess && (
              <div className="mt-4 p-4 bg-green-900/50 border border-green-700 rounded-lg">
                <p className="text-green-400">
                  Podcast added successfully!{' '}
                  <Link
                    href={`/podcasts/${feedSuccess.id}`}
                    className="underline hover:text-green-300 transition-colors"
                  >
                    View podcast
                  </Link>
                </p>
              </div>
            )}

            {/* Error message */}
            {feedError && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-400">{feedError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Browse & Subscribe */}
      {activeTab === 'browse' && (
        <div>
          <div className="max-w-2xl mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Search Podcast Directory</h2>
              <p className="text-gray-400 mb-4">
                Find podcasts in the library and subscribe to get new episodes.
              </p>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search podcasts by name..."
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
              />
            </div>
          </div>

          {/* Search results */}
          {searching && (
            <div className="text-gray-400 py-8 text-center">Searching...</div>
          )}

          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <p>No podcasts found matching &ldquo;{searchQuery}&rdquo;</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((show: any) => (
                <div
                  key={show.id}
                  className="bg-gray-800 rounded-lg p-4 flex gap-4 items-start hover:bg-gray-700 transition-colors"
                >
                  {show.artwork_url ? (
                    <img
                      src={show.artwork_url}
                      alt={show.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-700 flex-shrink-0 flex items-center justify-center">
                      <span className="text-gray-500 text-2xl">&#9835;</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/podcasts/${show.id}`}
                      className="font-semibold text-white hover:text-blue-400 transition-colors line-clamp-1"
                    >
                      {show.title}
                    </Link>
                    {show.author && (
                      <p className="text-sm text-gray-400 mt-1">{show.author}</p>
                    )}
                    {show.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {show.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleSubscribe(show.id)}
                    disabled={subscribing || subscribedIds.has(show.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      subscribedIds.has(show.id)
                        ? 'bg-green-700 text-white cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {subscribedIds.has(show.id) ? 'Subscribed' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
