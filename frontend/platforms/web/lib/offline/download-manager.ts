/**
 * Download Manager for Offline Media
 *
 * Handles queuing, downloading, pausing, and resuming media for offline playback.
 * Uses Cache API for storage and AbortController for pause/resume.
 */

export interface DownloadItem {
  id: string;
  contentId: string;
  title: string;
  url: string;
  size?: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number; // 0-100
  bytesDownloaded: number;
  error?: string;
  pinned: boolean;
  addedAt: Date;
  completedAt?: Date;
}

export interface DownloadProgress {
  id: string;
  loaded: number;
  total: number;
  percentage: number;
}

export type DownloadCallback = (progress: DownloadProgress) => void;

class DownloadManager {
  private queue: Map<string, DownloadItem> = new Map();
  private activeDownloads: Map<string, AbortController> = new Map();
  private cacheName = 'ntv-offline-media';
  private maxConcurrent = 2;
  private callbacks: Map<string, DownloadCallback> = new Map();

  constructor() {
    this.loadQueue();
  }

  /**
   * Load download queue from IndexedDB
   */
  private async loadQueue(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await this.openDatabase();
    const transaction = db.transaction(['downloads'], 'readonly');
    const store = transaction.objectStore('downloads');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        request.result.forEach((item: DownloadItem) => {
          this.queue.set(item.id, item);
        });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save download queue to IndexedDB
   */
  private async saveQueue(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await this.openDatabase();
    const transaction = db.transaction(['downloads'], 'readwrite');
    const store = transaction.objectStore('downloads');

    // Clear and repopulate
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve(undefined);
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    for (const item of this.queue.values()) {
      await new Promise((resolve, reject) => {
        const request = store.add(item);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
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
   * Add media to download queue
   */
  async add(contentId: string, title: string, url: string, pinned = false): Promise<string> {
    const id = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const item: DownloadItem = {
      id,
      contentId,
      title,
      url,
      status: 'queued',
      progress: 0,
      bytesDownloaded: 0,
      pinned,
      addedAt: new Date(),
    };

    this.queue.set(id, item);
    await this.saveQueue();
    this.processQueue();

    return id;
  }

  /**
   * Process download queue (up to maxConcurrent downloads)
   */
  private async processQueue(): Promise<void> {
    const activeCount = this.activeDownloads.size;
    if (activeCount >= this.maxConcurrent) return;

    // Find next queued item
    const queuedItem = Array.from(this.queue.values()).find(
      (item) => item.status === 'queued'
    );

    if (!queuedItem) return;

    await this.download(queuedItem.id);
    this.processQueue(); // Process next
  }

  /**
   * Download a specific item
   */
  private async download(id: string): Promise<void> {
    const item = this.queue.get(id);
    if (!item || item.status !== 'queued') return;

    item.status = 'downloading';
    await this.saveQueue();

    const controller = new AbortController();
    this.activeDownloads.set(id, controller);

    try {
      const response = await fetch(item.url, {
        signal: controller.signal,
        headers: item.bytesDownloaded > 0
          ? { Range: `bytes=${item.bytesDownloaded}-` }
          : {},
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength
        ? parseInt(contentLength, 10) + item.bytesDownloaded
        : 0;

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = item.bytesDownloaded;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loaded += value.length;

        item.bytesDownloaded = loaded;
        item.progress = total > 0 ? Math.round((loaded / total) * 100) : 0;

        if (this.callbacks.has(id)) {
          this.callbacks.get(id)!({
            id,
            loaded,
            total,
            percentage: item.progress,
          });
        }

        await this.saveQueue();
      }

      // Combine chunks into blob
      const blob = new Blob(chunks);

      // Store in Cache API
      const cache = await caches.open(this.cacheName);
      const responseToCache = new Response(blob, {
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'video/mp4' },
      });
      await cache.put(item.url, responseToCache);

      item.status = 'completed';
      item.completedAt = new Date();
      await this.saveQueue();

      this.activeDownloads.delete(id);
      this.processQueue(); // Start next download
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        item.status = 'paused';
      } else {
        item.status = 'failed';
        item.error = (error as Error).message;
      }
      await this.saveQueue();
      this.activeDownloads.delete(id);
      this.processQueue();
    }
  }

  /**
   * Pause a download
   */
  async pause(id: string): Promise<void> {
    const controller = this.activeDownloads.get(id);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(id);
    }

    const item = this.queue.get(id);
    if (item && item.status === 'downloading') {
      item.status = 'paused';
      await this.saveQueue();
    }
  }

  /**
   * Resume a paused download
   */
  async resume(id: string): Promise<void> {
    const item = this.queue.get(id);
    if (item && item.status === 'paused') {
      item.status = 'queued';
      await this.saveQueue();
      this.processQueue();
    }
  }

  /**
   * Cancel and remove a download
   */
  async remove(id: string): Promise<void> {
    await this.pause(id);
    const item = this.queue.get(id);

    if (item) {
      // Remove from cache
      const cache = await caches.open(this.cacheName);
      await cache.delete(item.url);
    }

    this.queue.delete(id);
    this.callbacks.delete(id);
    await this.saveQueue();
  }

  /**
   * Get download item by ID
   */
  get(id: string): DownloadItem | undefined {
    return this.queue.get(id);
  }

  /**
   * Get all downloads
   */
  getAll(): DownloadItem[] {
    return Array.from(this.queue.values());
  }

  /**
   * Register progress callback
   */
  onProgress(id: string, callback: DownloadCallback): void {
    this.callbacks.set(id, callback);
  }

  /**
   * Unregister progress callback
   */
  offProgress(id: string): void {
    this.callbacks.delete(id);
  }

  /**
   * Check if content is available offline
   */
  async isAvailableOffline(url: string): Promise<boolean> {
    const cache = await caches.open(this.cacheName);
    const response = await cache.match(url);
    return response !== undefined;
  }

  /**
   * Get offline media URL
   */
  async getOfflineUrl(url: string): Promise<string | null> {
    const cache = await caches.open(this.cacheName);
    const response = await cache.match(url);
    if (!response) return null;

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  /**
   * Pin or unpin content (prevents eviction)
   */
  async setPin(id: string, pinned: boolean): Promise<void> {
    const item = this.queue.get(id);
    if (item) {
      item.pinned = pinned;
      await this.saveQueue();
    }
  }
}

// Singleton instance
export const downloadManager = new DownloadManager();
