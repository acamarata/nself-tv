/**
 * Podcast show detail page
 */

'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useShowDetail, useSubscribe, useUnsubscribe, useUserSubscriptions } from '@/hooks/usePodcasts';
import { usePodcastPlayer, Episode } from '../../../../stores/podcast-player';
import { formatTime, formatRelativeTime } from '../../../../utils/format';

export default function ShowDetailPage() {
  const params = useParams();
  const showId = params.id as string;

  const { data, loading, error } = useShowDetail(showId);
  const { data: subscriptionsData } = useUserSubscriptions();
  const [subscribe] = useSubscribe();
  const [unsubscribe] = useUnsubscribe();
  const { play, addToQueue } = usePodcastPlayer();

  const [copying, setCopying] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading show...</div>
      </div>
    );
  }

  if (error || !data?.podcast_shows_by_pk) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Show not found</div>
      </div>
    );
  }

  const show = data.podcast_shows_by_pk;
  const episodes = show.podcast_episodes || [];

  const isSubscribed = subscriptionsData?.podcast_subscriptions?.some(
    (sub: any) => sub.show_id === showId
  );

  const handleSubscribe = async () => {
    if (isSubscribed) {
      await unsubscribe({ variables: { show_id: showId } });
    } else {
      await subscribe({ variables: { show_id: showId } });
    }
  };

  const handleCopyRSS = async () => {
    if (show.feed_url) {
      await navigator.clipboard.writeText(show.feed_url);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  const handlePlayEpisode = (episode: any) => {
    const ep: Episode = {
      id: episode.id,
      show_id: showId,
      guid: episode.guid,
      title: episode.title,
      description: episode.description,
      pub_date: episode.pub_date,
      duration: episode.duration,
      enclosure_url: episode.enclosure_url,
      enclosure_type: episode.enclosure_type,
      artwork_url: episode.artwork_url || show.artwork_url,
      show_title: show.title,
      show_author: show.author,
      chapters: episode.chapters,
    };
    play(ep);
  };

  const handleAddToQueue = (episode: any) => {
    const ep: Episode = {
      id: episode.id,
      show_id: showId,
      guid: episode.guid,
      title: episode.title,
      description: episode.description,
      pub_date: episode.pub_date,
      duration: episode.duration,
      enclosure_url: episode.enclosure_url,
      enclosure_type: episode.enclosure_type,
      artwork_url: episode.artwork_url || show.artwork_url,
      show_title: show.title,
      show_author: show.author,
      chapters: episode.chapters,
    };
    addToQueue(ep);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero section */}
      <div className="flex gap-8 mb-12">
        {/* Artwork */}
        {show.artwork_url && (
          <img
            src={show.artwork_url}
            alt={show.title}
            className="w-64 h-64 rounded-lg shadow-2xl flex-shrink-0"
          />
        )}

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-2">{show.title}</h1>
          <p className="text-xl text-gray-400 mb-4">{show.author}</p>

          {show.description && (
            <p className="text-gray-300 mb-6">{show.description}</p>
          )}

          <div className="flex gap-4 mb-4">
            <button
              onClick={handleSubscribe}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isSubscribed
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            </button>

            <button
              onClick={handleCopyRSS}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {copying ? 'Copied!' : 'Copy RSS URL'}
            </button>
          </div>

          <div className="flex gap-4 text-sm text-gray-400">
            {show.language && <span>Language: {show.language}</span>}
            {show.explicit && (
              <span className="px-2 py-0.5 bg-red-600 text-white rounded">Explicit</span>
            )}
          </div>
        </div>
      </div>

      {/* Episodes list */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          Episodes ({episodes.length})
        </h2>

        {episodes.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No episodes available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {episodes.map((episode: any) => (
              <div
                key={episode.id}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Episode artwork */}
                  {(episode.artwork_url || show.artwork_url) && (
                    <img
                      src={episode.artwork_url || show.artwork_url}
                      alt={episode.title}
                      className="w-24 h-24 rounded object-cover flex-shrink-0"
                    />
                  )}

                  {/* Episode info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {episode.title}
                    </h3>

                    <div className="flex gap-4 text-sm text-gray-400 mb-2">
                      <span>{formatRelativeTime(episode.pub_date)}</span>
                      <span>{formatTime(episode.duration)}</span>
                      {episode.season && episode.episode && (
                        <span>S{episode.season}E{episode.episode}</span>
                      )}
                    </div>

                    {episode.description && (
                      <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                        {episode.description}
                      </p>
                    )}

                    {/* Episode actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePlayEpisode(episode)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Play
                      </button>
                      <button
                        onClick={() => handleAddToQueue(episode)}
                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        Add to Queue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
