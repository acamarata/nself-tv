'use client';

import { useState, useEffect } from 'react';
import { storageManager, type StorageQuota } from '@/lib/offline/storage-manager';
import { downloadManager } from '@/lib/offline/download-manager';

export interface StorageUsageProps {
  className?: string;
  showDetails?: boolean;
}

export function StorageUsage({ className = '', showDetails = true }: StorageUsageProps) {
  const [quota, setQuota] = useState<StorageQuota>({
    usage: 0,
    quota: 0,
    percentage: 0,
  });
  const [downloads, setDownloads] = useState(0);

  useEffect(() => {
    const updateQuota = async () => {
      const q = await storageManager.getQuota();
      setQuota(q);

      const completed = downloadManager.getAll().filter((d) => d.status === 'completed');
      setDownloads(completed.length);
    };

    updateQuota();

    // Update periodically
    const interval = setInterval(updateQuota, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 70) return 'warning';
    return 'normal';
  };

  return (
    <div className={`storage-usage ${className}`}>
      <div className="storage-header">
        <h3 className="storage-title">Offline Storage</h3>
        {showDetails && (
          <span className="storage-count">
            {downloads} item{downloads !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="storage-bar-container">
        <div
          className={`storage-bar ${getStatusColor(quota.percentage)}`}
          style={{ width: `${quota.percentage}%` }}
          role="progressbar"
          aria-valuenow={quota.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${quota.percentage}% of storage used`}
        />
      </div>

      {showDetails && (
        <div className="storage-details">
          <span className="storage-used">{formatBytes(quota.usage)} used</span>
          <span className="storage-separator">of</span>
          <span className="storage-total">{formatBytes(quota.quota)}</span>
          <span className="storage-percentage">({quota.percentage}%)</span>
        </div>
      )}

      {quota.percentage >= 90 && (
        <div className="storage-warning" role="alert">
          Storage is almost full. Some items may be automatically removed.
        </div>
      )}
    </div>
  );
}
