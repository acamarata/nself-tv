package storage

import (
	"context"
	"fmt"
	"io"
	"time"
)

// Storage defines the interface for all storage backends
type Storage interface {
	// Put uploads data to storage
	Put(ctx context.Context, key string, data io.Reader, size int64, contentType string) error

	// Get retrieves data from storage
	Get(ctx context.Context, key string) (io.ReadCloser, error)

	// Delete removes data from storage
	Delete(ctx context.Context, key string) error

	// List returns keys matching the prefix
	List(ctx context.Context, prefix string) ([]string, error)

	// Exists checks if a key exists
	Exists(ctx context.Context, key string) (bool, error)

	// URL generates a presigned/public URL for the key
	URL(ctx context.Context, key string, expiry time.Duration) (string, error)

	// Stream returns a reader for streaming large files with Range support
	Stream(ctx context.Context, key string, offset, length int64) (io.ReadCloser, error)
}

// Config holds storage backend configuration
type Config struct {
	Backend       string // "local", "s3", "hybrid"
	LocalPath     string // Local filesystem path
	S3Endpoint    string // S3 endpoint URL (e.g., "http://localhost:9000" for MinIO)
	S3Bucket      string // S3 bucket name
	S3AccessKey   string // S3 access key
	S3SecretKey   string // S3 secret key
	S3Region      string // S3 region (default: "us-east-1")
	S3PathStyle   bool   // Use path-style URLs (required for MinIO)
	HybridWorkers int    // Number of async sync workers for hybrid mode (default: 4)
}

// New creates a storage backend based on config
func New(cfg Config) (Storage, error) {
	switch cfg.Backend {
	case "local":
		return NewLocalStorage(cfg.LocalPath)

	case "s3":
		return NewS3Storage(
			cfg.S3Endpoint,
			cfg.S3Region,
			cfg.S3AccessKey,
			cfg.S3SecretKey,
			cfg.S3Bucket,
			cfg.S3PathStyle,
		)

	case "hybrid":
		local, err := NewLocalStorage(cfg.LocalPath)
		if err != nil {
			return nil, fmt.Errorf("failed to create local storage for hybrid: %w", err)
		}

		s3, err := NewS3Storage(
			cfg.S3Endpoint,
			cfg.S3Region,
			cfg.S3AccessKey,
			cfg.S3SecretKey,
			cfg.S3Bucket,
			cfg.S3PathStyle,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create S3 storage for hybrid: %w", err)
		}

		return NewHybridStorage(local, s3, cfg.HybridWorkers)

	default:
		return nil, fmt.Errorf("unknown storage backend: %s", cfg.Backend)
	}
}
