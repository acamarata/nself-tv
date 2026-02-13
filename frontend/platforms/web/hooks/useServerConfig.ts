'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ServerConfig } from '@/types/config';
import { fetchServerConfig, getDefaultConfig } from '@/lib/api/client';
import { getStoredConfig, storeConfig, getStoredServerUrl, storeServerUrl } from '@/lib/api/storage';

interface UseServerConfigReturn {
  config: ServerConfig | null;
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  connect: (url: string) => Promise<void>;
  refresh: () => Promise<void>;
  needsSetup: boolean;
}

export function useServerConfig(): UseServerConfigReturn {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredConfig();
    const url = getStoredServerUrl();
    if (stored) {
      setConfig(stored);
      setServerUrl(url);
    } else {
      // Use default config for local development
      setConfig(getDefaultConfig());
    }
    setIsLoading(false);
  }, []);

  const connect = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const cfg = await fetchServerConfig(url);
      setConfig(cfg);
      setServerUrl(url);
      storeConfig(cfg);
      storeServerUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!serverUrl) return;
    try {
      const cfg = await fetchServerConfig(serverUrl);
      setConfig(cfg);
      storeConfig(cfg);
    } catch {
      // Keep existing config on refresh failure
    }
  }, [serverUrl]);

  return {
    config,
    serverUrl,
    isLoading,
    error,
    connect,
    refresh,
    needsSetup: !isLoading && !config,
  };
}
