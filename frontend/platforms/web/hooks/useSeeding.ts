'use client';

import { useState, useEffect, useCallback } from 'react';
import * as TorrentClient from '@/lib/plugins/torrent-client';
import type { SeedingStats, SeedingAggregate } from '@/types/acquisition';

const TORRENT_BASE_URL = process.env.NEXT_PUBLIC_TORRENT_URL || 'http://localhost:3201';

export interface UseSeedingOptions {
  refreshInterval?: number;
}

export interface UseSeedingResult {
  stats: SeedingStats[];
  aggregate: SeedingAggregate | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updatePolicy: (hash: string, policy: { seedRatioLimit?: number; seedTimeLimitMinutes?: number; isFavorite?: boolean }) => Promise<void>;
}

export function useSeeding(options: UseSeedingOptions = {}): UseSeedingResult {
  const { refreshInterval = 30000 } = options;
  const [stats, setStats] = useState<SeedingStats[]>([]);
  const [aggregate, setAggregate] = useState<SeedingAggregate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, aggData] = await Promise.all([
        TorrentClient.getSeedingStats(TORRENT_BASE_URL),
        TorrentClient.getSeedingAggregate(TORRENT_BASE_URL),
      ]);
      setStats(statsData);
      setAggregate(aggData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seeding data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, fetchData]);

  const updatePolicy = useCallback(async (
    hash: string,
    policy: { seedRatioLimit?: number; seedTimeLimitMinutes?: number; isFavorite?: boolean },
  ) => {
    await TorrentClient.updateSeedingPolicy(hash, policy, TORRENT_BASE_URL);
    await fetchData();
  }, [fetchData]);

  return { stats, aggregate, isLoading, error, refetch: fetchData, updatePolicy };
}
