'use client';

import { useState, useMemo } from 'react';
import {
  Star,
  Circle,
  Clock,
  Trophy,
  Radio,
  CheckCircle,
} from 'lucide-react';
import type { LiveEvent, EventStatus } from '@/types/dvr';

// ---- Mock Data ----

const MOCK_EVENTS: LiveEvent[] = [
  {
    id: 'sev-1',
    channelId: 'ch-11',
    title: 'NFL Sunday: Eagles vs Cowboys',
    status: 'active',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    league: 'NFL',
    teams: { home: 'Eagles', away: 'Cowboys' },
    score: { home: 24, away: 17 },
  },
  {
    id: 'sev-2',
    channelId: 'ch-11',
    title: 'NBA: Lakers vs Celtics',
    status: 'active',
    startTime: new Date(Date.now() - 1800000).toISOString(),
    endTime: new Date(Date.now() + 5400000).toISOString(),
    league: 'NBA',
    teams: { home: 'Lakers', away: 'Celtics' },
    score: { home: 87, away: 91 },
  },
  {
    id: 'sev-3',
    channelId: 'ch-5',
    title: 'Premier League: Arsenal vs Chelsea',
    status: 'scheduled',
    startTime: new Date(Date.now() + 7200000).toISOString(),
    endTime: new Date(Date.now() + 14400000).toISOString(),
    league: 'Premier League',
    teams: { home: 'Arsenal', away: 'Chelsea' },
  },
  {
    id: 'sev-4',
    channelId: 'ch-11',
    title: 'MLB: Yankees vs Red Sox',
    status: 'scheduled',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    endTime: new Date(Date.now() + 86400000 + 10800000).toISOString(),
    league: 'MLB',
    teams: { home: 'Yankees', away: 'Red Sox' },
  },
  {
    id: 'sev-5',
    channelId: 'ch-5',
    title: 'NHL: Rangers vs Devils',
    status: 'complete',
    startTime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() - 86400000 + 10800000).toISOString(),
    league: 'NHL',
    teams: { home: 'Rangers', away: 'Devils' },
    score: { home: 4, away: 2 },
  },
  {
    id: 'sev-6',
    channelId: 'ch-4',
    title: 'Tennis: US Open Finals',
    status: 'complete',
    startTime: new Date(Date.now() - 172800000).toISOString(),
    endTime: new Date(Date.now() - 172800000 + 14400000).toISOString(),
    league: 'Tennis',
    teams: { home: 'Player A', away: 'Player B' },
    score: { home: 3, away: 1 },
  },
];

const FAVORITE_TEAMS = ['Eagles', 'Lakers', 'Yankees'];

// ---- Helpers ----

type Tab = 'live' | 'upcoming' | 'completed';

