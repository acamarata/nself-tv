'use client';

import { useState, useEffect, useCallback } from 'react';
import * as EPGClient from '@/lib/plugins/epg-client';
import type { LiveChannel, Program as DVRProgram } from '@/types/dvr';

const EPG_BASE_URL = process.env.NEXT_PUBLIC_EPG_URL || 'http://localhost:3031';

/**
 * Convert EPG Channel to DVR LiveChannel format
 */
function mapChannel(epgChannel: EPGClient.Channel): LiveChannel {
  return {
    id: epgChannel.id,
    number: String(epgChannel.number),
    name: epgChannel.name,
    logoUrl: epgChannel.logoUrl,
    genre: epgChannel.group?.name || 'General',
    signalQuality: epgChannel.isActive ? 100 : 0,
    isFavorite: false, // TODO: Fetch from user preferences
  };
}

/**
 * Convert EPG Program to DVR Program format
 */
function mapProgram(epgProgram: EPGClient.Program): DVRProgram {
  return {
    id: epgProgram.id,
    channelId: epgProgram.channelId,
    title: epgProgram.title,
    description: epgProgram.description || '',
    startTime: epgProgram.startTime,
    endTime: epgProgram.endTime,
    genre: epgProgram.category || 'General',
    isNew: epgProgram.isNew,
    isLive: epgProgram.isLive,
    seasonNumber: epgProgram.seasonNumber ? parseInt(epgProgram.seasonNumber, 10) : undefined,
    episodeNumber: epgProgram.episodeNumber ? parseInt(epgProgram.episodeNumber, 10) : undefined,
  };
}

export interface UseEPGOptions {
  /**
   * Auto-refresh interval in milliseconds.
   * Set to 0 to disable auto-refresh.
   * Default: 5 minutes (300000ms)
   */
  refreshInterval?: number;

  /**
   * Number of days ahead to fetch program data.
   * Default: 3 days
   */
  daysAhead?: number;
}

export interface UseEPGResult {
  channels: LiveChannel[];
  programs: DVRProgram[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getChannelPrograms: (channelId: string) => DVRProgram[];
  getNowPlaying: (channelId: string) => DVRProgram | null;
  searchPrograms: (query: string) => Promise<DVRProgram[]>;
}

/**
 * Hook to manage EPG (Electronic Program Guide) data.
 *
 * Fetches channels and program schedules from the EPG plugin.
 * Supports auto-refresh and provides utilities for querying program data.
 *
 * @param options - Configuration options
 * @returns EPG data and control functions
 */
export function useEPG(options: UseEPGOptions = {}): UseEPGResult {
  const {
    refreshInterval = 300000, // 5 minutes
    daysAhead = 3,
  } = options;

  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [programs, setPrograms] = useState<DVRProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEPGData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch channels
      const channelsData = await EPGClient.getChannels(EPG_BASE_URL);
      const mappedChannels = channelsData.map(mapChannel);
      setChannels(mappedChannels);

      // Fetch schedules for all channels (current time + daysAhead)
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + daysAhead);

      const schedulePromises = channelsData.map((channel) =>
        EPGClient.getSchedule(channel.id, start, end, EPG_BASE_URL)
      );

      const schedules = await Promise.all(schedulePromises);
      const allPrograms = schedules.flat().map(mapProgram);
      setPrograms(allPrograms);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch EPG data';
      setError(message);
      console.error('EPG fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [daysAhead]);

  // Initial fetch
  useEffect(() => {
    fetchEPGData();
  }, [fetchEPGData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchEPGData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchEPGData]);

  const getChannelPrograms = useCallback(
    (channelId: string): Program[] => {
      return programs.filter((p) => p.channelId === channelId);
    },
    [programs]
  );

  const getNowPlaying = useCallback(
    (channelId: string): Program | null => {
      const now = Date.now();
      return (
        programs.find(
          (p) =>
            p.channelId === channelId &&
            new Date(p.startTime).getTime() <= now &&
            new Date(p.endTime).getTime() > now
        ) || null
      );
    },
    [programs]
  );

  const searchPrograms = useCallback(
    async (query: string): Promise<DVRProgram[]> => {
      if (!query.trim()) return [];
      try {
        const results = await EPGClient.searchPrograms(query, EPG_BASE_URL);
        return results.map(mapProgram);
      } catch (err) {
        console.error('Program search error:', err);
        return [];
      }
    },
    []
  );

  return {
    channels,
    programs,
    isLoading,
    error,
    refetch: fetchEPGData,
    getChannelPrograms,
    getNowPlaying,
    searchPrograms,
  };
}
