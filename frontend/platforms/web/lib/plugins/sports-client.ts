/**
 * Sports data plugin client.
 * Communicates with the nSelf sports plugin (port 3035).
 */

import type { PluginError } from './types';

// -- Types --

export type GameStatus =
  | 'scheduled'
  | 'live'
  | 'halftime'
  | 'final'
  | 'postponed'
  | 'cancelled';

export interface League {
  id: string;
  name: string;
  sport: string;
  country: string;
  logoUrl: string | null;
  season: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  city: string;
  conference: string | null;
  division: string | null;
}

export interface Game {
  id: string;
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  startTime: string;
  venue: string | null;
  broadcastChannel: string | null;
  streamUrl: string | null;
}

export interface Standing {
  teamId: string;
  team: Team | null;
  leagueId: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  conference: string | null;
  division: string | null;
}

export interface FavoriteTeam {
  userId: string;
  teamId: string;
  team: Team | null;
  autoRecord: boolean;
  createdAt: string;
}

export interface SyncResult {
  leagues: number;
  teams: number;
  games: number;
}

export interface ListGamesParams {
  leagueId?: string;
  teamId?: string;
  date?: string;
}

// -- Client --

const DEFAULT_BASE_URL = 'http://localhost:3035';

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

export function syncAll(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<SyncResult> {
  return request<SyncResult>(baseUrl, '/api/v1/sports/sync', {
    method: 'POST',
  });
}

export function listLeagues(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<League[]> {
  return request<League[]>(baseUrl, '/api/v1/sports/leagues', {
    method: 'GET',
  });
}

export function listTeams(
  leagueId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Team[]> {
  return request<Team[]>(baseUrl, `/api/v1/sports/leagues/${leagueId}/teams`, {
    method: 'GET',
  });
}

export function listGames(
  params: ListGamesParams = {},
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Game[]> {
  const query = new URLSearchParams();
  if (params.leagueId) query.set('leagueId', params.leagueId);
  if (params.teamId) query.set('teamId', params.teamId);
  if (params.date) query.set('date', params.date);
  const qs = query.toString();
  return request<Game[]>(baseUrl, `/api/v1/sports/games${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export function getStandings(
  leagueId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Standing[]> {
  return request<Standing[]>(baseUrl, `/api/v1/sports/leagues/${leagueId}/standings`, {
    method: 'GET',
  });
}

export function addFavoriteTeam(
  userId: string,
  teamId: string,
  autoRecord: boolean,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, '/api/v1/sports/favorites', {
    method: 'POST',
    body: JSON.stringify({ userId, teamId, autoRecord }),
  });
}

export function listFavoriteTeams(
  userId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<FavoriteTeam[]> {
  return request<FavoriteTeam[]>(
    baseUrl,
    `/api/v1/sports/favorites?userId=${encodeURIComponent(userId)}`,
    { method: 'GET' },
  );
}
