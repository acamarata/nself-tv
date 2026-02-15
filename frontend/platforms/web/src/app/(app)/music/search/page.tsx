/**
 * Add Music search page — search and add artists/albums to library
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchMusic, useAddArtist, useAddAlbum } from '@/hooks/useMusic';
import { useAuth } from '@/hooks/useAuth';

export default function MusicSearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data, loading } = useSearchMusic(debouncedQuery);
  const [addArtist, { loading: addingArtist }] = useAddArtist();
  const [addAlbum, { loading: addingAlbum }] = useAddAlbum();

  const [addedArtists, setAddedArtists] = useState<Set<string>>(new Set());
  const [addedAlbums, setAddedAlbums] = useState<Set<string>>(new Set());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const artists = data?.music_artists || [];
  const albums = data?.music_albums || [];

  const handleAddArtist = async (artist: any) => {
    try {
      await addArtist({
        variables: {
          family_id: user?.familyId,
          name: artist.name,
          artwork_url: artist.artwork_url,
          genres: artist.genres,
        },
      });
      setAddedArtists((prev) => new Set(prev).add(artist.id));
    } catch (err) {
      console.error('Failed to add artist:', err);
    }
  };

  const handleAddAlbum = async (album: any) => {
    try {
      await addAlbum({
        variables: {
          family_id: user?.familyId,
          artist_id: album.artist?.id,
          title: album.title,
          year: album.year,
          cover_url: album.cover_url,
        },
      });
      setAddedAlbums((prev) => new Set(prev).add(album.id));
    } catch (err) {
      console.error('Failed to add album:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Add Music</h1>

      {/* Search input */}
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by artist name, album title, or genre..."
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
      ) : artists.length === 0 && albums.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>No results found for &quot;{query}&quot;</p>
        </div>
      ) : (
        <>
          {/* Artists results */}
          {artists.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                Artists ({artists.length})
              </h2>

              <div className="space-y-3">
                {artists.map((artist: any) => (
                  <div
                    key={artist.id}
                    className="flex items-center gap-4 bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                  >
                    {/* Artist artwork */}
                    {artist.artwork_url ? (
                      <img
                        src={artist.artwork_url}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    {/* Artist info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{artist.name}</h3>
                      {artist.genres && artist.genres.length > 0 && (
                        <p className="text-sm text-gray-400">
                          {artist.genres.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => handleAddArtist(artist)}
                      disabled={addingArtist || addedArtists.has(artist.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
                        addedArtists.has(artist.id)
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {addedArtists.has(artist.id) ? 'Added' : 'Add Artist'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums results */}
          {albums.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">
                Albums ({albums.length})
              </h2>

              <div className="space-y-3">
                {albums.map((album: any) => (
                  <div
                    key={album.id}
                    className="flex items-center gap-4 bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                  >
                    {/* Album cover */}
                    {album.cover_url ? (
                      <img
                        src={album.cover_url}
                        alt={album.title}
                        className="w-16 h-16 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      </div>
                    )}

                    {/* Album info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{album.title}</h3>
                      <p className="text-sm text-gray-400">
                        {album.artist?.name}
                        {album.year ? ` \u00B7 ${album.year}` : ''}
                      </p>
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => handleAddAlbum(album)}
                      disabled={addingAlbum || addedAlbums.has(album.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
                        addedAlbums.has(album.id)
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {addedAlbums.has(album.id) ? 'Added' : 'Add Album'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
