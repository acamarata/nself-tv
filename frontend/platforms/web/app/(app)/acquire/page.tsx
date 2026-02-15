'use client';

import { useState, useMemo } from 'react';
import { Download, CheckCircle, AlertCircle, Rss, Activity, Plus, Film, Tv } from 'lucide-react';
import Link from 'next/link';
import type { AcquisitionDashboard, ActivityEntry } from '@/types/acquisition';

const MOCK_DASHBOARD: AcquisitionDashboard = {
  activeDownloads: 2,
  completedToday: 5,
  failedThisWeek: 1,
  activeSubscriptions: 8,
  recentActivity: [
    { id: 'a1', type: 'download_complete', title: 'Breaking Bad S05E16', timestamp: new Date(Date.now() - 3600000).toISOString(), details: '4.2 GB, Balanced profile' },
    { id: 'a2', type: 'episode_detected', title: 'The Bear S03E01', timestamp: new Date(Date.now() - 7200000).toISOString(), details: 'New episode from ShowRSS feed' },
    { id: 'a3', type: 'movie_released', title: 'Dune: Part Three', timestamp: new Date(Date.now() - 86400000).toISOString(), details: 'Digital release detected via TMDB' },
    { id: 'a4', type: 'download_failed', title: 'Severance S02E05', timestamp: new Date(Date.now() - 172800000).toISOString(), details: 'Encoding failed: FFmpeg timeout' },
    { id: 'a5', type: 'subscription_added', title: 'Andor', timestamp: new Date(Date.now() - 259200000).toISOString(), details: 'Subscribed with Balanced quality' },
  ],
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  download_complete: <CheckCircle className="w-4 h-4 text-green-500" />,
  download_failed: <AlertCircle className="w-4 h-4 text-red-500" />,
  subscription_added: <Rss className="w-4 h-4 text-blue-500" />,
  movie_released: <Film className="w-4 h-4 text-purple-500" />,
  episode_detected: <Tv className="w-4 h-4 text-yellow-500" />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AcquireDashboardPage() {
  const dashboard = MOCK_DASHBOARD;

  const cards = [
    { label: 'Active Downloads', value: dashboard.activeDownloads, icon: <Download className="w-5 h-5" />, color: 'text-yellow-500', href: '/acquire/downloads' },
    { label: 'Completed Today', value: dashboard.completedToday, icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-500', href: '/acquire/downloads/history' },
    { label: 'Failed This Week', value: dashboard.failedThisWeek, icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-500', href: '/acquire/downloads/history' },
    { label: 'Active Subscriptions', value: dashboard.activeSubscriptions, icon: <Rss className="w-5 h-5" />, color: 'text-blue-500', href: '/acquire/subscriptions' },
  ];

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Content Acquisition</h1>
        <div className="flex items-center gap-2">
          <Link href="/acquire/subscriptions" className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
            <Plus className="w-4 h-4" /> Subscribe
          </Link>
          <Link href="/acquire/movies" className="flex items-center gap-1 px-3 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">
            <Film className="w-4 h-4" /> Monitor Movie
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="bg-surface border border-border rounded-xl p-4 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className={card.color}>{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{card.value}</p>
            <p className="text-xs text-text-tertiary mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-surface border border-border rounded-xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Activity className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {dashboard.recentActivity.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-4 py-3" data-testid={`activity-${entry.id}`}>
              <div className="mt-0.5">{ACTIVITY_ICONS[entry.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{entry.title}</p>
                {entry.details && <p className="text-xs text-text-tertiary mt-0.5">{entry.details}</p>}
              </div>
              <span className="text-xs text-text-tertiary whitespace-nowrap">{timeAgo(entry.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
