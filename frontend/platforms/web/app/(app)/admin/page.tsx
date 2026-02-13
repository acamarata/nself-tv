'use client';

import Link from 'next/link';
import { Upload, FolderSearch, Tags, Film, Tv, HardDrive, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const stats: StatCard[] = [
  {
    label: 'Total Media',
    value: '247',
    icon: <MonitorPlay className="w-6 h-6" />,
  },
  {
    label: 'Movies',
    value: '89',
    icon: <Film className="w-6 h-6" />,
  },
  {
    label: 'TV Shows',
    value: '34',
    icon: <Tv className="w-6 h-6" />,
  },
  {
    label: 'Storage Used',
    value: '1.2 TB',
    icon: <HardDrive className="w-6 h-6" />,
  },
];

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
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
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
    </div>
  );
}