function getEventTab(event: LiveEvent): Tab {
  if (event.status === 'active' || event.status === 'recording') return 'live';
  if (event.status === 'complete' || event.status === 'failed') return 'completed';
  return 'upcoming';
}

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function leagueBadge(league: string) {
  const colors: Record<string, string> = {
    NFL: 'bg-green-600/20 text-green-400',
    NBA: 'bg-orange-600/20 text-orange-400',
    MLB: 'bg-blue-600/20 text-blue-400',
    NHL: 'bg-cyan-600/20 text-cyan-400',
    'Premier League': 'bg-purple-600/20 text-purple-400',
    Tennis: 'bg-yellow-600/20 text-yellow-400',
  };
  const color = colors[league] ?? 'bg-gray-600/20 text-gray-400';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${color}`}>
      <Trophy className="w-3 h-3" />
      {league}
    </span>
  );
}

function isFavoriteEvent(event: LiveEvent): boolean {
  if (!event.teams) return false;
  return FAVORITE_TEAMS.includes(event.teams.home) || FAVORITE_TEAMS.includes(event.teams.away);
}

// ---- Component ----

export default function SportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [recordToggles, setRecordToggles] = useState<Record<string, boolean>>({});

  const eventsByTab = useMemo(() => {
    const grouped: Record<Tab, LiveEvent[]> = { live: [], upcoming: [], completed: [] };
    for (const event of MOCK_EVENTS) {
      grouped[getEventTab(event)].push(event);
    }
    return grouped;
  }, []);

  const favoriteEvents = useMemo(() => {
    return MOCK_EVENTS.filter(isFavoriteEvent);
  }, []);

  const toggleRecord = (eventId: string) => {
    setRecordToggles((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'live', label: 'Live Now', count: eventsByTab.live.length },
    { key: 'upcoming', label: 'Upcoming', count: eventsByTab.upcoming.length },
    { key: 'completed', label: 'Completed', count: eventsByTab.completed.length },
  ];

  const visibleEvents = eventsByTab[activeTab];

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Sports</h1>

      {/* Favorite teams section */}
      {favoriteEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Your Teams
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="favorite-events">
            {favoriteEvents.map((event) => (
              <div
                key={`fav-${event.id}`}
                className="bg-surface border border-yellow-500/30 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  {event.league && leagueBadge(event.league)}
                  {getEventTab(event) === 'live' && (
                    <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                      <Radio className="w-3 h-3" />
                      LIVE
                    </span>
                  )}
                </div>
                {event.teams && (
                  <div className="flex items-center justify-between text-sm" data-testid={`favorite-score-${event.id}`}>
                    <div className="flex-1">
                      <p className={`font-semibold ${FAVORITE_TEAMS.includes(event.teams.home) ? 'text-primary' : 'text-text-primary'}`}>
                        {event.teams.home}
                      </p>
                      <p className={`font-semibold ${FAVORITE_TEAMS.includes(event.teams.away) ? 'text-primary' : 'text-text-primary'}`}>
                        {event.teams.away}
                      </p>
                    </div>
                    {event.score && (
                      <div className="text-right">
                        <p className="font-bold text-text-primary text-lg">{event.score.home}</p>
                        <p className="font-bold text-text-primary text-lg">{event.score.away}</p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-text-tertiary mt-2">{formatEventTime(event.startTime)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs bg-surface-hover px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event cards */}
      {visibleEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="events-grid">
          {visibleEvents.map((event) => (
            <div
              key={event.id}
              className="bg-surface border border-border rounded-xl p-5"
              data-testid={`event-card-${event.id}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                {event.league && leagueBadge(event.league)}
                {getEventTab(event) === 'live' && (
                  <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                    <Radio className="w-3 h-3" />
                    LIVE
                  </span>
                )}
                {getEventTab(event) === 'completed' && (
                  <span className="flex items-center gap-1 text-text-tertiary text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Final
                  </span>
                )}
              </div>

              {/* Teams & Score */}
              {event.teams ? (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 space-y-1">
                    {/* Home team */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">
                        {event.teams.home.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{event.teams.home}</span>
                      {event.score && (
                        <span className="ml-auto text-lg font-bold text-text-primary">{event.score.home}</span>
                      )}
                    </div>
                    {/* Away team */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">
                        {event.teams.away.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{event.teams.away}</span>
                      {event.score && (
                        <span className="ml-auto text-lg font-bold text-text-primary">{event.score.away}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <h3 className="text-sm font-semibold text-text-primary mb-3">{event.title}</h3>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-text-tertiary flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatEventTime(event.startTime)}
                </span>

                {/* Record toggle for upcoming events */}
                {getEventTab(event) === 'upcoming' && (
                  <button
                    type="button"
                    onClick={() => toggleRecord(event.id)}
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                      recordToggles[event.id]
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                    }`}
                    aria-label={recordToggles[event.id] ? 'Cancel recording' : 'Record event'}
                    data-testid={`record-toggle-${event.id}`}
                  >
                    <Circle className={`w-3 h-3 ${recordToggles[event.id] ? 'fill-red-500 text-red-500' : ''}`} />
                    {recordToggles[event.id] ? 'Recording' : 'Record'}
                  </button>
                )}

                {/* Auto-record indicator for favorite team events */}
                {isFavoriteEvent(event) && getEventTab(event) === 'upcoming' && (
                  <span className="text-xs text-yellow-500 flex items-center gap-1" data-testid={`auto-record-${event.id}`}>
                    <Star className="w-3 h-3 fill-yellow-500" />
                    Auto
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Trophy className="w-16 h-16 text-text-tertiary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No events</h2>
          <p className="text-text-secondary text-sm">
            {activeTab === 'live'
              ? 'No live events right now. Check back later.'
              : activeTab === 'upcoming'
                ? 'No upcoming events scheduled.'
                : 'No completed events to show.'}
          </p>
        </div>
      )}
    </div>
  );
}
