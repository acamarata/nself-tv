/**
 * Recording / DVR plugin client.
 * Communicates with the nSelf recording plugin (port 3602).
 */

import type { PluginError } from './types';

// -- Types --

export type RecordingStatus =
  | 'scheduled'
  | 'recording'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Recording {
  id: string;
  eventId: string;
  familyId: string;
  channelId: string;
  title: string;
  description: string | null;
  status: RecordingStatus;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  fileSize: number | null;
  filePath: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledRecording {
  id: string;
  eventId: string;
  familyId: string;
  channelId: string;
  title: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

export interface CreateRecordingParams {
  eventId: string;
  familyId: string;
  channelId: string;
}

// -- Client --

const DEFAULT_BASE_URL = 'http://localhost:3602';

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
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function createRecording(
  params: CreateRecordingParams,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Recording> {
  return request<Recording>(baseUrl, '/api/v1/recordings', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function finalizeRecording(
  recordingId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/recordings/${recordingId}/finalize`, {
    method: 'POST',
  });
}

export function listRecordings(
  familyId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Recording[]> {
  return request<Recording[]>(
    baseUrl,
    `/api/v1/recordings?familyId=${encodeURIComponent(familyId)}`,
    { method: 'GET' },
  );
}

export function getRecording(
  recordingId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Recording> {
  return request<Recording>(baseUrl, `/api/v1/recordings/${recordingId}`, {
    method: 'GET',
  });
}

export function deleteRecording(
  recordingId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/recordings/${recordingId}`, {
    method: 'DELETE',
  });
}

export function getRecordingSchedule(
  familyId: string,
  start: Date,
  end: Date,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<ScheduledRecording[]> {
  const params = new URLSearchParams({
    familyId,
    start: start.toISOString(),
    end: end.toISOString(),
  });
  return request<ScheduledRecording[]>(
    baseUrl,
    `/api/v1/recordings/schedule?${params.toString()}`,
    { method: 'GET' },
  );
}
