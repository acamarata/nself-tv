/**
 * Sync Engine for Offline Changes
 *
 * Records changes made offline and synchronizes them when connection is restored.
 * Handles conflict resolution for watchlist, progress, and ratings.
 */

export type ChangeType =
  | 'watchlist:add'
  | 'watchlist:remove'
  | 'progress:update'
  | 'rating:set'
  | 'preference:update';

export interface OfflineChange {
  id: string;
  type: ChangeType;
  timestamp: Date;
  data: any;
  synced: boolean;
  error?: string;
}

export interface SyncResult {
  success: number;
  failed: number;
  conflicts: number;
  changes: OfflineChange[];
}

class SyncEngine {
  private syncInProgress = false;
  private autoSyncEnabled = true;
  private syncInterval: number | null = null;

  constructor() {
    this.setupOnlineListener();
  }

  /**
   * Setup listener for online/offline events
   */
  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (this.autoSyncEnabled) {
        this.sync();
      }
    });

    // Periodic sync when online (every 5 minutes)
    if (navigator.onLine && this.autoSyncEnabled) {
      this.syncInterval = window.setInterval(() => {
        this.sync();
      }, 5 * 60 * 1000);
    }

    window.addEventListener('offline', () => {
      if (this.syncInterval !== null) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
    });
  }

  /**
   * Record an offline change
   */
  async recordChange(type: ChangeType, data: any): Promise<void> {
    const change: OfflineChange = {
      id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      timestamp: new Date(),
      data,
      synced: false,
    };

    const db = await this.openDatabase();
    const transaction = db.transaction(['offline_changes'], 'readwrite');
    const store = transaction.objectStore('offline_changes');

    return new Promise((resolve, reject) => {
      const request = store.add(change);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending (unsynced) changes
   */
  async getPendingChanges(): Promise<OfflineChange[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['offline_changes'], 'readonly');
    const store = transaction.objectStore('offline_changes');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const allChanges = request.result as OfflineChange[];
        const pending = allChanges
          .filter((change) => !change.synced)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync all pending changes
   */
  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    this.syncInProgress = true;

    try {
      const changes = await this.getPendingChanges();
      const result: SyncResult = {
        success: 0,
        failed: 0,
        conflicts: 0,
        changes: [],
      };

      // Group changes by type for batch processing
      const grouped = this.groupChangesByType(changes);

      // Sync each group
      for (const [type, groupChanges] of Object.entries(grouped)) {
        try {
          const response = await this.syncBatch(type as ChangeType, groupChanges);

          // Mark successful changes as synced
          for (const change of groupChanges) {
            if (response.conflicts && response.conflicts.includes(change.id)) {
              result.conflicts++;
              // Resolve conflict
              await this.resolveConflict(change, response.serverData);
            } else {
              await this.markSynced(change.id);
              result.success++;
            }
          }
        } catch (error) {
          result.failed += groupChanges.length;

          // Mark changes with error
          for (const change of groupChanges) {
            await this.markError(change.id, (error as Error).message);
          }
        }
      }

      result.changes = changes;
      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Group changes by type
   */
  private groupChangesByType(changes: OfflineChange[]): Record<string, OfflineChange[]> {
    const grouped: Record<string, OfflineChange[]> = {};

    for (const change of changes) {
      if (!grouped[change.type]) {
        grouped[change.type] = [];
      }
      grouped[change.type].push(change);
    }

    return grouped;
  }

  /**
   * Sync a batch of changes to the server
   */
  private async syncBatch(
    type: ChangeType,
    changes: OfflineChange[]
  ): Promise<{ conflicts?: string[]; serverData?: any }> {
    const endpoint = '/api/v1/sync';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        changes: changes.map((c) => ({
          id: c.id,
          timestamp: c.timestamp.toISOString(),
          data: c.data,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Resolve a conflict between local and server data
   *
   * Conflict resolution strategies:
   * - Watch progress: last-write-wins
   * - Watchlist: merge (union for add, intersection for remove)
   * - Ratings: last-write-wins
   * - Preferences: last-write-wins
   */
  private async resolveConflict(change: OfflineChange, serverData: any): Promise<void> {
    switch (change.type) {
      case 'progress:update':
        // Last-write-wins
        if (serverData.timestamp && serverData.timestamp > change.timestamp.toISOString()) {
          // Server wins, update local
          await this.updateLocal('progress', serverData);
        } else {
          // Local wins, force update server
          await this.forceUpdateServer(change);
        }
        break;

      case 'watchlist:add':
      case 'watchlist:remove':
        // Merge: union for add, intersection for remove
        await this.mergeWatchlist(change, serverData);
        break;

      case 'rating:set':
        // Last-write-wins
        if (serverData.timestamp && serverData.timestamp > change.timestamp.toISOString()) {
          await this.updateLocal('rating', serverData);
        } else {
          await this.forceUpdateServer(change);
        }
        break;

      case 'preference:update':
        // Last-write-wins
        if (serverData.timestamp && serverData.timestamp > change.timestamp.toISOString()) {
          await this.updateLocal('preference', serverData);
        } else {
          await this.forceUpdateServer(change);
        }
        break;
    }

    // Mark change as synced after resolution
    await this.markSynced(change.id);
  }

  /**
   * Update local data with server data
   */
  private async updateLocal(dataType: string, serverData: any): Promise<void> {
    // This would integrate with your local state management (Redux, Zustand, etc.)
    // For now, we'll just log
    console.log(`Updating local ${dataType} with server data:`, serverData);
  }

  /**
   * Force update server with local data
   */
  private async forceUpdateServer(change: OfflineChange): Promise<void> {
    const endpoint = '/api/v1/sync/force';

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: change.type,
        data: change.data,
        timestamp: change.timestamp.toISOString(),
      }),
    });
  }

  /**
   * Merge watchlist changes
   */
  private async mergeWatchlist(change: OfflineChange, serverData: any): Promise<void> {
    // Union for add, intersection for remove
    const localItems = change.data.items || [];
    const serverItems = serverData.items || [];

    if (change.type === 'watchlist:add') {
      // Union: all unique items
      const merged = Array.from(new Set([...localItems, ...serverItems]));
      await this.updateLocal('watchlist', { items: merged });
      await this.forceUpdateServer({ ...change, data: { items: merged } });
    } else {
      // Intersection: only items in both
      const merged = localItems.filter((item: string) => serverItems.includes(item));
      await this.updateLocal('watchlist', { items: merged });
      await this.forceUpdateServer({ ...change, data: { items: merged } });
    }
  }

  /**
   * Mark change as synced
   */
  private async markSynced(changeId: string): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['offline_changes'], 'readwrite');
    const store = transaction.objectStore('offline_changes');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(changeId);

      getRequest.onsuccess = () => {
        const change = getRequest.result;
        if (change) {
          change.synced = true;
          delete change.error;

          const putRequest = store.put(change);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Mark change with error
   */
  private async markError(changeId: string, error: string): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['offline_changes'], 'readwrite');
    const store = transaction.objectStore('offline_changes');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(changeId);

      getRequest.onsuccess = () => {
        const change = getRequest.result;
        if (change) {
          change.error = error;

          const putRequest = store.put(change);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Clear synced changes from database
   */
  async clearSyncedChanges(): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['offline_changes'], 'readwrite');
    const store = transaction.objectStore('offline_changes');

    return new Promise((resolve, reject) => {
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const changes = getAllRequest.result as OfflineChange[];
        const synced = changes.filter((c) => c.synced);

        let deleted = 0;
        for (const change of synced) {
          const deleteRequest = store.delete(change.id);
          deleteRequest.onsuccess = () => {
            deleted++;
            if (deleted === synced.length) {
              resolve();
            }
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        }

        if (synced.length === 0) {
          resolve();
        }
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  /**
   * Enable or disable auto-sync
   */
  setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;

    if (enabled && navigator.onLine && this.syncInterval === null) {
      this.syncInterval = window.setInterval(() => {
        this.sync();
      }, 5 * 60 * 1000);
    } else if (!enabled && this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Open IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ntv-offline', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('offline_changes')) {
          db.createObjectStore('offline_changes', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
