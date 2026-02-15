'use client';

import { useState, useEffect, useCallback } from 'react';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import { useAuth } from './useAuth';
import type { RSSFeed, FeedValidation } from '@/types/acquisition';

const ACQUISITION_BASE_URL = process.env.NEXT_PUBLIC_ACQUISITION_URL || 'http://localhost:3202';

export interface UseRSSFeedsOptions {
  refreshInterval?: number;
}

export interface UseRSSFeedsResult {
  feeds: RSSFeed[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  add: (url: string) => Promise<RSSFeed>;
  validate: (url: string) => Promise<FeedValidation>;
  remove: (id: string) => Promise<void>;
}

export function useRSSFeeds(options: UseRSSFeedsOptions = {}): UseRSSFeedsResult {
  const { refreshInterval = 60000 } = options;
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const familyId = user?.familyId || user?.id || null;

  const fetchData = useCallback(async () => {
    if (!familyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await AcquisitionClient.listFeeds(familyId, ACQUISITION_BASE_URL);
      setFeeds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch RSS feeds');
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

  const add = useCallback(async (url: string) => {
    if (!familyId) throw new Error('No family ID');
    const feed = await AcquisitionClient.addFeed(familyId, url, ACQUISITION_BASE_URL);
    await fetchData();
    return feed;
  }, [familyId, fetchData]);

  const validate = useCallback(async (url: string) => {
    return AcquisitionClient.validateFeed(url, ACQUISITION_BASE_URL);
  }, []);

  const remove = useCallback(async (id: string) => {
    await AcquisitionClient.deleteFeed(id, ACQUISITION_BASE_URL);
    await fetchData();
  }, [fetchData]);

  return { feeds, isLoading, error, refetch: fetchData, add, validate, remove };
}
