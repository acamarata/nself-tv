/**
 * Game ROM detail page
 * Shows full game info, play button, screenshots, save states, play sessions,
 * pin/unpin and delete actions.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import Link from 'next/link';
import {
  useUserSaveStates,
  useRecentSessions,
  useTogglePinROM,
  useDeleteROM,
  useStartPlaySession,
  useEndPlaySession,
  useCreateSaveState,
} from '@/hooks/useGames';
import { EmulatorPlayer } from '@/components/games/EmulatorPlayer';
import { formatRelativeTime, formatTime } from '../../../../utils/format';

const GET_ROM_BY_ID = gql`
  query GetROMById($id: uuid!) {
    game_roms_by_pk(id: $id) {
      id
      title
      cover_url
      year
      genre
      publisher
      developer
      region
      players
      file_size
      pinned
      popularity_score
      download_status
      description
      screenshot_urls
      content_rating
      file_path
      game_system {
        id
        name
        full_name
        manufacturer
        tier
        core_name
      }
    }
  }
`;

function StarRating({ score }: { score: number }) {
  const stars = Math.round((score / 100) * 5);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= stars ? 'text-yellow-400 text-xl' : 'text-gray-600 text-xl'}
        >
          ★
        </span>
      ))}
      <span className="text-sm text-gray-400 ml-2">{score}%</span>
    </div>
  );
}

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const { data, loading, error } = useQuery(GET_ROM_BY_ID, {
    variables: { id: gameId },
    skip: !gameId,
  });

  const { data: saveStatesData, loading: savesLoading } = useUserSaveStates(gameId);
  const { data: sessionsData, loading: sessionsLoading } = useRecentSessions(5);
  const [togglePin] = useTogglePinROM();
  const [deleteROM] = useDeleteROM();
  const [startPlaySession] = useStartPlaySession();
  const [endPlaySession] = useEndPlaySession();
  const [createSaveState] = useCreateSaveState();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading game...</div>
      </div>
    );
  }

  if (error || !data?.game_roms_by_pk) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Game not found</div>
      </div>
    );
  }

  const game = data.game_roms_by_pk;
  const saveStates = saveStatesData?.game_save_states || [];
  const allSessions = sessionsData?.game_play_sessions || [];
  // Filter sessions for this specific game
  const gameSessions = allSessions.filter(
    (session: any) => session.game_rom?.id === gameId
  );
  const screenshots: string[] = game.screenshot_urls || [];

  const canPlay = game.download_status === 'ready' && game.file_path && game.game_system?.core_name;

  const handlePlay = async () => {
    if (!canPlay) return;
    try {
      const { data: sessionData } = await startPlaySession({
        variables: { rom_id: gameId },
      });
      setCurrentSessionId(sessionData?.insert_game_play_sessions_one?.id || null);
      setSessionStartTime(Date.now());
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to start play session:', err);
      setIsPlaying(true); // Still let them play even if session tracking fails
    }
  };

  const handleExitEmulator = async () => {
    setIsPlaying(false);
    if (currentSessionId && sessionStartTime) {
      const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
      try {
        await endPlaySession({
          variables: {
            session_id: currentSessionId,
            duration_seconds: durationSeconds,
            ended_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Failed to end play session:', err);
      }
    }
    setCurrentSessionId(null);
    setSessionStartTime(null);
  };

  const handleSaveState = async (slot: number, data: Blob) => {
    // In production this would upload to MinIO/storage, then record the path
    const savePath = `/saves/${gameId}/slot-${slot}.sav`;
    try {
      await createSaveState({
        variables: {
          rom_id: gameId,
          slot,
          data_path: savePath,
          hash: `slot-${slot}-${Date.now()}`,
        },
      });
    } catch (err) {
      console.error('Failed to save state:', err);
    }
  };

  const handleTogglePin = async () => {
    await togglePin({
      variables: { id: gameId, pinned: !game.pinned },
    });
  };

  const handleDelete = async () => {
    await deleteROM({
      variables: { id: gameId },
    });
    router.push('/games');
  };

  // Fullscreen emulator overlay
  if (isPlaying && canPlay) {
    return (
      <EmulatorPlayer
        romUrl={game.file_path}
        systemCore={game.game_system.core_name}
        onSaveState={handleSaveState}
        onExit={handleExitEmulator}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/games"
        className="inline-block mb-6 text-gray-400 hover:text-white transition-colors"
      >
        &larr; Back to Games
      </Link>

      {/* Hero section */}
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Cover art */}
        <div className="flex-shrink-0">
          {game.cover_url ? (
            <img
              src={game.cover_url}
              alt={game.title}
              className="w-64 h-auto rounded-lg shadow-2xl"
            />
          ) : (
            <div className="w-64 aspect-[3/4] bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-6xl text-gray-500">&#x1F3AE;</div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-2">{game.title}</h1>

          {game.game_system && (
            <p className="text-xl text-gray-400 mb-4">{game.game_system.full_name}</p>
          )}

          {game.popularity_score != null && (
            <div className="mb-4">
              <StarRating score={game.popularity_score} />
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
            {game.year && (
              <>
                <span className="text-gray-400">Year</span>
                <span className="text-white">{game.year}</span>
              </>
            )}
            {game.genre && (
              <>
                <span className="text-gray-400">Genre</span>
                <span className="text-white">{game.genre}</span>
              </>
            )}
            {game.publisher && (
              <>
                <span className="text-gray-400">Publisher</span>
                <span className="text-white">{game.publisher}</span>
              </>
            )}
            {game.developer && (
              <>
                <span className="text-gray-400">Developer</span>
                <span className="text-white">{game.developer}</span>
              </>
            )}
            {game.players && (
              <>
                <span className="text-gray-400">Players</span>
                <span className="text-white">{game.players}</span>
              </>
            )}
            {game.content_rating && (
              <>
                <span className="text-gray-400">Content Rating</span>
                <span className="text-white">{game.content_rating}</span>
              </>
            )}
            {game.region && (
              <>
                <span className="text-gray-400">Region</span>
                <span className="text-white">{game.region}</span>
              </>
            )}
          </div>

          {/* Download status badge */}
          {game.download_status && game.download_status !== 'ready' && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${
              game.download_status === 'pending' ? 'bg-yellow-900/30 border border-yellow-600 text-yellow-300' :
              game.download_status === 'downloading' ? 'bg-blue-900/30 border border-blue-600 text-blue-300' :
              game.download_status === 'error' ? 'bg-red-900/30 border border-red-600 text-red-300' :
              'bg-gray-800 text-gray-300'
            }`}>
              {game.download_status === 'downloading' && (
                <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              )}
              {game.download_status === 'pending' ? 'Waiting to Download' :
               game.download_status === 'downloading' ? 'Downloading...' :
               game.download_status === 'error' ? 'Download Failed' :
               game.download_status}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            {/* Play button */}
            {canPlay ? (
              <button
                onClick={handlePlay}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                Play
              </button>
            ) : (
              <button
                disabled
                className="px-8 py-3 bg-gray-700 text-gray-500 rounded-lg font-semibold text-lg cursor-not-allowed"
              >
                {game.download_status === 'pending' ? 'Waiting...' :
                 game.download_status === 'downloading' ? 'Downloading...' :
                 game.download_status === 'error' ? 'Download Failed' :
                 'Not Available'}
              </button>
            )}

            {/* Pin/Unpin */}
            <button
              onClick={handleTogglePin}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                game.pinned
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {game.pinned ? 'Unpin' : 'Pin'}
            </button>

            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-gray-800 text-red-400 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Delete
            </button>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
              <p className="text-red-300 mb-3">
                Are you sure you want to remove &quot;{game.title}&quot; from your library? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Description */}
      {game.description && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">About</h2>
          <p className="text-gray-300 leading-relaxed max-w-3xl">{game.description}</p>
        </div>
      )}

      {/* Screenshots gallery */}
      {screenshots.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Screenshots</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {screenshots.map((url: string, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedScreenshot(url)}
                className="rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-600 transition-all"
              >
                <img
                  src={url}
                  alt={`${game.title} screenshot ${index + 1}`}
                  className="w-full aspect-video object-cover"
                />
              </button>
            ))}
          </div>

          {/* Lightbox */}
          {selectedScreenshot && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setSelectedScreenshot(null)}
            >
              <img
                src={selectedScreenshot}
                alt="Screenshot"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 transition-colors"
              >
                &#10005;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save States */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Save States</h2>
        {savesLoading ? (
          <div className="text-gray-400">Loading save states...</div>
        ) : saveStates.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">No save states yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Save states will appear here when you play this game
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {saveStates.map((save: any) => (
              <div
                key={save.id}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">Slot {save.slot}</span>
                  <span className="text-sm text-gray-400">
                    {formatRelativeTime(save.created_at)}
                  </span>
                </div>
                {save.screenshot_path && (
                  <img
                    src={save.screenshot_path}
                    alt={`Save slot ${save.slot}`}
                    className="w-full aspect-video object-cover rounded mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Play Sessions */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Recent Play Sessions</h2>
        {sessionsLoading ? (
          <div className="text-gray-400">Loading sessions...</div>
        ) : gameSessions.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">No play sessions yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Your play history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {gameSessions.map((session: any) => (
              <div
                key={session.id}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">
                    {formatRelativeTime(session.started_at)}
                  </p>
                  {session.ended_at && (
                    <p className="text-sm text-gray-400">
                      Ended: {formatRelativeTime(session.ended_at)}
                    </p>
                  )}
                </div>
                {session.duration_seconds != null && (
                  <div className="text-right">
                    <p className="text-white font-medium">
                      {formatTime(session.duration_seconds)}
                    </p>
                    <p className="text-sm text-gray-400">Duration</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
