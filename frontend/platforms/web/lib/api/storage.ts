import type { ServerConfig } from '@/types/config';

const STORAGE_KEY = 'ntv_server_config';
const SERVER_URL_KEY = 'ntv_server_url';

export function getStoredConfig(): ServerConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeConfig(config: ServerConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SERVER_URL_KEY);
}

export function getStoredServerUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SERVER_URL_KEY);
}

export function storeServerUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SERVER_URL_KEY, url);
}
