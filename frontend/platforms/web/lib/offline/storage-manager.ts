/**
 * Storage Manager for Offline Media
 *
 * Handles quota management, LRU eviction, and storage estimation.
 */

import type { DownloadItem } from './download-manager';

export interface StorageQuota {
  usage: number;
  quota: number;
  percentage: number;
}

export interface EvictionCandidate {
  id: string;
  contentId: string;
  title: string;
  size: number;
  lastAccessed: Date;
  priority: number; // Higher = keep longer
}

class StorageManager {
  private maxQuotaMobile = 10 * 1024 * 1024 * 1024; // 10GB
  private maxQuotaDesktop = 50 * 1024 * 1024 * 1024; // 50GB
  private evictionThreshold = 0.9; // Evict when 90% full

  /**
   * Get current storage quota and usage
   */
  async getQuota(): Promise<StorageQuota> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        usage: 0,
        quota: this.getDefaultQuota(),
        percentage: 0,
      };
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || this.getDefaultQuota();

    return {
      usage,
      quota,
      percentage: Math.round((usage / quota) * 100),
    };
  }

  /**
   * Get default quota based on device type
   */
  private getDefaultQuota(): number {
    // Simple heuristic: mobile if touch-capable and narrow screen
    const isMobile =
      'ontouchstart' in window && window.innerWidth < 768;

    return isMobile ? this.maxQuotaMobile : this.maxQuotaDesktop;
  }

  /**
   * Check if there's enough space for a download
   */
  async hasSpace(sizeBytes: number): Promise<boolean> {
    const quota = await this.getQuota();
    const available = quota.quota - quota.usage;
    return available >= sizeBytes;
  }

  /**
   * Check if eviction is needed
   */
  async needsEviction(): Promise<boolean> {
    const quota = await this.getQuota();
    return quota.percentage >= this.evictionThreshold * 100;
  }

  /**
   * Get eviction candidates sorted by priority (lowest first)
   *
   * Priority calculation:
   * - Pinned: Never evict (priority = Infinity)
   * - In Progress: Never evict (priority = Infinity)
   * - Completed + Watched: Low priority (priority = days since watched)
   * - Completed + Old: Medium priority (priority = days since completed / 2)
   */
  async getEvictionCandidates(downloads: DownloadItem[]): Promise<EvictionCandidate[]> {
    const candidates: EvictionCandidate[] = [];

    for (const item of downloads) {
      if (item.pinned || item.status === 'downloading' || item.status === 'queued') {
        continue; // Never evict pinned or in-progress
      }

      if (item.status !== 'completed') {
        continue; // Only evict completed downloads
      }

      const lastAccessed = await this.getLastAccessed(item.contentId);
      const daysSinceAccess = lastAccessed
        ? Math.floor((Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const daysSinceCompleted = item.completedAt
        ? Math.floor((Date.now() - item.completedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Priority: watched content ages faster
      const priority = lastAccessed
        ? daysSinceAccess // Watched content priority based on last access
        : daysSinceCompleted / 2; // Unwatched content priority based on completion

      candidates.push({
        id: item.id,
        contentId: item.contentId,
        title: item.title,
        size: item.size || item.bytesDownloaded,
        lastAccessed: lastAccessed || item.completedAt || item.addedAt,
        priority,
      });
    }

    // Sort by priority (lowest first = first to evict)
    return candidates.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evict downloads until space is available
   */
  async evict(targetBytes: number, downloads: DownloadItem[]): Promise<string[]> {
    const evicted: string[] = [];
    let freedBytes = 0;

    const candidates = await this.getEvictionCandidates(downloads);

    for (const candidate of candidates) {
      if (freedBytes >= targetBytes) break;

      evicted.push(candidate.id);
      freedBytes += candidate.size;

      // Remove from cache
      await this.removeFromCache(candidate.contentId);
    }

    return evicted;
  }

  /**
   * Remove content from cache
   */
  private async removeFromCache(contentId: string): Promise<void> {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('ntv-offline')) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        for (const request of keys) {
          if (request.url.includes(contentId)) {
            await cache.delete(request);
          }
        }
      }
    }

    // Remove metadata from IndexedDB
    await this.removeMetadata(contentId);
  }

  /**
   * Get last accessed time for content
   */
  private async getLastAccessed(contentId: string): Promise<Date | null> {
    if (typeof indexedDB === 'undefined') return null;

    const db = await this.openDatabase();
    const transaction = db.transaction(['media'], 'readonly');
    const store = transaction.objectStore('media');
    const request = store.get(contentId);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const data = request.result;
        resolve(data?.lastAccessed ? new Date(data.lastAccessed) : null);
      };
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Update last accessed time for content
   */
  async updateLastAccessed(contentId: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await this.openDatabase();
    const transaction = db.transaction(['media'], 'readwrite');
    const store = transaction.objectStore('media');

    const data = {
      contentId,
      lastAccessed: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove metadata for content
   */
  private async removeMetadata(contentId: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await this.openDatabase();
    const transaction = db.transaction(['media'], 'readwrite');
    const store = transaction.objectStore('media');

    return new Promise((resolve, reject) => {
      const request = store.delete(contentId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Open IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ntv-offline', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('downloads')) {
          db.createObjectStore('downloads', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'contentId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all offline content (for testing/debugging)
   */
  async clearAll(): Promise<void> {
    // Clear all caches
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('ntv-offline')) {
        await caches.delete(cacheName);
      }
    }

    // Clear IndexedDB
    if (typeof indexedDB !== 'undefined') {
      const db = await this.openDatabase();
      const transaction = db.transaction(['downloads', 'media'], 'readwrite');

      await new Promise((resolve, reject) => {
        const request1 = transaction.objectStore('downloads').clear();
        request1.onsuccess = () => resolve(undefined);
        request1.onerror = () => reject(request1.error);
      });

      await new Promise((resolve, reject) => {
        const request2 = transaction.objectStore('media').clear();
        request2.onsuccess = () => resolve(undefined);
        request2.onerror = () => reject(request2.error);
      });
    }
  }
}

// Singleton instance
export const storageManager = new StorageManager();
