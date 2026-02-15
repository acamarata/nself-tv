'use client';

import Link from 'next/link';
import { Upload, FolderSearch, Tags, Film, Tv, HardDrive, MonitorPlay, Users, Clock, AlertCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDashboardStats, useStorageStats, useRecentActivity, useSystemHealth, formatBytes, calculateTotalWatchTime } from '@/hooks/useAdminDashboard';

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const quickActions: QuickAction[] = [
  {
    label: 'Upload Media',
    href: '/admin/media/upload',
    icon: <Upload className="w-5 h-5" />,
  },
  {
    label: 'Scan Library',
    href: '/admin/media/scan',
    icon: <FolderSearch className="w-5 h-5" />,
  },
  {
    label: 'Manage Metadata',
    href: '/admin/media/metadata',
    icon: <Tags className="w-5 h-5" />,
  },
];

export default function AdminDashboardPage() {
  const { data: statsData, loading: statsLoading } = useDashboardStats();
  const { data: storageData, loading: storageLoading } = useStorageStats();
  const { data: activityData, loading: activityLoading } = useRecentActivity();
  const { data: healthData, loading: healthLoading } = useSystemHealth();

  const stats: StatCard[] = [
    {
      label: 'Total Media',
      value: statsLoading ? '—' : (statsData?.media_items_aggregate?.aggregate?.count || 0).toString(),
      icon: <MonitorPlay className="w-6 h-6" />,
      loading: statsLoading,
    },
    {
      label: 'Movies',
      value: statsLoading ? '—' : (statsData?.movies?.aggregate?.count || 0).toString(),
      icon: <Film className="w-6 h-6" />,
      loading: statsLoading,
    },
    {
      label: 'TV Shows',
      value: statsLoading ? '—' : (statsData?.tv_shows?.aggregate?.count || 0).toString(),
      icon: <Tv className="w-6 h-6" />,
      loading: statsLoading,
    },
    {
      label: 'Storage Used',
      value: storageLoading ? '—' : formatBytes(storageData?.media_variants_aggregate?.aggregate?.sum?.file_size_bytes || 0),
      icon: <HardDrive className="w-6 h-6" />,
      loading: storageLoading,
    },
    {
      label: 'Active Users',
      value: statsLoading ? '—' : (statsData?.active_users?.aggregate?.count || 0).toString(),
      icon: <Users className="w-6 h-6" />,
      loading: statsLoading,
    },
    {
      label: 'Total Watch Time',
      value: statsLoading ? '—' : calculateTotalWatchTime(statsData?.total_watch_time?.aggregate?.sum?.position_seconds || 0),
      icon: <Clock className="w-6 h-6" />,
      loading: statsLoading,
    },
    {
      label: 'Live Channels',
      value: statsLoading ? '—' : (statsData?.live_channels?.aggregate?.count || 0).toString(),
      icon: <Activity className="w-6 h-6" />,
      loading: statsLoading,
    },
    {
      label: 'Failed Jobs',
      value: healthLoading ? '—' : (healthData?.failed_jobs?.aggregate?.count || 0).toString(),
      icon: <AlertCircle className="w-6 h-6" />,
      loading: healthLoading,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-6">
        Admin Dashboard
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-tertiary">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {stat.loading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                stat.value
              )}
            </p>
            <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Recent Activity
      </h3>
      <div className="bg-surface border border-border rounded-xl p-5 mb-8">
        {activityLoading ? (
          <p className="text-text-secondary">Loading activity...</p>
        ) : activityData?.active_sessions?.length > 0 ? (
          <div className="space-y-3">
            {activityData.active_sessions.map((session: any) => (
              <div key={session.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{session.media_item.title}</p>
                  <p className="text-xs text-text-secondary">{session.user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-primary">{session.percentage}%</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(session.last_watched_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">No recent activity</p>
        )}
      </div>

      {/* Quick Actions */}
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div className="bg-surface border border-border rounded-xl p-5 hover:bg-surface-hover transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-primary">{action.icon}</span>
                <span className="text-sm font-medium text-text-primary">
                  {action.label}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* System Health */}
      {!healthLoading && healthData?.error_logs?.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Recent Errors
          </h3>
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="space-y-3">
              {healthData.error_logs.map((error: any) => (
                <div key={error.id} className="py-2 border-b border-border last:border-0">
                  <p className="text-sm font-medium text-text-primary">{error.title}</p>
                  <p className="text-xs text-red-400 mt-1">{error.processing_error}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {new Date(error.updated_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
