/**
 * Game catalog search page — "Add Game" flow
 * 1. Select a console/system from horizontal pill selector
 * 2. Shows popular games for that system by default
 * 3. Type a search query to filter
 * 4. Click a game to see confirmation panel with full details
 * 5. "Add to Library" calls useAddGameFromCatalog mutation
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  useGameSystems,
  useSearchGameCatalog,
  usePopularGames,
  useAddGameFromCatalog,
} from '@/hooks/useGames';

function StarRating({ score }: { score: number }) {
  const stars = Math.round((score / 100) * 5);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= stars ? 'text-yellow-400' : 'text-gray-600'}
        >
          ★
        </span>
      ))}
      <span className="text-sm text-gray-400 ml-1">{score}%</span>
    </div>
  );
}

export default function GameSearchPage() {
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const { data: systemsData, loading: systemsLoading } = useGameSystems();
  const { data: searchData, loading: searchLoading } = useSearchGameCatalog(
    debouncedQuery,
    selectedSystemId || undefined
  );
  const { data: popularData, loading: popularLoading } = usePopularGames(selectedSystemId);
  const [addGameFromCatalog, { loading: addLoading }] = useAddGameFromCatalog();

  const systems = systemsData?.game_systems || [];

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-select first system when loaded
  useEffect(() => {
    if (systems.length > 0 && !selectedSystemId) {
      setSelectedSystemId(systems[0].id);
    }
  }, [systems, selectedSystemId]);

  // Determine which games to show: search results or popular
  const isSearching = debouncedQuery.length >= 2;
  const games = isSearching
    ? searchData?.game_catalog || []
    : popularData?.game_catalog || [];
  const gamesLoading = isSearching ? searchLoading : popularLoading;

  const handleAddGame = async (game: any) => {
    try {
      const result = await addGameFromCatalog({
        variables: {
          family_id: '00000000-0000-0000-0000-000000000001', // demo family
          system_id: game.game_system?.id || selectedSystemId,
          catalog_id: game.id,
          title: game.title,
          cover_url: game.cover_url || null,
          year: game.year || null,
          genre: game.genre || null,
          publisher: game.publisher || null,
          developer: game.developer || null,
          region: game.region || null,
          players: game.players || null,
          description: game.description || null,
          popularity_score: game.popularity_score || null,
          screenshot_urls: game.screenshot_urls || null,
          content_rating: game.content_rating || null,
          file_path: `roms/${game.game_system?.name || 'unknown'}/${game.slug || game.title}.rom`,
          file_size: game.rom_file_size || 0,
          min_tier: game.game_system?.tier || 1,
        },
      });

      const newRomId = result.data?.insert_game_roms_one?.id;
      setAddSuccess(newRomId);
      setSelectedGame(null);
    } catch (err) {
      console.error('Failed to add game:', err);
    }
  };

  if (systemsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading game systems...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Add Game</h1>
        <Link
          href="/games"
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Library
        </Link>
      </div>

      {/* Success toast */}
      {addSuccess && (
        <div className="mb-6 bg-green-900/50 border border-green-600 rounded-lg p-4 flex items-center justify-between">
          <span className="text-green-300">
            Game added to your library successfully!
          </span>
          <div className="flex gap-3">
            <Link
              href={`/games/${addSuccess}`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View in Library
            </Link>
            <button
              onClick={() => setAddSuccess(null)}
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* System selector — horizontal pills */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Select System</h2>
        <div className="flex gap-2 overflow-x-auto pb-4">
          {systems.map((system: any) => (
            <button
              key={system.id}
              onClick={() => {
                setSelectedSystemId(system.id);
                setSelectedGame(null);
              }}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedSystemId === system.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {system.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Search input */}
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games by title, publisher, or developer..."
          className="w-full px-6 py-4 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          autoFocus
        />
        {!isSearching && selectedSystemId && (
          <p className="text-sm text-gray-400 mt-2">
            Showing popular games. Type to search.
          </p>
        )}
      </div>

      {/* Game results grid + detail panel */}
      <div className="flex gap-6">
        {/* Results grid */}
        <div className={`flex-1 ${selectedGame ? 'hidden lg:block' : ''}`}>
          {gamesLoading ? (
            <div className="text-center text-gray-400 py-12">
              <p>Loading games...</p>
            </div>
          ) : !selectedSystemId ? (
            <div className="text-center text-gray-400 py-12">
              <p>Select a system to browse games</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              {isSearching ? (
                <p>No games found for &quot;{debouncedQuery}&quot;</p>
              ) : (
                <p>No games in catalog for this system</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-gray-400 mb-4">
                {isSearching
                  ? `Found ${games.length} result${games.length !== 1 ? 's' : ''}`
                  : `${games.length} popular games`}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {games.map((game: any) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className="text-left group"
                  >
                    <div
                      className={`bg-gray-800 rounded-lg overflow-hidden transition-colors ${
                        selectedGame?.id === game.id
                          ? 'ring-2 ring-blue-600 bg-gray-700'
                          : 'hover:bg-gray-700'
                      }`}
                    >
                      {game.cover_url ? (
                        <img
                          src={game.cover_url}
                          alt={game.title}
                          className="w-full aspect-[3/4] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-gray-700 flex items-center justify-center">
                          <div className="text-4xl text-gray-500">&#x1F3AE;</div>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {game.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          {game.year && <span>{game.year}</span>}
                          {game.genre && (
                            <>
                              <span>&#183;</span>
                              <span className="line-clamp-1">{game.genre}</span>
                            </>
                          )}
                        </div>
                        {game.popularity_score != null && (
                          <div className="mt-2">
                            <StarRating score={game.popularity_score} />
                          </div>
                        )}
                        {game.players && (
                          <p className="text-xs text-gray-500 mt-1">
                            {game.players} player{game.players !== '1' ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Detail / confirmation panel */}
        {selectedGame && (
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-6 sticky top-8">
              {/* Back button on mobile */}
              <button
                onClick={() => setSelectedGame(null)}
                className="lg:hidden mb-4 text-gray-400 hover:text-white transition-colors"
              >
                &larr; Back to results
              </button>

              {/* Cover art */}
              {selectedGame.cover_url ? (
                <img
                  src={selectedGame.cover_url}
                  alt={selectedGame.title}
                  className="w-full aspect-[3/4] object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-6xl text-gray-500">&#x1F3AE;</div>
                </div>
              )}

              {/* Game info */}
              <h2 className="text-2xl font-bold text-white mb-2">
                {selectedGame.title}
              </h2>

              {selectedGame.popularity_score != null && (
                <div className="mb-3">
                  <StarRating score={selectedGame.popularity_score} />
                </div>
              )}

              <div className="space-y-2 text-sm mb-4">
                {selectedGame.year && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Year</span>
                    <span className="text-white">{selectedGame.year}</span>
                  </div>
                )}
                {selectedGame.genre && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Genre</span>
                    <span className="text-white">{selectedGame.genre}</span>
                  </div>
                )}
                {selectedGame.publisher && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Publisher</span>
                    <span className="text-white">{selectedGame.publisher}</span>
                  </div>
                )}
                {selectedGame.developer && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Developer</span>
                    <span className="text-white">{selectedGame.developer}</span>
                  </div>
                )}
                {selectedGame.players && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Players</span>
                    <span className="text-white">{selectedGame.players}</span>
                  </div>
                )}
                {selectedGame.content_rating && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rating</span>
                    <span className="text-white">{selectedGame.content_rating}</span>
                  </div>
                )}
                {selectedGame.game_system && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">System</span>
                    <span className="text-white">{selectedGame.game_system.full_name}</span>
                  </div>
                )}
              </div>

              {selectedGame.description && (
                <p className="text-sm text-gray-300 mb-6 line-clamp-4">
                  {selectedGame.description}
                </p>
              )}

              {/* Add to Library button */}
              <button
                onClick={() => handleAddGame(selectedGame)}
                disabled={addLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addLoading ? 'Adding...' : 'Add to Library'}
              </button>

              <button
                onClick={() => setSelectedGame(null)}
                className="w-full mt-3 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
