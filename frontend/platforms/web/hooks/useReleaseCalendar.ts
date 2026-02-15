'use client';

import { useState, useCallback } from 'react';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import { useAuth } from './useAuth';
import type { CalendarEntry } from '@/types/acquisition';

const ACQUISITION_BASE_URL = process.env.NEXT_PUBLIC_ACQUISITION_URL || 'http://localhost:3202';

export interface UseReleaseCalendarResult {
  entries: CalendarEntry[];
  isLoading: boolean;
  error: string | null;
  fetchMonth: (month: string) => Promise<void>;
}

export function useReleaseCalendar(): UseReleaseCalendarResult {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const familyId = user?.familyId || user?.id || null;

  const fetchMonth = useCallback(async (month: string) => {
    if (!familyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await AcquisitionClient.getCalendar(familyId, month, ACQUISITION_BASE_URL);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar');
    } finally {
      setIsLoading(false);
    }
  }, [familyId]);

  return { entries, isLoading, error, fetchMonth };
}
