/**
 * Music browse page — albums and artists overview
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useAlbums, useArtists } from '@/hooks/useMusic';

export default function MusicPage() {
  const { data: albumsData, loading: albumsLoading, error: albumsError } = useAlbums();
  const { data: artistsData, loading: artistsLoading, error: artistsError } = useArtists();

  if (albumsLoading || artistsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading music...</div>
      </div>
    );
  }

  if (albumsError || artistsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">
          Error loading music: {albumsError?.message || artistsError?.message}
        </div>
      </div>
    );
  }

  const albums = albumsData?.music_albums || [];
  const artists = artistsData?.music_artists || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Music</h1>
        <Link
          href="/music/search"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Music
        </Link>
      </div>

      {/* Recent Albums */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Recent Albums</h2>

        {albums.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="mb-4">No albums in your library yet</p>
            <Link
              href="/music/search"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Music
            </Link>
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
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {album.artist?.name}
                    </p>
                    {album.year && (
                      <p className="text-xs text-gray-500 mt-1">{album.year}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Artists */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Artists</h2>

        {artists.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No artists in your library yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {artists.map((artist: any) => (
              <Link
                key={artist.id}
                href={`/music/artists/${artist.id}`}
                className="group text-center"
              >
                <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                  {artist.artwork_url ? (
                    <img
                      src={artist.artwork_url}
                      alt={artist.name}
                      className="w-full aspect-square rounded-full object-cover mb-3"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-full bg-gray-700 flex items-center justify-center mb-3">
                      <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <h3 className="font-semibold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                    {artist.name}
                  </h3>
                  {artist.genres && artist.genres.length > 0 && (
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {artist.genres.join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {artist.albums_aggregate?.aggregate?.count || 0} album
                    {(artist.albums_aggregate?.aggregate?.count || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
