'use client';

import { useState, useEffect, useCallback } from 'react';
import * as DevicesClient from '@/lib/plugins/devices-client';

const DEVICES_BASE_URL = process.env.NEXT_PUBLIC_DEVICES_URL || 'http://localhost:3603';

export interface UseDevicesResult {
  devices: DevicesClient.Device[];
  sessions: DevicesClient.IngestSession[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  enrollDevice: (name: string, type: string) => Promise<string>;
  revokeDevice: (deviceId: string) => Promise<void>;
}

export function useDevices(refreshInterval = 30000): UseDevicesResult {
  const [devices, setDevices] = useState<DevicesClient.Device[]>([]);
  const [sessions, setSessions] = useState<DevicesClient.IngestSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [devicesData, sessionsData] = await Promise.all([
        DevicesClient.listDevices(DEVICES_BASE_URL),
        DevicesClient.listIngestSessions(DEVICES_BASE_URL),
      ]);
      setDevices(devicesData);
      setSessions(sessionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  const enrollDevice = useCallback(async (name: string, type: string) => {
    const result = await DevicesClient.enrollDevice(name, type, DEVICES_BASE_URL);
    await fetchData();
    return result.enrollmentToken;
  }, [fetchData]);

  const revokeDevice = useCallback(async (deviceId: string) => {
    await DevicesClient.revokeDevice(deviceId, DEVICES_BASE_URL);
    await fetchData();
  }, [fetchData]);

  return { devices, sessions, isLoading, error, refetch: fetchData, enrollDevice, revokeDevice };
}
