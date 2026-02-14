'use client';

import { useState, useEffect, useCallback } from 'react';
import * as DevicesClient from '@/lib/plugins/devices-client';
import { useAuth } from './useAuth';

const DEVICES_BASE_URL = process.env.NEXT_PUBLIC_DEVICES_URL || 'http://localhost:3603';

export interface UseDevicesOptions {
  /** Family ID to fetch devices for. If not provided, uses authenticated user's family ID. */
  familyId?: string;
  /** Auto-refresh interval in milliseconds. Set to 0 to disable. Default: 30 seconds. */
  refreshInterval?: number;
}

export interface UseDevicesResult {
  devices: DevicesClient.Device[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  enrollDevice: (name: string, type: string) => Promise<string>;
  revokeDevice: (deviceId: string) => Promise<void>;
}

/**
 * Hook to manage device fleet for a family.
 * Requires authentication. Uses user's family ID by default.
 *
 * @param options - Configuration options
 * @returns Device fleet data and control functions
 */
export function useDevices(options: UseDevicesOptions = {}): UseDevicesResult {
  const { refreshInterval = 30000, familyId: providedFamilyId } = options;
  const { user } = useAuth();
  const [devices, setDevices] = useState<DevicesClient.Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use provided familyId or fall back to user's family (user.id for now, will be user.family_id when available)
  const familyId = providedFamilyId || (user?.id ?? null);

  const fetchData = useCallback(async () => {
    if (!familyId) {
      setError('No family ID available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const devicesData = await DevicesClient.listDevices(familyId, DEVICES_BASE_URL);
      setDevices(devicesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setIsLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  const enrollDevice = useCallback(async (name: string, type: string) => {
    if (!familyId) throw new Error('No family ID available');

    // Generate bootstrap token
    const { token } = await DevicesClient.createBootstrapToken(familyId, type, DEVICES_BASE_URL);

    await fetchData();
    return token;
  }, [familyId, fetchData]);

  const revokeDevice = useCallback(async (deviceId: string) => {
    await DevicesClient.revokeDevice(deviceId, DEVICES_BASE_URL);
    await fetchData();
  }, [fetchData]);

  return { devices, isLoading, error, refetch: fetchData, enrollDevice, revokeDevice };
}
