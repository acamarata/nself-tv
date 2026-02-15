package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

// LocalStorage implements Storage interface for local filesystem
type LocalStorage struct {
	basePath string
}

// NewLocalStorage creates a new local filesystem storage backend
func NewLocalStorage(basePath string) (*LocalStorage, error) {
	// Create base directory if it doesn't exist
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	return &LocalStorage{
		basePath: basePath,
	}, nil
}

func (l *LocalStorage) Put(ctx context.Context, key string, data io.Reader, size int64, contentType string) error {
	fullPath := filepath.Join(l.basePath, key)

	// Create parent directories
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return fmt.Errorf("failed to create directories: %w", err)
	}

	// Create file
	file, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// Copy data
	if _, err := io.Copy(file, data); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

func (l *LocalStorage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	fullPath := filepath.Join(l.basePath, key)
	file, err := os.Open(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	return file, nil
}

func (l *LocalStorage) Delete(ctx context.Context, key string) error {
	fullPath := filepath.Join(l.basePath, key)
	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

func (l *LocalStorage) List(ctx context.Context, prefix string) ([]string, error) {
	searchPath := filepath.Join(l.basePath, prefix)
	var keys []string

	err := filepath.Walk(searchPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			relPath, err := filepath.Rel(l.basePath, path)
			if err != nil {
				return err
			}
			keys = append(keys, filepath.ToSlash(relPath))
		}
		return nil
	})

	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	return keys, nil
}

func (l *LocalStorage) Exists(ctx context.Context, key string) (bool, error) {
	fullPath := filepath.Join(l.basePath, key)
	_, err := os.Stat(fullPath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, fmt.Errorf("failed to check file existence: %w", err)
}

func (l *LocalStorage) URL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	// For local storage, return a file:// URL
	fullPath := filepath.Join(l.basePath, key)
	exists, err := l.Exists(ctx, key)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", fmt.Errorf("file not found: %s", key)
	}
	return "file://" + fullPath, nil
}

func (l *LocalStorage) Stream(ctx context.Context, key string, offset, length int64) (io.ReadCloser, error) {
	fullPath := filepath.Join(l.basePath, key)
	file, err := os.Open(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}

	// Seek to offset
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		file.Close()
		return nil, fmt.Errorf("failed to seek: %w", err)
	}

	// If length is specified, wrap in LimitReader
	if length > 0 {
		return &limitedReadCloser{
			Reader: io.LimitReader(file, length),
			Closer: file,
		}, nil
	}

	return file, nil
}

// limitedReadCloser wraps io.LimitReader with Close
type limitedReadCloser struct {
	io.Reader
	io.Closer
}
