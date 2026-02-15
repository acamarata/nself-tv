/**
 * Movie detail page with hero backdrop, metadata, cast, and playback
 */

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMovieDetail, useDeleteMovie } from '@/hooks/useMovies';

function formatRuntime(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const { data, loading, error } = useMovieDetail(movieId);
  const [deleteMovie] = useDeleteMovie();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading movie...</div>
      </div>
    );
  }

  if (error || !data?.media_items_by_pk) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Movie not found</div>
      </div>
    );
  }

  const movie = data.media_items_by_pk;
  const variants = movie.variants || [];
  const subtitles = movie.subtitles || [];
  const credits = movie.credits || {};
  const cast = Array.isArray(credits.cast) ? credits.cast.slice(0, 6) : [];
  const director = Array.isArray(credits.crew)
    ? credits.crew.find((c: any) => c.job === 'Director')
    : null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMovie({ variables: { id: movieId } });
      router.push('/movies');
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div>
      {/* Hero section with backdrop */}
      <div className="relative w-full h-[500px]">
        {movie.backdrop_url ? (
          <img
            src={movie.backdrop_url}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
      </div>

      {/* Content overlapping hero */}
      <div className="container mx-auto px-4 -mt-64 relative z-10">
        <div className="flex gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-64 aspect-[2/3] object-cover rounded-lg shadow-2xl"
              />
            ) : (
              <div className="w-64 aspect-[2/3] bg-gray-700 rounded-lg shadow-2xl flex items-center justify-center">
                <span className="text-gray-500 text-6xl">&#127909;</span>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 pt-16">
            <h1 className="text-4xl font-bold text-white mb-2">{movie.title}</h1>

            {movie.tagline && (
              <p className="text-lg text-gray-400 italic mb-4">{movie.tagline}</p>
            )}

            {/* Status badge for non-ready content */}
            {movie.status && movie.status !== 'ready' && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${
                movie.status === 'pending' ? 'bg-yellow-900/30 border border-yellow-600 text-yellow-300' :
                movie.status === 'downloading' ? 'bg-blue-900/30 border border-blue-600 text-blue-300' :
                movie.status === 'processing' ? 'bg-purple-900/30 border border-purple-600 text-purple-300' :
                movie.status === 'error' ? 'bg-red-900/30 border border-red-600 text-red-300' :
                'bg-gray-800 text-gray-300'
              }`}>
                {(movie.status === 'downloading' || movie.status === 'processing') && (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {movie.status === 'pending' ? 'Waiting to Download' :
                 movie.status === 'downloading' ? 'Downloading...' :
                 movie.status === 'processing' ? 'Processing...' :
                 movie.status === 'error' ? 'Download Failed' :
                 movie.status}
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-3 text-gray-400 mb-4 flex-wrap">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime_minutes && (
                <>
                  <span>·</span>
                  <span>{formatRuntime(movie.runtime_minutes)}</span>
                </>
              )}
              {movie.content_rating && (
                <>
                  <span>·</span>
                  <span className="px-2 py-0.5 border border-gray-500 rounded text-sm">
                    {movie.content_rating}
                  </span>
                </>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {movie.genres.map((genre: string) => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Community rating */}
            {movie.community_rating != null && (
              <div className="flex items-center gap-2 mb-6">
                <span className="text-yellow-400 text-xl">&#9733;</span>
                <span className="text-white text-xl font-semibold">
                  {movie.community_rating.toFixed(1)}
                </span>
                <span className="text-gray-400">/ 10</span>
                {movie.vote_count != null && (
                  <span className="text-gray-500 text-sm ml-2">
                    ({movie.vote_count.toLocaleString()} votes)
                  </span>
                )}
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="text-gray-300 mb-6 max-w-3xl leading-relaxed">
                {movie.overview}
              </p>
            )}

            {/* Play button */}
            <div className="flex gap-4 mb-8">
              {movie.status === 'ready' && movie.hls_master_url ? (
                <a
                  href={`/player?src=${encodeURIComponent(movie.hls_master_url)}&title=${encodeURIComponent(movie.title)}`}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <span>&#9654;</span> Play
                </a>
              ) : (
                <button
                  disabled
                  className="px-8 py-4 bg-gray-700 text-gray-500 rounded-lg font-semibold text-lg cursor-not-allowed"
                >
                  {movie.status === 'pending' ? 'Waiting to Download' :
                   movie.status === 'downloading' ? 'Downloading...' :
                   movie.status === 'processing' ? 'Processing...' :
                   'Not Available'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cast & Crew */}
        {(cast.length > 0 || director) && (
          <div className="mt-12 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Cast & Crew</h2>

            {director && (
              <p className="text-gray-400 mb-4">
                <span className="text-gray-500">Directed by</span>{' '}
                <span className="text-white">{director.name}</span>
              </p>
            )}

            {cast.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {cast.map((member: any, index: number) => (
                  <div
                    key={`${member.name}-${index}`}
                    className="bg-gray-800 rounded-lg p-4 text-center"
                  >
                    {member.profile_path ? (
                      <img
                        src={member.profile_path}
                        alt={member.name}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-700 mx-auto mb-3 flex items-center justify-center">
                        <span className="text-gray-500 text-2xl">&#128100;</span>
                      </div>
                    )}
                    <p className="text-white text-sm font-semibold line-clamp-1">
                      {member.name}
                    </p>
                    {member.character && (
                      <p className="text-gray-400 text-xs line-clamp-1">
                        {member.character}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quality Variants */}
        {variants.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Available Quality</h2>
            <div className="space-y-2">
              {variants.map((variant: any) => (
                <div
                  key={variant.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-white font-semibold">
                      {variant.rendition || variant.quality_tier}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {variant.width}x{variant.height}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {variant.video_codec && <span>{variant.video_codec}</span>}
                    {variant.audio_codec && <span>{variant.audio_codec}</span>}
                    {variant.bitrate_kbps && (
                      <span>{(variant.bitrate_kbps / 1000).toFixed(1)} Mbps</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subtitle Tracks */}
        {subtitles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Subtitles</h2>
            <div className="space-y-2">
              {subtitles.map((track: any) => (
                <div
                  key={track.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white">{track.label || track.language}</span>
                    {track.is_default && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                        Default
                      </span>
                    )}
                    {track.is_forced && (
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                        Forced
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm uppercase">{track.format}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete section */}
        <div className="border-t border-gray-800 pt-8 pb-12">
          {showDeleteConfirm ? (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-white mb-4">
                Are you sure you want to delete <strong>{movie.title}</strong>? This action
                cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-gray-800 text-red-400 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Delete Movie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
