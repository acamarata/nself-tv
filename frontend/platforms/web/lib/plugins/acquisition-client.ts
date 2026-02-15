/**
 * Content acquisition plugin client.
 * Communicates with the nSelf content-acquisition plugin (port 3202).
 */

import type { PluginError } from './types';
import type {
  AcquisitionDashboard,
  TVSubscription,
  SubscribeRequest,
  MovieMonitoring,
  MonitorMovieRequest,
  CalendarEntry,
  RSSFeed,
  FeedValidation,
  Download,
  CreateDownloadRequest,
  DownloadRule,
  CreateRuleRequest,
  ActivityEntry,
} from '@/types/acquisition';

// -- Client --

const DEFAULT_BASE_URL = 'http://localhost:3202';

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

// -- Dashboard --

export function getDashboard(
  familyId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<AcquisitionDashboard> {
  return request<AcquisitionDashboard>(
    baseUrl,
    `/api/v1/acquisition/dashboard?familyId=${encodeURIComponent(familyId)}`,
  );
}

// -- Subscriptions --

export function listSubscriptions(
  familyId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TVSubscription[]> {
  return request<TVSubscription[]>(
    baseUrl,
    `/api/v1/acquisition/subscriptions?familyId=${encodeURIComponent(familyId)}`,
  );
}

export function createSubscription(
  familyId: string,
  params: SubscribeRequest,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TVSubscription> {
  return request<TVSubscription>(baseUrl, '/api/v1/acquisition/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ familyId, ...params }),
  });
}

export function updateSubscription(
  subscriptionId: string,
  params: Partial<SubscribeRequest>,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TVSubscription> {
  return request<TVSubscription>(baseUrl, `/api/v1/acquisition/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

export function deleteSubscription(
  subscriptionId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/acquisition/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
}

// -- Movie Monitoring --

export function listMonitoredMovies(
  familyId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<MovieMonitoring[]> {
  return request<MovieMonitoring[]>(
    baseUrl,
    `/api/v1/acquisition/movies?familyId=${encodeURIComponent(familyId)}`,
  );
}

export function monitorMovie(
  familyId: string,
  params: MonitorMovieRequest,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<MovieMonitoring> {
  return request<MovieMonitoring>(baseUrl, '/api/v1/acquisition/movies', {
    method: 'POST',
    body: JSON.stringify({ familyId, ...params }),
  });
}

export function unmonitorMovie(
  movieId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/acquisition/movies/${movieId}`, {
    method: 'DELETE',
  });
}

export function getCalendar(
  familyId: string,
  month: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<CalendarEntry[]> {
  const params = new URLSearchParams({ familyId, month });
  return request<CalendarEntry[]>(baseUrl, `/api/v1/acquisition/calendar?${params.toString()}`);
}

// -- RSS Feeds --

export function listFeeds(
  familyId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<RSSFeed[]> {
  return request<RSSFeed[]>(
    baseUrl,
    `/api/v1/acquisition/feeds?familyId=${encodeURIComponent(familyId)}`,
  );
}

export function addFeed(
  familyId: string,
  url: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<RSSFeed> {
  return request<RSSFeed>(baseUrl, '/api/v1/acquisition/feeds', {
    method: 'POST',
    body: JSON.stringify({ familyId, url }),
  });
}

export function validateFeed(
  url: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<FeedValidation> {
  return request<FeedValidation>(baseUrl, '/api/v1/acquisition/feeds/validate', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function deleteFeed(
  feedId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/acquisition/feeds/${feedId}`, {
    method: 'DELETE',
  });
}

// -- Downloads --

export function listDownloads(
  familyId: string,
  status?: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Download[]> {
  const params = new URLSearchParams({ familyId });
  if (status) params.set('status', status);
  return request<Download[]>(baseUrl, `/api/v1/acquisition/downloads?${params.toString()}`);
}

export function createDownload(
  familyId: string,
  params: CreateDownloadRequest,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Download> {
  return request<Download>(baseUrl, '/api/v1/acquisition/downloads', {
    method: 'POST',
    body: JSON.stringify({ familyId, ...params }),
  });
}

export function cancelDownload(
  downloadId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/acquisition/downloads/${downloadId}/cancel`, {
    method: 'POST',
  });
}

export function retryDownload(
  downloadId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Download> {
  return request<Download>(baseUrl, `/api/v1/acquisition/downloads/${downloadId}/retry`, {
    method: 'POST',
  });
}

export function pauseDownload(
  downloadId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/acquisition/downloads/${downloadId}/pause`, {
    method: 'POST',
  });
}

export function resumeDownload(
  downloadId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/acquisition/downloads/${downloadId}/resume`, {
    method: 'POST',
  });
}

export function getDownloadHistory(
  familyId: string,
  page: number = 1,
  limit: number = 20,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<{ downloads: Download[]; total: number }> {
  const params = new URLSearchParams({
    familyId,
    page: String(page),
    limit: String(limit),
  });
  return request<{ downloads: Download[]; total: number }>(
    baseUrl,
    `/api/v1/acquisition/downloads/history?${params.toString()}`,
  );
}

// -- Rules --

export function listRules(
  familyId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<DownloadRule[]> {
  return request<DownloadRule[]>(
    baseUrl,
    `/api/v1/acquisition/rules?familyId=${encodeURIComponent(familyId)}`,
  );
}

export function createRule(
  familyId: string,
  params: CreateRuleRequest,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<DownloadRule> {
  return request<DownloadRule>(baseUrl, '/api/v1/acquisition/rules', {
    method: 'POST',
    body: JSON.stringify({ familyId, ...params }),
  });
}

export function updateRule(
  ruleId: string,
  params: Partial<CreateRuleRequest>,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<DownloadRule> {
  return request<DownloadRule>(baseUrl, `/api/v1/acquisition/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

export function deleteRule(
  ruleId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/acquisition/rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export function testRule(
  ruleId: string,
  sampleContent: Record<string, unknown>,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<{ matches: boolean; action: string }> {
  return request<{ matches: boolean; action: string }>(
    baseUrl,
    `/api/v1/acquisition/rules/${ruleId}/test`,
    {
      method: 'POST',
      body: JSON.stringify(sampleContent),
    },
  );
}

// -- History --

export function getRecentActivity(
  familyId: string,
  limit: number = 20,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<ActivityEntry[]> {
  const params = new URLSearchParams({ familyId, limit: String(limit) });
  return request<ActivityEntry[]>(baseUrl, `/api/v1/acquisition/activity?${params.toString()}`);
}
