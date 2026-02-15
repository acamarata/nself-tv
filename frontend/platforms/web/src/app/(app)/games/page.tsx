/**
 * Games library browse page
 */

'use client';

import React, { useState } from 'react';
import { useGameSystems, useROMsBySystem, useRecentSessions } from '@/hooks/useGames';
import { formatRelativeTime, formatTime } from '@/utils/format';
import Link from 'next/link';

export default function GamesPage() {
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');

  const { data: systemsData, loading: systemsLoading } = useGameSystems();
  const { data: romsData, loading: romsLoading } = useROMsBySystem(selectedSystemId);
  const { data: sessionsData, loading: sessionsLoading } = useRecentSessions(6);

  const systems = systemsData?.game_systems || [];
  const roms = romsData?.game_roms || [];
  const recentSessions = sessionsData?.game_play_sessions || [];

  // Group systems by tier
  const tier1Systems = systems.filter((s: any) => s.tier === 1);
  const tier2Systems = systems.filter((s: any) => s.tier === 2);
  const tier3Systems = systems.filter((s: any) => s.tier === 3);

  if (systemsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading game systems...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Add Game button */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Retro Games</h1>
        <Link
          href="/games/search"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Add Game
        </Link>
      </div>

      {/* Recently Played */}
      {!sessionsLoading && recentSessions.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Recently Played</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentSessions.map((session: any) => (
              <Link
                key={session.id}
                href={`/games/${session.game_rom?.id}`}
                className="group"
              >
                <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors">
                  {session.game_rom?.cover_url ? (
                    <img
                      src={session.game_rom.cover_url}
                      alt={session.game_rom.title}
                      className="w-full aspect-[3/4] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-gray-700 flex items-center justify-center">
                      <div className="text-3xl text-gray-500">&#x1F3AE;</div>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                      {session.game_rom?.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{session.game_rom?.game_system?.name?.toUpperCase()}</span>
                      <span>{formatRelativeTime(session.started_at)}</span>
                    </div>
                    {session.duration_seconds != null && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(session.duration_seconds)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* System selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Select a System</h2>

        {/* Tier 1: Guaranteed */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Tier 1 - Works on All Devices
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tier1Systems.map((system: any) => (
              <button
                key={system.id}
                onClick={() => setSelectedSystemId(system.id)}
                className={`p-4 rounded-lg text-center transition-colors ${
                  selectedSystemId === system.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="font-semibold">{system.name.toUpperCase()}</div>
                <div className="text-xs mt-1">{system.manufacturer}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tier 2: Device-dependent */}
        {tier2Systems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Tier 2 - Requires Capable Device
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tier2Systems.map((system: any) => (
                <button
                  key={system.id}
                  onClick={() => setSelectedSystemId(system.id)}
                  className={`p-4 rounded-lg text-center transition-colors ${
                    selectedSystemId === system.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-semibold">{system.name.toUpperCase()}</div>
                  <div className="text-xs mt-1">{system.manufacturer}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tier 3: Mini-PC/STB only */}
        {tier3Systems.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Tier 3 - Requires Mini-PC or Set-Top Box
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tier3Systems.map((system: any) => (
                <button
                  key={system.id}
                  onClick={() => setSelectedSystemId(system.id)}
                  className={`p-4 rounded-lg text-center transition-colors ${
                    selectedSystemId === system.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-semibold">{system.name.toUpperCase()}</div>
                  <div className="text-xs mt-1">{system.manufacturer}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ROM library */}
      {selectedSystemId && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            {systems.find((s: any) => s.id === selectedSystemId)?.full_name} Games
          </h2>

          {romsLoading ? (
            <div className="text-center text-gray-400 py-12">
              <p>Loading games...</p>
            </div>
          ) : roms.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>No games in library</p>
              <p className="text-sm mt-2">Add ROMs to start playing</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {roms.map((rom: any) => (
                <Link
                  key={rom.id}
                  href={`/games/${rom.id}`}
                  className="group"
                >
                  <div className={`bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors relative ${
                    rom.download_status && rom.download_status !== 'ready' ? 'opacity-75' : ''
                  }`}>
                    {rom.cover_url ? (
                      <img
                        src={rom.cover_url}
                        alt={rom.title}
                        className="w-full aspect-[3/4] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gray-700 flex items-center justify-center">
                        <div className="text-4xl text-gray-500">&#x1F3AE;</div>
                      </div>
                    )}
                    {rom.download_status && rom.download_status !== 'ready' && (
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          rom.download_status === 'pending' ? 'bg-yellow-600 text-white' :
                          rom.download_status === 'downloading' ? 'bg-blue-600 text-white' :
                          rom.download_status === 'error' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {rom.download_status === 'pending' ? 'Pending' :
                           rom.download_status === 'downloading' ? 'Downloading' :
                           rom.download_status === 'error' ? 'Error' :
                           rom.download_status}
                        </span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {rom.title}
                      </h3>
                      {rom.year && (
                        <p className="text-sm text-gray-400">{rom.year}</p>
                      )}
                      {rom.pinned && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-600 text-white text-xs rounded">
                          Pinned
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
