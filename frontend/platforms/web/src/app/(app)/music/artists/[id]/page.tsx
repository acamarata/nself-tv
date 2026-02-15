/**
 * Artist detail page — artwork, biography, and discography
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useArtistDetail,
  useSubscribeToArtist,
  useUnsubscribeFromArtist,
  useMusicSubscriptions,
} from '@/hooks/useMusic';

export default function ArtistDetailPage() {
  const params = useParams();
  const artistId = params.id as string;

  const { data, loading, error } = useArtistDetail(artistId);
  const { data: subscriptionsData } = useMusicSubscriptions();
  const [subscribeToArtist] = useSubscribeToArtist();
  const [unsubscribeFromArtist] = useUnsubscribeFromArtist();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading artist...</div>
      </div>
    );
  }

  if (error || !data?.music_artists_by_pk) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Artist not found</div>
      </div>
    );
  }

  const artist = data.music_artists_by_pk;
  const albums = artist.albums || [];

  const isSubscribed = subscriptionsData?.music_subscriptions?.some(
    (sub: any) => sub.artist?.id === artistId
  );

  const handleFollowToggle = async () => {
    if (isSubscribed) {
      await unsubscribeFromArtist({ variables: { artist_id: artistId } });
    } else {
      await subscribeToArtist({ variables: { artist_id: artistId } });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero section */}
      <div className="flex gap-8 mb-12">
        {/* Artist artwork */}
        {artist.artwork_url ? (
          <img
            src={artist.artwork_url}
            alt={artist.name}
            className="w-64 h-64 rounded-full shadow-2xl flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-64 h-64 rounded-full shadow-2xl flex-shrink-0 bg-gray-800 flex items-center justify-center">
            <svg className="w-24 h-24 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Artist info */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-3">{artist.name}</h1>

          {/* Genre badges */}
          {artist.genres && artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {artist.genres.map((genre: string) => (
                <span
                  key={genre}
                  className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {artist.biography && (
            <p className="text-gray-300 mb-6 max-w-2xl">{artist.biography}</p>
          )}

          <button
            onClick={handleFollowToggle}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              isSubscribed
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubscribed ? 'Following' : 'Follow Artist'}
          </button>
        </div>
      </div>

      {/* Discography */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">
          Discography ({albums.length})
        </h2>

        {albums.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No albums available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {albums.map((album: any) => (
              <Link
                key={album.id}
                href={`/music/albums/${album.id}`}
                className="group"
              >
                <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors">
                  {album.cover_url ? (
                    <img
                      src={album.cover_url}
                      alt={album.title}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-700 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                      {album.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {album.year && <span>{album.year}</span>}
                      {album.album_type && (
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full uppercase">
                          {album.album_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
