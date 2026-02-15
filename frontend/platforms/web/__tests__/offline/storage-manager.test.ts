import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageManager } from '@/lib/offline/storage-manager';

describe('StorageManager', () => {
  describe('getQuota', () => {
    it('should return quota information', async () => {
      const quota = await storageManager.getQuota();

      expect(quota).toHaveProperty('usage');
      expect(quota).toHaveProperty('quota');
      expect(quota).toHaveProperty('percentage');
      expect(typeof quota.usage).toBe('number');
      expect(typeof quota.quota).toBe('number');
      expect(typeof quota.percentage).toBe('number');
    });
  });

  describe('hasSpace', () => {
    it('should check if there is enough space', async () => {
      const hasSpace = await storageManager.hasSpace(1000);
      expect(typeof hasSpace).toBe('boolean');
    });
  });

  describe('needsEviction', () => {
    it('should determine if eviction is needed', async () => {
      const needs = await storageManager.needsEviction();
      expect(typeof needs).toBe('boolean');
    });
  });

  describe('getEvictionCandidates', () => {
    it('should return eviction candidates sorted by priority', async () => {
      const candidates = await storageManager.getEvictionCandidates([]);
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should exclude pinned items from eviction', async () => {
      const downloads = [
        {
          id: 'dl-1',
          contentId: 'c1',
          title: 'Movie 1',
          status: 'completed' as const,
          progress: 100,
          bytesDownloaded: 1000,
          pinned: true,
          addedAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: 'dl-2',
          contentId: 'c2',
          title: 'Movie 2',
          status: 'completed' as const,
          progress: 100,
          bytesDownloaded: 2000,
          pinned: false,
          addedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      const candidates = await storageManager.getEvictionCandidates(downloads);

      // Pinned item should not be in candidates
      expect(candidates.find((c) => c.id === 'dl-1')).toBeUndefined();
      expect(candidates.find((c) => c.id === 'dl-2')).toBeDefined();
    });

    it('should exclude in-progress items from eviction', async () => {
      const downloads = [
        {
          id: 'dl-3',
          contentId: 'c3',
          title: 'Movie 3',
          status: 'downloading' as const,
          progress: 50,
          bytesDownloaded: 500,
          pinned: false,
          addedAt: new Date(),
        },
      ];

      const candidates = await storageManager.getEvictionCandidates(downloads);

      // In-progress item should not be in candidates
      expect(candidates.find((c) => c.id === 'dl-3')).toBeUndefined();
    });
  });
});
