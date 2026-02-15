'use client';

import { useState, useEffect, useCallback } from 'react';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import { useAuth } from './useAuth';
import type { MovieMonitoring, MonitorMovieRequest, CalendarEntry } from '@/types/acquisition';

const ACQUISITION_BASE_URL = process.env.NEXT_PUBLIC_ACQUISITION_URL || 'http://localhost:3202';

export interface UseMovieMonitoringOptions {
  refreshInterval?: number;
}

export interface UseMovieMonitoringResult {
  movies: MovieMonitoring[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  monitor: (params: MonitorMovieRequest) => Promise<MovieMonitoring>;
  unmonitor: (id: string) => Promise<void>;
  getCalendar: (month: string) => Promise<CalendarEntry[]>;
}

export function useMovieMonitoring(options: UseMovieMonitoringOptions = {}): UseMovieMonitoringResult {
  const { refreshInterval = 60000 } = options;
  const { user } = useAuth();
  const [movies, setMovies] = useState<MovieMonitoring[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const familyId = user?.familyId || user?.id || null;

  const fetchData = useCallback(async () => {
    if (!familyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await AcquisitionClient.listMonitoredMovies(familyId, ACQUISITION_BASE_URL);
      setMovies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitored movies');
    } finally {
      setIsLoading(false);
    }
  }, [familyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, fetchData]);

  const monitor = useCallback(async (params: MonitorMovieRequest) => {
    if (!familyId) throw new Error('No family ID');
    const movie = await AcquisitionClient.monitorMovie(familyId, params, ACQUISITION_BASE_URL);
    await fetchData();
    return movie;
  }, [familyId, fetchData]);

  const unmonitor = useCallback(async (id: string) => {
    await AcquisitionClient.unmonitorMovie(id, ACQUISITION_BASE_URL);
    await fetchData();
  }, [fetchData]);

  const getCalendar = useCallback(async (month: string) => {
    if (!familyId) return [];
    return AcquisitionClient.getCalendar(familyId, month, ACQUISITION_BASE_URL);
  }, [familyId]);

  return { movies, isLoading, error, refetch: fetchData, monitor, unmonitor, getCalendar };
}
