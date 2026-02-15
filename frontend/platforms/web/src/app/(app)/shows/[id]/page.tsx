/**
 * TV Show detail page with season/episode management
 */

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useShowDetail,
  useShowSeasons,
  useShowEpisodes,
  useDeleteShow,
} from '@/hooks/useShows';
import Link from 'next/link';

export default function ShowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params.id as string;

  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: showData, loading: showLoading, error: showError } = useShowDetail(showId);
  const { data: seasonsData, loading: seasonsLoading } = useShowSeasons(showId);
  const { data: episodesData, loading: episodesLoading } = useShowEpisodes(showId, selectedSeason);
  const [deleteShow, { loading: deleting }] = useDeleteShow();

  if (showLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading show...</div>
      </div>
    );
  }

  if (showError || !showData?.media_items_by_pk) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-400 mb-4">Show not found</div>
          <Link
            href="/shows"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Shows
          </Link>
        </div>
      </div>
    );
  }

  const show = showData.media_items_by_pk;
  const seasons = seasonsData?.media_items?.map((s: any) => s.season_number) || [];
  const totalEpisodes = seasonsData?.media_items_aggregate?.aggregate?.count || 0;
  const episodes = episodesData?.media_items || [];

  const handleDelete = async () => {
    try {
      await deleteShow({ variables: { id: showId } });
      router.push('/shows');
    } catch (err) {
      console.error('Failed to delete show:', err);
    }
  };

  const formatEpisodeCode = (season: number, episode: number) => {
    const s = String(season).padStart(2, '0');
    const e = String(episode).padStart(2, '0');
    return `S${s}E${e}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-600';
      case 'downloading':
        return 'bg-blue-600';
      case 'processing':
        return 'bg-purple-600';
      case 'pending':
        return 'bg-yellow-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const castMembers = Array.isArray(show.credits?.cast) ? show.credits.cast : [];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero section with backdrop */}
      <div className="relative">
        {show.backdrop_url ? (
          <div className="relative h-[400px] w-full">
            <img
              src={show.backdrop_url}
              alt={show.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
          </div>
        ) : (
          <div className="h-[400px] w-full bg-gray-800">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
          </div>
        )}

        {/* Show info overlay */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4 pb-8">
            <div className="flex gap-8">
              {/* Poster */}
              {show.poster_url ? (
                <img
                  src={show.poster_url}
                  alt={show.title}
                  className="w-48 h-72 rounded-lg shadow-2xl flex-shrink-0 object-cover -mt-24"
                />
              ) : (
                <div className="w-48 h-72 rounded-lg shadow-2xl flex-shrink-0 bg-gray-700 flex items-center justify-center -mt-24">
                  <span className="text-gray-500 text-4xl">TV</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 pt-4">
                <h1 className="text-4xl font-bold text-white mb-2">{show.title}</h1>

                <div className="flex items-center gap-4 text-gray-400 mb-4">
                  {show.year && <span>{show.year}</span>}
                  {show.content_rating && (
                    <span className="px-2 py-0.5 border border-gray-500 rounded text-sm">
                      {show.content_rating}
                    </span>
                  )}
                  {show.community_rating && (
                    <span className="text-yellow-400">
                      {Number(show.community_rating).toFixed(1)} / 10
                    </span>
                  )}
                  {totalEpisodes > 0 && (
                    <span>
                      {seasons.length} Season{seasons.length !== 1 ? 's' : ''} - {totalEpisodes} Episode{totalEpisodes !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {show.genres && show.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {show.genres.map((genre: string) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {show.tagline && (
                  <p className="text-gray-400 italic mb-2">{show.tagline}</p>
                )}

                {/* Show-level status badge */}
                {show.status && show.status !== 'ready' && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                    show.status === 'pending' ? 'bg-yellow-900/30 border border-yellow-600 text-yellow-300' :
                    show.status === 'downloading' ? 'bg-blue-900/30 border border-blue-600 text-blue-300' :
                    show.status === 'processing' ? 'bg-purple-900/30 border border-purple-600 text-purple-300' :
                    show.status === 'error' ? 'bg-red-900/30 border border-red-600 text-red-300' :
                    'bg-gray-800 text-gray-300'
                  }`}>
                    {(show.status === 'downloading' || show.status === 'processing') && (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    {show.status === 'pending' ? 'Episodes Pending' :
                     show.status === 'downloading' ? 'Downloading Episodes...' :
                     show.status === 'processing' ? 'Processing...' :
                     show.status === 'error' ? 'Error' :
                     show.status}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Overview */}
        {show.overview && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
            <p className="text-gray-300 leading-relaxed max-w-4xl">{show.overview}</p>
          </div>
        )}

        {/* Season selector and episodes */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6">Episodes</h2>

          {/* Season pills */}
          {seasons.length > 0 ? (
            <>
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                {seasons.map((season: number) => (
                  <button
                    key={season}
                    onClick={() => setSelectedSeason(season)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedSeason === season
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Season {season}
                  </button>
                ))}
              </div>

              {/* Episode list */}
              {episodesLoading ? (
                <div className="text-gray-400 py-8 text-center">Loading episodes...</div>
              ) : episodes.length === 0 ? (
                <div className="text-gray-400 py-8 text-center">
                  No episodes found for Season {selectedSeason}
                </div>
              ) : (
                <div className="space-y-4">
                  {episodes.map((episode: any) => (
                    <div
                      key={episode.id}
                      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex gap-4">
                        {/* Episode thumbnail */}
                        {episode.thumbnail_url || episode.poster_url ? (
                          <img
                            src={episode.thumbnail_url || episode.poster_url}
                            alt={episode.title}
                            className="w-40 h-24 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-40 h-24 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 text-sm">
                              {formatEpisodeCode(episode.season_number, episode.episode_number)}
                            </span>
                          </div>
                        )}

                        {/* Episode info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-blue-400 font-mono text-sm">
                              {formatEpisodeCode(episode.season_number, episode.episode_number)}
                            </span>
                            <h3 className="text-lg font-semibold text-white truncate">
                              {episode.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                            {episode.runtime_minutes && (
                              <span>{episode.runtime_minutes} min</span>
                            )}
                            {episode.community_rating && (
                              <span className="text-yellow-400">
                                {Number(episode.community_rating).toFixed(1)}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 text-white text-xs rounded ${getStatusColor(
                                episode.status
                              )}`}
                            >
                              {episode.status}
                            </span>
                          </div>

                          {episode.overview && (
                            <p className="text-sm text-gray-300 line-clamp-2">
                              {episode.overview}
                            </p>
                          )}
                        </div>

                        {/* Play button */}
                        <div className="flex items-center flex-shrink-0">
                          {episode.status === 'ready' && episode.hls_master_url ? (
                            <Link
                              href={`/watch/${episode.id}`}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Play
                            </Link>
                          ) : episode.status === 'pending' ? (
                            <span className="px-4 py-2 bg-gray-700 text-gray-500 rounded text-sm">
                              Pending
                            </span>
                          ) : episode.status === 'downloading' || episode.status === 'processing' ? (
                            <span className="px-4 py-2 bg-gray-700 text-gray-400 rounded text-sm inline-flex items-center gap-2">
                              <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              {episode.status === 'downloading' ? 'Downloading' : 'Processing'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : seasonsLoading ? (
            <div className="text-gray-400 py-8 text-center">Loading seasons...</div>
          ) : (
            <div className="text-gray-400 py-8 text-center">
              No episodes have been added yet.
            </div>
          )}
        </div>

        {/* Cast section */}
        {castMembers.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6">Cast</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {castMembers.slice(0, 12).map((member: any, index: number) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 text-center">
                  {member.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                      alt={member.name}
                      className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 text-2xl">
                        {member.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <p className="text-white text-sm font-medium line-clamp-1">{member.name}</p>
                  {member.character && (
                    <p className="text-gray-400 text-xs line-clamp-1">{member.character}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="border-t border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h2>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-gray-800 text-red-400 rounded-lg hover:bg-gray-700 transition-colors border border-red-400/30"
            >
              Delete Show
            </button>
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 max-w-md">
              <p className="text-white mb-4">
                Are you sure you want to delete <strong>{show.title}</strong>? This will also
                remove all episodes. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
