package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"sync"
	"time"
)

// HybridStorage implements Storage interface with local primary and S3 backup
// Writes go to local first (fast), then async sync to S3 (durable)
// Reads prefer local (fast), fallback to S3 if missing
type HybridStorage struct {
	local      *LocalStorage
	s3         *S3Storage
	syncQueue  chan syncJob
	wg         sync.WaitGroup
	stopCh     chan struct{}
	maxWorkers int
}

type syncJob struct {
	key         string
	contentType string
}

// NewHybridStorage creates a new hybrid storage backend
func NewHybridStorage(local *LocalStorage, s3 *S3Storage, maxWorkers int) (*HybridStorage, error) {
	if local == nil {
		return nil, fmt.Errorf("local storage is required")
	}
	if s3 == nil {
		return nil, fmt.Errorf("s3 storage is required")
	}
	if maxWorkers <= 0 {
		maxWorkers = 4 // Default to 4 workers
	}

	h := &HybridStorage{
		local:      local,
		s3:         s3,
		syncQueue:  make(chan syncJob, 100),
		stopCh:     make(chan struct{}),
		maxWorkers: maxWorkers,
	}

	// Start background sync workers
	for i := 0; i < maxWorkers; i++ {
		h.wg.Add(1)
		go h.syncWorker()
	}

	return h, nil
}

// Close stops all background workers and waits for pending syncs
func (h *HybridStorage) Close() error {
	close(h.stopCh)
	close(h.syncQueue)
	h.wg.Wait()
	return nil
}

func (h *HybridStorage) syncWorker() {
	defer h.wg.Done()

	for {
		select {
		case <-h.stopCh:
			return
		case job, ok := <-h.syncQueue:
			if !ok {
				return
			}
			h.syncToS3(job)
		}
	}
}

func (h *HybridStorage) syncToS3(job syncJob) {
	ctx := context.Background()

	// Read from local storage
	reader, err := h.local.Get(ctx, job.key)
	if err != nil {
		log.Printf("HybridStorage: failed to read %s from local for sync: %v", job.key, err)
		return
	}
	defer reader.Close()

	// Upload to S3
	if err := h.s3.Put(ctx, job.key, reader, 0, job.contentType); err != nil {
		log.Printf("HybridStorage: failed to sync %s to S3: %v", job.key, err)
		return
	}

	log.Printf("HybridStorage: successfully synced %s to S3", job.key)
}

func (h *HybridStorage) Put(ctx context.Context, key string, data io.Reader, size int64, contentType string) error {
	// Write to local storage first (fast, synchronous)
	if err := h.local.Put(ctx, key, data, size, contentType); err != nil {
		return fmt.Errorf("failed to write to local storage: %w", err)
	}

	// Queue for async S3 sync
	select {
	case h.syncQueue <- syncJob{key: key, contentType: contentType}:
		// Successfully queued
	default:
		// Queue full, log warning but don't fail
		log.Printf("HybridStorage: sync queue full, skipping S3 sync for %s", key)
	}

	return nil
}

func (h *HybridStorage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	// Try local first (fast)
	reader, err := h.local.Get(ctx, key)
	if err == nil {
		return reader, nil
	}

	// Fallback to S3
	reader, err = h.s3.Get(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get from both local and S3: %w", err)
	}

	// Found in S3, download to local for future reads
	go h.downloadToLocal(key)

	return reader, nil
}

func (h *HybridStorage) downloadToLocal(key string) {
	ctx := context.Background()

	// Read from S3
	reader, err := h.s3.Get(ctx, key)
	if err != nil {
		log.Printf("HybridStorage: failed to download %s from S3 to local: %v", key, err)
		return
	}
	defer reader.Close()

	// Write to local
	if err := h.local.Put(ctx, key, reader, 0, "application/octet-stream"); err != nil {
		log.Printf("HybridStorage: failed to write %s to local cache: %v", key, err)
		return
	}

	log.Printf("HybridStorage: cached %s locally from S3", key)
}

func (h *HybridStorage) Delete(ctx context.Context, key string) error {
	// Delete from both local and S3
	var localErr, s3Err error

	localErr = h.local.Delete(ctx, key)
	s3Err = h.s3.Delete(ctx, key)

	// Return error only if both failed
	if localErr != nil && s3Err != nil {
		return fmt.Errorf("failed to delete from both local (%v) and S3 (%v)", localErr, s3Err)
	}

	return nil
}

func (h *HybridStorage) List(ctx context.Context, prefix string) ([]string, error) {
	// Get lists from both backends
	localKeys, localErr := h.local.List(ctx, prefix)
	s3Keys, s3Err := h.s3.List(ctx, prefix)

	// Merge and deduplicate
	keyMap := make(map[string]bool)
	for _, key := range localKeys {
		keyMap[key] = true
	}
	for _, key := range s3Keys {
		keyMap[key] = true
	}

	// Convert to slice
	var keys []string
	for key := range keyMap {
		keys = append(keys, key)
	}

	// Return error only if both backends failed
	if localErr != nil && s3Err != nil {
		return keys, fmt.Errorf("both backends failed: local (%v), S3 (%v)", localErr, s3Err)
	}

	return keys, nil
}

func (h *HybridStorage) Exists(ctx context.Context, key string) (bool, error) {
	// Check local first (fast)
	exists, err := h.local.Exists(ctx, key)
	if err == nil && exists {
		return true, nil
	}

	// Check S3
	exists, err = h.s3.Exists(ctx, key)
	if err != nil {
		return false, fmt.Errorf("failed to check existence: %w", err)
	}

	return exists, nil
}

func (h *HybridStorage) URL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	// Check where the file exists
	localExists, _ := h.local.Exists(ctx, key)
	s3Exists, _ := h.s3.Exists(ctx, key)

	if !localExists && !s3Exists {
		return "", fmt.Errorf("file not found: %s", key)
	}

	// Prefer S3 URL (works remotely, has expiry support)
	if s3Exists {
		return h.s3.URL(ctx, key, expiry)
	}

	// Fallback to local URL
	return h.local.URL(ctx, key, expiry)
}

func (h *HybridStorage) Stream(ctx context.Context, key string, offset, length int64) (io.ReadCloser, error) {
	// Try local first (fast)
	reader, err := h.local.Stream(ctx, key, offset, length)
	if err == nil {
		return reader, nil
	}

	// Fallback to S3
	reader, err = h.s3.Stream(ctx, key, offset, length)
	if err != nil {
		return nil, fmt.Errorf("failed to stream from both local and S3: %w", err)
	}

	// Found in S3, download to local for future streams
	go h.downloadToLocal(key)

	return reader, nil
}
