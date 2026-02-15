'use client';

import { useState, useEffect } from 'react';
import { syncEngine } from '@/lib/offline/sync-engine';

export interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

export function OfflineIndicator({
  className = '',
  showWhenOnline = false,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingChanges, setPendingChanges] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check pending changes periodically
    const checkPending = async () => {
      const changes = await syncEngine.getPendingChanges();
      setPendingChanges(changes.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    try {
      const result = await syncEngine.sync();
      setPendingChanges(0);
      console.log('Sync complete:', result);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && !showWhenOnline && pendingChanges === 0) {
    return null; // Don't show when online with no pending changes
  }

  return (
    <div
      className={`offline-indicator ${isOnline ? 'online' : 'offline'} ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />

      {!isOnline && (
        <>
          <span className="status-text">Offline Mode</span>
          {pendingChanges > 0 && (
            <span className="pending-count" aria-label={`${pendingChanges} pending changes`}>
              {pendingChanges}
            </span>
          )}
        </>
      )}

      {isOnline && pendingChanges > 0 && (
        <>
          <span className="status-text">
            {syncing ? 'Syncing...' : `${pendingChanges} pending`}
          </span>
          {!syncing && (
            <button
              onClick={handleSync}
              className="sync-button"
              aria-label="Sync pending changes"
            >
              Sync
            </button>
          )}
        </>
      )}
    </div>
  );
}
