'use client';

import { useState, useEffect, useCallback } from 'react';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import { useAuth } from './useAuth';
import type { DownloadRule, CreateRuleRequest } from '@/types/acquisition';

const ACQUISITION_BASE_URL = process.env.NEXT_PUBLIC_ACQUISITION_URL || 'http://localhost:3202';

export interface UseAcquisitionRulesResult {
  rules: DownloadRule[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (params: CreateRuleRequest) => Promise<DownloadRule>;
  update: (id: string, params: Partial<CreateRuleRequest>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  test: (id: string, sample: Record<string, unknown>) => Promise<{ matches: boolean; action: string }>;
}

export function useAcquisitionRules(): UseAcquisitionRulesResult {
  const { user } = useAuth();
  const [rules, setRules] = useState<DownloadRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const familyId = user?.familyId || user?.id || null;

  const fetchData = useCallback(async () => {
    if (!familyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await AcquisitionClient.listRules(familyId, ACQUISITION_BASE_URL);
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rules');
    } finally {
      setIsLoading(false);
    }
  }, [familyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const create = useCallback(async (params: CreateRuleRequest) => {
    if (!familyId) throw new Error('No family ID');
    const rule = await AcquisitionClient.createRule(familyId, params, ACQUISITION_BASE_URL);
    await fetchData();
    return rule;
  }, [familyId, fetchData]);

  const update = useCallback(async (id: string, params: Partial<CreateRuleRequest>) => {
    await AcquisitionClient.updateRule(id, params, ACQUISITION_BASE_URL);
    await fetchData();
  }, [fetchData]);

  const remove = useCallback(async (id: string) => {
    await AcquisitionClient.deleteRule(id, ACQUISITION_BASE_URL);
    await fetchData();
  }, [fetchData]);

  const test = useCallback(async (id: string, sample: Record<string, unknown>) => {
    return AcquisitionClient.testRule(id, sample, ACQUISITION_BASE_URL);
  }, []);

  return { rules, isLoading, error, refetch: fetchData, create, update, remove, test };
}
