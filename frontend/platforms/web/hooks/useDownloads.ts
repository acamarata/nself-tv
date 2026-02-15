'use client';

import { useState, useEffect, useCallback } from 'react';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import { useAuth } from './useAuth';
import type { Download, CreateDownloadRequest, DownloadStateEntry } from '@/types/acquisition';

const ACQUISITION_BASE_URL = process.env.NEXT_PUBLIC_ACQUISITION_URL || 'http://localhost:3202';

export interface UseDownloadsOptions {
  refreshInterval?: number;
  historyPageSize?: number;
}

export interface UseDownloadsResult {
  active: Download[];
  history: Download[];
  historyTotal: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (params: CreateDownloadRequest) => Promise<Download>;
  cancel: (id: string) => Promise<void>;
  retry: (id: string) => Promise<void>;
  pause: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  loadHistoryPage: (page: number) => Promise<void>;
}

export function useDownloads(options: UseDownloadsOptions = {}): UseDownloadsResult {
  const { refreshInterval = 5000, historyPageSize = 20 } = options;
  const { user } = useAuth();
  const [active, setActive] = useState<Download[]>([]);
  const [history, setHistory] = useState<Download[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const familyId = user?.familyId || user?.id || null;

  const fetchActive = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await AcquisitionClient.listDownloads(familyId, undefined, ACQUISITION_BASE_URL);
      setActive(data.filter((d) => !['completed', 'failed', 'cancelled'].includes(d.state)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch downloads');
    }
  }, [familyId]);

  const fetchData = useCallback(async () => {
    if (!familyId) return;
    setIsLoading(true);
    setError(null);
    try {
      await fetchActive();
      const historyData = await AcquisitionClient.getDownloadHistory(
        familyId, 1, historyPageSize, ACQUISITION_BASE_URL,
      );
      setHistory(historyData.downloads);
      setHistoryTotal(historyData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch downloads');
    } finally {
      setIsLoading(false);
    }
  }, [familyId, fetchActive, historyPageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(fetchActive, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, fetchActive]);

  const create = useCallback(async (params: CreateDownloadRequest) => {
    if (!familyId) throw new Error('No family ID');
    const dl = await AcquisitionClient.createDownload(familyId, params, ACQUISITION_BASE_URL);
    await fetchActive();
    return dl;
  }, [familyId, fetchActive]);

  const cancel = useCallback(async (id: string) => {
    await AcquisitionClient.cancelDownload(id, ACQUISITION_BASE_URL);
    await fetchActive();
  }, [fetchActive]);

  const retry = useCallback(async (id: string) => {
    await AcquisitionClient.retryDownload(id, ACQUISITION_BASE_URL);
    await fetchActive();
  }, [fetchActive]);

  const pause = useCallback(async (id: string) => {
    await AcquisitionClient.pauseDownload(id, ACQUISITION_BASE_URL);
    await fetchActive();
  }, [fetchActive]);

  const resume = useCallback(async (id: string) => {
    await AcquisitionClient.resumeDownload(id, ACQUISITION_BASE_URL);
    await fetchActive();
  }, [fetchActive]);

  const loadHistoryPage = useCallback(async (page: number) => {
    if (!familyId) return;
    const data = await AcquisitionClient.getDownloadHistory(
      familyId, page, historyPageSize, ACQUISITION_BASE_URL,
    );
    setHistory(data.downloads);
    setHistoryTotal(data.total);
  }, [familyId, historyPageSize]);

  return {
    active, history, historyTotal, isLoading, error,
    refetch: fetchData, create, cancel, retry, pause, resume, loadHistoryPage,
  };
}
