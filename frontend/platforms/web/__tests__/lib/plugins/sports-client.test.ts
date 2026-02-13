import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncAll,
  listLeagues,
  listTeams,
  listGames,
  getStandings,
  addFavoriteTeam,
  listFavoriteTeams,
} from '@/lib/plugins/sports-client';
import type {
  League,
  Team,
  Game,
  Standing,
  FavoriteTeam,
  SyncResult,
} from '@/lib/plugins/sports-client';

const BASE = 'http://localhost:3035';

const mockLeague: League = {
  id: 'lg-001',
  name: 'NFL',
  sport: 'football',
  country: 'US',
  logoUrl: 'http://example.com/nfl.png',
  season: '2025-2026',
  isActive: true,
};

const mockTeam: Team = {
  id: 'tm-001',
  leagueId: 'lg-001',
  name: 'Cleveland Browns',
  shortName: 'CLE',
  logoUrl: 'http://example.com/cle.png',
  city: 'Cleveland',
  conference: 'AFC',
  division: 'North',
};

const mockGame: Game = {
  id: 'gm-001',
  leagueId: 'lg-001',
  homeTeamId: 'tm-001',
  awayTeamId: 'tm-002',
  homeTeam: mockTeam,
  awayTeam: null,
  homeScore: 21,
  awayScore: 17,
  status: 'final',
  startTime: '2026-02-13T20:00:00Z',
  venue: 'FirstEnergy Stadium',
  broadcastChannel: 'ESPN',
  streamUrl: null,
};

const mockStanding: Standing = {
  teamId: 'tm-001',
  team: mockTeam,
  leagueId: 'lg-001',
  rank: 1,
  wins: 12,
  losses: 5,
  ties: 0,
  winPercentage: 0.706,
  pointsFor: 380,
  pointsAgainst: 290,
  streak: 'W3',
  conference: 'AFC',
  division: 'North',
};

const mockFavorite: FavoriteTeam = {
  userId: 'usr-001',
  teamId: 'tm-001',
  team: mockTeam,
  autoRecord: true,
  createdAt: '2026-01-15T00:00:00Z',
};

describe('sports-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncAll', () => {
    it('sends POST and returns sync result', async () => {
      const syncResult: SyncResult = { leagues: 4, teams: 128, games: 1200 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(syncResult),
      });

      const result = await syncAll();

      expect(result).toEqual(syncResult);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/sports/sync`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ leagues: 0, teams: 0, games: 0 }),
      });

      await syncAll('http://custom:5555');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:5555/api/v1/sports/sync',
        expect.any(Object),
      );
    });

    it('throws PluginError on non-OK response with JSON body', async () => {
      const errorBody = { error: 'upstream', message: 'API rate limited', statusCode: 429 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve(errorBody),
      });

      await expect(syncAll()).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(syncAll()).rejects.toEqual({
        error: 'unknown',
        message: 'Service Unavailable',
        statusCode: 503,
      });
    });
  });

  describe('listLeagues', () => {
    it('sends GET and returns League[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockLeague]),
      });

      const result = await listLeagues();

      expect(result).toEqual([mockLeague]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/sports/leagues`,
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('listTeams', () => {
    it('sends GET with leagueId in URL path', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockTeam]),
      });

      const result = await listTeams('lg-001');

      expect(result).toEqual([mockTeam]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/sports/leagues/lg-001/teams`,
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('listGames', () => {
    it('sends GET with no params when none provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockGame]),
      });

      const result = await listGames();

      expect(result).toEqual([mockGame]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/sports/games`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('sends GET with leagueId query param', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockGame]),
      });

      await listGames({ leagueId: 'lg-001' });

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('leagueId=lg-001');
    });

    it('sends GET with teamId query param', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listGames({ teamId: 'tm-001' });

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('teamId=tm-001');
    });

    it('sends GET with date query param', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listGames({ date: '2026-02-13' });

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('date=2026-02-13');
    });

    it('sends GET with all params combined', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listGames({ leagueId: 'lg-001', teamId: 'tm-001', date: '2026-02-13' });

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('leagueId=lg-001');
      expect(calledUrl).toContain('teamId=tm-001');
      expect(calledUrl).toContain('date=2026-02-13');
    });
  });

  describe('getStandings', () => {
    it('sends GET with leagueId in path', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockStanding]),
      });

      const result = await getStandings('lg-001');

      expect(result).toEqual([mockStanding]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/sports/leagues/lg-001/standings`,
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('addFavoriteTeam', () => {
    it('sends POST with userId, teamId, autoRecord and returns void', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await addFavoriteTeam('usr-001', 'tm-001', true);

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/sports/favorites`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId: 'usr-001', teamId: 'tm-001', autoRecord: true }),
        }),
      );
    });
  });

  describe('listFavoriteTeams', () => {
    it('sends GET with userId query param', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockFavorite]),
      });

      const result = await listFavoriteTeams('usr-001');

      expect(result).toEqual([mockFavorite]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/sports/favorites?userId=usr-001`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('encodes userId with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listFavoriteTeams('user/001&x=1');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/sports/favorites?userId=${encodeURIComponent('user/001&x=1')}`,
        expect.any(Object),
      );
    });
  });
});
