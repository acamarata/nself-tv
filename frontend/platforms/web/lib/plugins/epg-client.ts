/**
 * Electronic Program Guide (EPG) plugin client.
 * Communicates with the nSelf EPG plugin (port 3031).
 */

import type { PluginError } from './types';

// -- Types --

export interface ChannelGroup {
  id: string;
  name: string;
  order: number;
}

export interface Channel {
  id: string;
  name: string;
  number: number;
  logoUrl: string | null;
  groupId: string | null;
  group: ChannelGroup | null;
  streamUrl: string;
  isHd: boolean;
  isActive: boolean;
}

export interface Program {
  id: string;
  channelId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  category: string | null;
  rating: string | null;
  episodeNumber: string | null;
  seasonNumber: string | null;
  posterUrl: string | null;
  isNew: boolean;
  isLive: boolean;
}

export interface ImportResult {
  channels: number;
  programs: number;
}

// -- Client --

const DEFAULT_BASE_URL = 'http://localhost:3031';

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let body: PluginError;
    try {
      body = await res.json();
    } catch {
      body = { error: 'unknown', message: res.statusText, statusCode: res.status };
    }
    throw body;
  }
  return res.json();
}

export function importXMLTV(
  data: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<ImportResult> {
  return request<ImportResult>(baseUrl, '/api/v1/epg/import', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export function getChannels(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Channel[]> {
  return request<Channel[]>(baseUrl, '/api/v1/epg/channels', {
    method: 'GET',
  });
}

export function getSchedule(
  channelId: string,
  start: Date,
  end: Date,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Program[]> {
  const params = new URLSearchParams({
    channelId,
    start: start.toISOString(),
    end: end.toISOString(),
  });
  return request<Program[]>(baseUrl, `/api/v1/epg/schedule?${params.toString()}`, {
    method: 'GET',
  });
}

export function searchPrograms(
  query: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Program[]> {
  return request<Program[]>(
    baseUrl,
    `/api/v1/epg/programs/search?q=${encodeURIComponent(query)}`,
    { method: 'GET' },
  );
}

export function getNowPlaying(
  channelId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Program | null> {
  return request<Program | null>(baseUrl, `/api/v1/epg/channels/${channelId}/now`, {
    method: 'GET',
  });
}
