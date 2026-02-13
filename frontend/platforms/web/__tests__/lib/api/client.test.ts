import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeUrl, testConnection, fetchServerConfig, getDefaultConfig } from '@/lib/api/client';

describe('normalizeUrl', () => {
  it('adds http:// prefix when missing', () => {
    expect(normalizeUrl('192.168.1.100')).toBe('http://192.168.1.100');
  });

  it('adds http:// for domain without protocol', () => {
    expect(normalizeUrl('example.com')).toBe('http://example.com');
  });

  it('preserves existing http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('preserves existing https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('removes trailing slashes', () => {
    expect(normalizeUrl('http://example.com/')).toBe('http://example.com');
    expect(normalizeUrl('http://example.com///')).toBe('http://example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeUrl('  http://example.com  ')).toBe('http://example.com');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });

  it('handles case-insensitive protocol check', () => {
    expect(normalizeUrl('HTTP://example.com')).toBe('HTTP://example.com');
    expect(normalizeUrl('HTTPS://example.com')).toBe('HTTPS://example.com');
  });
});

describe('testConnection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when health endpoint responds OK', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const result = await testConnection('http://localhost:8080');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns false when health endpoint fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await testConnection('http://localhost:8080');
    expect(result).toBe(false);
  });

  it('returns false when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await testConnection('http://localhost:8080');
    expect(result).toBe(false);
  });

  it('normalizes URL before fetching', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    await testConnection('192.168.1.100');
    expect(fetch).toHaveBeenCalledWith(
      'http://192.168.1.100/api/v1/health',
      expect.any(Object),
    );
  });
});

describe('fetchServerConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches config from correct URL', async () => {
    const mockConfig = {
      name: 'test',
      version: '1.0',
      branding: { appName: 'test' },
      features: { vod: true },
      endpoints: { graphql: 'http://localhost' },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    });
    const config = await fetchServerConfig('http://localhost:8080');
    expect(config).toEqual(mockConfig);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/config',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('throws on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    await expect(fetchServerConfig('http://localhost')).rejects.toThrow(
      'Failed to fetch config: 404 Not Found',
    );
  });
});

describe('getDefaultConfig', () => {
  it('returns valid default config', () => {
    const config = getDefaultConfig();
    expect(config.name).toBeTruthy();
    expect(config.version).toBeTruthy();
    expect(config.branding).toBeDefined();
    expect(config.branding.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(config.features).toBeDefined();
    expect(config.features.vod).toBe(true);
    expect(config.endpoints).toBeDefined();
    expect(config.endpoints.graphql).toBeTruthy();
  });
});
