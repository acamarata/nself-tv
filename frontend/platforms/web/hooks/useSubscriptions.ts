'use client';

import { useState, useEffect, useCallback } from 'react';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import { useAuth } from './useAuth';
import type { TVSubscription, SubscribeRequest } from '@/types/acquisition';

const ACQUISITION_BASE_URL = process.env.NEXT_PUBLIC_ACQUISITION_URL || 'http://localhost:3202';

export interface UseSubscriptionsOptions {
  refreshInterval?: number;
}

export interface UseSubscriptionsResult {
  subscriptions: TVSubscription[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  add: (params: SubscribeRequest) => Promise<TVSubscription>;
  update: (id: string, params: Partial<SubscribeRequest>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useSubscriptions(options: UseSubscriptionsOptions = {}): UseSubscriptionsResult {
  const { refreshInterval = 60000 } = options;
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<TVSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const familyId = user?.familyId || user?.id || null;

  const fetchData = useCallback(async () => {
    if (!familyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await AcquisitionClient.listSubscriptions(familyId, ACQUISITION_BASE_URL);
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
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

  const add = useCallback(async (params: SubscribeRequest) => {
    if (!familyId) throw new Error('No family ID');
    const sub = await AcquisitionClient.createSubscription(familyId, params, ACQUISITION_BASE_URL);
    await fetchData();
    return sub;
  }, [familyId, fetchData]);

  const update = useCallback(async (id: string, params: Partial<SubscribeRequest>) => {
    await AcquisitionClient.updateSubscription(id, params, ACQUISITION_BASE_URL);
    await fetchData();
  }, [fetchData]);

  const remove = useCallback(async (id: string) => {
    await AcquisitionClient.deleteSubscription(id, ACQUISITION_BASE_URL);
    await fetchData();
  }, [fetchData]);

  return { subscriptions, isLoading, error, refetch: fetchData, add, update, remove };
}
