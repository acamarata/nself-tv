'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface LinkedDevice {
  id: string;
  name: string;
  type: 'web' | 'mobile' | 'desktop' | 'tv' | 'tablet';
  lastActive: string;
  isCurrent: boolean;
}

// Mocked device data until backend query is available
const MOCK_DEVICES: LinkedDevice[] = [
  {
    id: '1',
    name: 'Chrome on macOS',
    type: 'web',
    lastActive: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: '2',
    name: 'iPhone 15 Pro',
    type: 'mobile',
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
  {
    id: '3',
    name: 'Living Room TV',
    type: 'tv',
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
  {
    id: '4',
    name: 'iPad Air',
    type: 'tablet',
    lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
  {
    id: '5',
    name: 'nTV Desktop App',
    type: 'desktop',
    lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
];

function DeviceIcon({ type }: { type: LinkedDevice['type'] }) {
  switch (type) {
    case 'web':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      );
    case 'mobile':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'desktop':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'tv':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM8 21h8m-4-4v4" />
        </svg>
      );
    case 'tablet':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
  }
}

function formatLastActive(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 5) return 'Active now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<LinkedDevice[]>(MOCK_DEVICES);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (deviceId: string) => {
    setRevokingId(deviceId);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setRevokingId(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Linked Devices
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Manage devices that have access to your account. Revoking a device will sign it out.
        </p>

        <div className="divide-y divide-border">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`flex items-center gap-4 py-4 first:pt-0 last:pb-0 ${
                device.isCurrent ? '' : ''
              }`}
            >
              {/* Device Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  device.isCurrent
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-hover text-text-tertiary'
                }`}
              >
                <DeviceIcon type={device.type} />
              </div>

              {/* Device Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {device.name}
                  </span>
                  {device.isCurrent && (
                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      This device
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-tertiary">
                  {formatLastActive(device.lastActive)}
                </span>
              </div>

              {/* Revoke Button */}
              {!device.isCurrent && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRevoke(device.id)}
                  isLoading={revokingId === device.id}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>

        {devices.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-8">
            No devices linked to your account.
          </p>
        )}
      </section>
    </div>
  );
}
