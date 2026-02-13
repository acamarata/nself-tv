import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useServerConfig } from '@/hooks/useServerConfig';

vi.mock('@/lib/api/client', () => ({
  fetchServerConfig: vi.fn(),
  getDefaultConfig: vi.fn(() => ({
    name: 'nself-tv',
    version: '0.3.0',
    branding: { appName: 'nself-tv', primaryColor: '#6366f1', secondaryColor: '#8b5cf6', accentColor: '#f59e0b', logoUrl: null, faviconUrl: null },
    features: { vod: true, liveTV: false, sports: false, podcasts: false, games: false, dvr: false, downloads: false, watchParty: false },
    endpoints: { graphql: 'http://localhost:8080/v1/graphql', ws: 'ws://localhost:8080/v1/graphql', auth: 'http://localhost:4000', media: 'http://localhost:9000', search: 'http://localhost:7700' },
  })),
}));

vi.mock('@/lib/api/storage', () => ({
  getStoredConfig: vi.fn(() => null),
  storeConfig: vi.fn(),
  getStoredServerUrl: vi.fn(() => null),
  storeServerUrl: vi.fn(),
  clearConfig: vi.fn(),
}));

describe('useServerConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default config when nothing stored', async () => {
    const { result } = renderHook(() => useServerConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.config).toBeDefined();
    expect(result.current.config?.name).toBe('nself-tv');
    expect(result.current.needsSetup).toBe(false);
  });

  it('returns stored config if available', async () => {
    const { getStoredConfig } = await import('@/lib/api/storage');
    const mockConfig = { name: 'stored', version: '1.0', branding: {}, features: {}, endpoints: {} };
    (getStoredConfig as ReturnType<typeof vi.fn>).mockReturnValue(mockConfig);

    const { result } = renderHook(() => useServerConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.config?.name).toBe('stored');
  });

  it('connect fetches and stores config', async () => {
    const { fetchServerConfig } = await import('@/lib/api/client');
    const { storeConfig, storeServerUrl } = await import('@/lib/api/storage');
    const mockConfig = { name: 'remote', version: '1.0', branding: {}, features: {}, endpoints: {} };
    (fetchServerConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useServerConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.connect('http://localhost:8080');
    });

    expect(fetchServerConfig).toHaveBeenCalledWith('http://localhost:8080');
    expect(storeConfig).toHaveBeenCalledWith(mockConfig);
    expect(storeServerUrl).toHaveBeenCalledWith('http://localhost:8080');
    expect(result.current.config?.name).toBe('remote');
  });

  it('connect propagates error on failure', async () => {
    const { fetchServerConfig } = await import('@/lib/api/client');
    (fetchServerConfig as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useServerConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.connect('http://bad-server');
      } catch (e) {
        thrownError = e as Error;
      }
    });

    expect(thrownError).toBeDefined();
    expect(thrownError?.message).toBe('Connection failed');
    expect(fetchServerConfig).toHaveBeenCalledWith('http://bad-server');
  });
});
