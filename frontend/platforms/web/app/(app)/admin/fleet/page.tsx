'use client';

import { useState, useMemo } from 'react';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Radio,
  RefreshCw,
  Download,
  Search,
  Server,
  Signal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AntBoxDevice } from '@/types/dvr';

// ---- Mock Data ----

const MOCK_DEVICES: AntBoxDevice[] = [
  {
    id: 'dev-1',
    name: 'Living Room HDHomeRun',
    type: 'hdhomerun',
    status: 'online',
    ip: '192.168.1.100',
    tunerCount: 4,
    activeTuners: 2,
    signalStrength: 92,
    lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
    firmware: '20260101',
    uptime: 864000, // 10 days
  },
  {
    id: 'dev-2',
    name: 'Bedroom Antenna',
    type: 'antenna',
    status: 'degraded',
    ip: '192.168.1.101',
    tunerCount: 2,
    activeTuners: 1,
    signalStrength: 54,
    lastHeartbeat: new Date(Date.now() - 120000).toISOString(),
    firmware: '20250815',
    uptime: 432000, // 5 days
  },
  {
    id: 'dev-3',
    name: 'Garage Custom Tuner',
    type: 'custom',
    status: 'offline',
    ip: '192.168.1.102',
    tunerCount: 1,
    activeTuners: 0,
    signalStrength: 0,
    lastHeartbeat: new Date(Date.now() - 3600000).toISOString(),
    firmware: '20250601',
    uptime: 0,
  },
];

// ---- Helpers ----

function formatUptime(seconds: number): string {
  if (seconds <= 0) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function statusIcon(status: AntBoxDevice['status']) {
  switch (status) {
    case 'online':
      return <Wifi className="w-4 h-4 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'offline':
      return <WifiOff className="w-4 h-4 text-red-500" />;
  }
}

function statusBadge(status: AntBoxDevice['status']) {
  const styles: Record<string, string> = {
    online: 'bg-green-500/10 text-green-500',
    degraded: 'bg-yellow-500/10 text-yellow-500',
    offline: 'bg-red-500/10 text-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {statusIcon(status)}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---- Component ----

export default function FleetPage() {
  const [selectedDevice, setSelectedDevice] = useState<AntBoxDevice | null>(null);
  const devices = MOCK_DEVICES;

  const statusCounts = useMemo(() => {
    return {
      online: devices.filter((d) => d.status === 'online').length,
      degraded: devices.filter((d) => d.status === 'degraded').length,
      offline: devices.filter((d) => d.status === 'offline').length,
    };
  }, [devices]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-6">Fleet Management</h2>

      {/* Status summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-5 h-5 text-green-500" />
            <span className="text-sm text-text-secondary">Online</span>
          </div>
          <p className="text-2xl font-bold text-text-primary" data-testid="count-online">
            {statusCounts.online}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-text-secondary">Degraded</span>
          </div>
          <p className="text-2xl font-bold text-text-primary" data-testid="count-degraded">
            {statusCounts.degraded}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <WifiOff className="w-5 h-5 text-red-500" />
            <span className="text-sm text-text-secondary">Offline</span>
          </div>
          <p className="text-2xl font-bold text-text-primary" data-testid="count-offline">
            {statusCounts.offline}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Device table */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50">
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Device</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">IP</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Tuners</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Signal</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Heartbeat</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr
                    key={device.id}
                    className={`border-b border-border cursor-pointer transition-colors ${
                      selectedDevice?.id === device.id
                        ? 'bg-primary/5'
                        : 'hover:bg-surface-hover'
                    }`}
                    onClick={() => setSelectedDevice(device)}
                    data-testid={`device-row-${device.id}`}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{device.name}</td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{device.type}</td>
                    <td className="px-4 py-3">{statusBadge(device.status)}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{device.ip}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {device.activeTuners}/{device.tunerCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Signal className="w-3 h-3 text-text-tertiary" />
                        <span className={`text-xs font-medium ${
                          device.signalStrength >= 70 ? 'text-green-500' :
                          device.signalStrength >= 40 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {device.signalStrength}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-tertiary text-xs">
                      {timeAgo(device.lastHeartbeat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selectedDevice && (
          <div className="lg:w-80 flex-shrink-0" data-testid="device-detail">
            <div className="bg-surface border border-border rounded-xl p-5 sticky top-4">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-6 h-6 text-text-tertiary" />
                <div>
                  <h3 className="font-semibold text-text-primary">{selectedDevice.name}</h3>
                  <p className="text-xs text-text-tertiary capitalize">{selectedDevice.type}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Status</span>
                  {statusBadge(selectedDevice.status)}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">IP Address</span>
                  <span className="text-text-primary font-mono text-xs">{selectedDevice.ip}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Tuners</span>
                  <span className="text-text-primary">{selectedDevice.activeTuners} / {selectedDevice.tunerCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Signal</span>
                  <span className="text-text-primary">{selectedDevice.signalStrength}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Firmware</span>
                  <span className="text-text-primary">{selectedDevice.firmware}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Uptime</span>
                  <span className="text-text-primary">{formatUptime(selectedDevice.uptime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Last Heartbeat</span>
                  <span className="text-text-primary">{timeAgo(selectedDevice.lastHeartbeat)}</span>
                </div>
              </div>

              {/* Signal chart placeholder */}
              <div className="bg-surface-hover rounded-lg h-24 flex items-center justify-center mb-4" data-testid="signal-chart-placeholder">
                <span className="text-text-tertiary text-xs">Signal History Chart</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <Search className="w-4 h-4 mr-2" />
                  Scan Channels
                </Button>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart Device
                </Button>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Update Firmware
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
