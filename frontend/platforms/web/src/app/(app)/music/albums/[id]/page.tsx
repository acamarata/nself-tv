/**
 * Album detail page — cover art, metadata, and track listing
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAlbumDetail } from '@/hooks/useMusic';
import { useMusicPlayer, Track } from '../../../../../stores/music-player';
import { formatTime } from '../../../../../utils/format';

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;

  const { data, loading, error } = useAlbumDetail(albumId);
  const { play, addToQueue, clearQueue } = useMusicPlayer();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading album...</div>
      </div>
    );
  }

  if (error || !data?.music_albums_by_pk) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Album not found</div>
      </div>
    );
  }

  const album = data.music_albums_by_pk;
  const tracks = album.tracks || [];

  const buildTrack = (track: any): Track => ({
    id: track.id,
    title: track.title,
    artist: album.artist?.name || 'Unknown Artist',
    album: album.title,
    coverUrl: album.cover_url || '',
    filePath: track.file_path || '',
    duration: track.duration_seconds || 0,
  });

  const handlePlayTrack = (track: any) => {
    // Queue all remaining tracks from the clicked track onward
    const trackIndex = tracks.indexOf(track);
    const remainingTracks = tracks.slice(trackIndex + 1);

    clearQueue();
    remainingTracks.forEach((t: any) => addToQueue(buildTrack(t)));
    play(buildTrack(track));
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;

    clearQueue();
    tracks.slice(1).forEach((t: any) => addToQueue(buildTrack(t)));
    play(buildTrack(tracks[0]));
  };

  const totalDuration = album.duration_seconds || tracks.reduce(
    (sum: number, t: any) => sum + (t.duration_seconds || 0),
    0
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero section */}
      <div className="flex gap-8 mb-12">
        {/* Cover art */}
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt={album.title}
            className="w-64 h-64 rounded-lg shadow-2xl flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-64 h-64 rounded-lg shadow-2xl flex-shrink-0 bg-gray-800 flex items-center justify-center">
            <svg className="w-24 h-24 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}

        {/* Album info */}
        <div className="flex-1">
          {album.album_type && (
            <span className="inline-block px-3 py-1 bg-gray-800 text-gray-300 text-xs font-medium rounded-full uppercase mb-3">
              {album.album_type}
            </span>
          )}

          <h1 className="text-4xl font-bold text-white mb-2">{album.title}</h1>

          {album.artist && (
            <Link
              href={`/music/artists/${album.artist.id}`}
              className="text-xl text-gray-400 hover:text-blue-400 transition-colors"
            >
              {album.artist.name}
            </Link>
          )}

          <div className="flex gap-4 text-sm text-gray-400 mt-3 mb-6">
            {album.year && <span>{album.year}</span>}
            {album.genre && <span>{album.genre}</span>}
            <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
            {totalDuration > 0 && <span>{formatTime(totalDuration)}</span>}
          </div>

          <button
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Play All
          </button>
        </div>
      </div>

      {/* Track list */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          Tracks ({tracks.length})
        </h2>

        {tracks.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No tracks available</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track: any) => (
              <div
                key={track.id}
                className="flex items-center gap-4 px-4 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
              >
                {/* Track number */}
                <span className="w-8 text-center text-sm text-gray-500 group-hover:hidden">
                  {track.track_number || '-'}
                </span>

                {/* Play button (shown on hover) */}
                <button
                  onClick={() => handlePlayTrack(track)}
                  className="w-8 hidden group-hover:flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>

                {/* Track title */}
                <div className="flex-1 min-w-0">
                  <span className="text-white truncate block">{track.title}</span>
                  {track.explicit && (
                    <span className="inline-block px-1.5 py-0.5 bg-gray-600 text-gray-300 text-xs rounded mt-1">
                      E
                    </span>
                  )}
                </div>

                {/* Duration */}
                <span className="text-sm text-gray-400 tabular-nums">
                  {formatTime(track.duration_seconds || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
