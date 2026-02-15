/**
 * Podcast subscriptions management page
 */

'use client';

import React, { useState } from 'react';
import { useUserSubscriptions, useUnsubscribe, useUpdateSubscription } from '../../../../hooks/usePodcasts';
import Link from 'next/link';

export default function SubscriptionsPage() {
  const { data, loading, error } = useUserSubscriptions();
  const [unsubscribe] = useUnsubscribe();
  const [updateSubscription] = useUpdateSubscription();

  const [showOPMLExport, setShowOPMLExport] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading subscriptions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Error loading subscriptions: {error.message}</div>
      </div>
    );
  }

  const subscriptions = data?.podcast_subscriptions || [];

  const handleUnsubscribe = async (showId: string) => {
    if (confirm('Are you sure you want to unsubscribe?')) {
      await unsubscribe({ variables: { show_id: showId } });
    }
  };

  const handleToggleNotifications = async (showId: string, enabled: boolean) => {
    await updateSubscription({
      variables: { show_id: showId, notifications_enabled: !enabled },
    });
  };

  const handleToggleAutoDownload = async (showId: string, enabled: boolean) => {
    await updateSubscription({
      variables: { show_id: showId, auto_download: !enabled },
    });
  };

  const handleExportOPML = () => {
    // Generate OPML from subscriptions
    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>nself-tv Podcast Subscriptions</title>
  </head>
  <body>
${subscriptions.map((sub: any) => `    <outline text="${sub.podcast_show.title}" type="rss" xmlUrl="${sub.podcast_show.feed_url || ''}" />`).join('\n')}
  </body>
</opml>`;

    // Download as file
    const blob = new Blob([opml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscriptions.opml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">My Subscriptions</h1>

        <div className="flex gap-4">
          <button
            onClick={handleExportOPML}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export OPML
          </button>

          <Link
            href="/podcasts"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Podcasts
          </Link>
        </div>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="mb-4">You're not subscribed to any podcasts yet</p>
          <Link
            href="/podcasts"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Podcasts
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((subscription: any) => {
            const show = subscription.podcast_show;

            return (
              <div
                key={subscription.id}
                className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors"
              >
                <Link href={`/podcasts/${show.id}`}>
                  {show.artwork_url && (
                    <img
                      src={show.artwork_url}
                      alt={show.title}
                      className="w-full aspect-square object-cover"
                    />
                  )}
                </Link>

                <div className="p-4">
                  <Link href={`/podcasts/${show.id}`}>
                    <h3 className="font-semibold text-white mb-1 hover:text-blue-400 transition-colors">
                      {show.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-400 mb-4">{show.author}</p>

                  {/* Subscription settings */}
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={subscription.notifications_enabled}
                        onChange={() =>
                          handleToggleNotifications(
                            show.id,
                            subscription.notifications_enabled
                          )
                        }
                        className="rounded"
                      />
                      New episode notifications
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={subscription.auto_download}
                        onChange={() =>
                          handleToggleAutoDownload(show.id, subscription.auto_download)
                        }
                        className="rounded"
                      />
                      Auto-download new episodes
                    </label>
                  </div>

                  <button
                    onClick={() => handleUnsubscribe(show.id)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Unsubscribe
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
