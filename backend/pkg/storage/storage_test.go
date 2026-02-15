package storage

import (
	"bytes"
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLocalStorage(t *testing.T) {
	// Create temp directory for tests
	tmpDir := t.TempDir()
	storage, err := NewLocalStorage(tmpDir)
	require.NoError(t, err)
	require.NotNil(t, storage)

	ctx := context.Background()

	t.Run("Put and Get", func(t *testing.T) {
		key := "test/file.txt"
		content := []byte("Hello, World!")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		reader, err := storage.Get(ctx, key)
		require.NoError(t, err)
		defer reader.Close()

		data, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Equal(t, content, data)
	})

	t.Run("Exists", func(t *testing.T) {
		key := "test/exists.txt"
		content := []byte("test")

		exists, err := storage.Exists(ctx, key)
		assert.NoError(t, err)
		assert.False(t, exists)

		err = storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		exists, err = storage.Exists(ctx, key)
		assert.NoError(t, err)
		assert.True(t, exists)
	})

	t.Run("Delete", func(t *testing.T) {
		key := "test/delete.txt"
		content := []byte("to be deleted")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		err = storage.Delete(ctx, key)
		assert.NoError(t, err)

		exists, err := storage.Exists(ctx, key)
		assert.NoError(t, err)
		assert.False(t, exists)
	})

	t.Run("List", func(t *testing.T) {
		// Create multiple files
		keys := []string{
			"test/list/file1.txt",
			"test/list/file2.txt",
			"test/list/subdir/file3.txt",
		}
		for _, key := range keys {
			err := storage.Put(ctx, key, bytes.NewReader([]byte("test")), 4, "text/plain")
			assert.NoError(t, err)
		}

		// List all files with prefix
		results, err := storage.List(ctx, "test/list")
		assert.NoError(t, err)
		assert.Len(t, results, 3)
	})

	t.Run("URL", func(t *testing.T) {
		key := "test/url.txt"
		content := []byte("test")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		url, err := storage.URL(ctx, key, 1*time.Hour)
		assert.NoError(t, err)
		assert.True(t, strings.HasPrefix(url, "file://"))
		assert.Contains(t, url, "test/url.txt")
	})

	t.Run("Stream with offset", func(t *testing.T) {
		key := "test/stream.txt"
		content := []byte("0123456789")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Read bytes 5-9 (5 bytes starting at offset 5)
		reader, err := storage.Stream(ctx, key, 5, 5)
		require.NoError(t, err)
		defer reader.Close()

		data, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Equal(t, []byte("56789"), data)
	})

	t.Run("Stream without length", func(t *testing.T) {
		key := "test/stream2.txt"
		content := []byte("0123456789")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Read from offset 5 to end
		reader, err := storage.Stream(ctx, key, 5, 0)
		require.NoError(t, err)
		defer reader.Close()

		data, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Equal(t, []byte("56789"), data)
	})

	t.Run("Get non-existent file", func(t *testing.T) {
		_, err := storage.Get(ctx, "nonexistent/file.txt")
		assert.Error(t, err)
	})

	t.Run("Delete non-existent file", func(t *testing.T) {
		err := storage.Delete(ctx, "nonexistent/file.txt")
		assert.NoError(t, err) // Should not error
	})
}

func TestNewFactory(t *testing.T) {
	tmpDir := t.TempDir()

	t.Run("Create local storage", func(t *testing.T) {
		cfg := Config{
			Backend:   "local",
			LocalPath: tmpDir,
		}

		storage, err := New(cfg)
		assert.NoError(t, err)
		assert.NotNil(t, storage)

		// Verify it's a LocalStorage
		_, ok := storage.(*LocalStorage)
		assert.True(t, ok)
	})

	t.Run("Create S3 storage", func(t *testing.T) {
		cfg := Config{
			Backend:     "s3",
			S3Endpoint:  "http://localhost:9000",
			S3Region:    "us-east-1",
			S3AccessKey: "minioadmin",
			S3SecretKey: "minioadmin",
			S3Bucket:    "test-bucket",
			S3PathStyle: true,
		}

		storage, err := New(cfg)
		// May fail if MinIO not running, but should create the instance
		if err == nil {
			assert.NotNil(t, storage)
			_, ok := storage.(*S3Storage)
			assert.True(t, ok)
		}
	})

	t.Run("Create hybrid storage", func(t *testing.T) {
		cfg := Config{
			Backend:       "hybrid",
			LocalPath:     tmpDir,
			S3Endpoint:    "http://localhost:9000",
			S3Region:      "us-east-1",
			S3AccessKey:   "minioadmin",
			S3SecretKey:   "minioadmin",
			S3Bucket:      "test-bucket",
			S3PathStyle:   true,
			HybridWorkers: 2,
		}

		storage, err := New(cfg)
		// May fail if MinIO not running, but should create the instance
		if err == nil {
			assert.NotNil(t, storage)
			hybrid, ok := storage.(*HybridStorage)
			assert.True(t, ok)
			if hybrid != nil {
				hybrid.Close() // Clean up workers
			}
		}
	})

	t.Run("Unknown backend returns error", func(t *testing.T) {
		cfg := Config{
			Backend:   "unknown",
			LocalPath: tmpDir,
		}

		storage, err := New(cfg)
		assert.Error(t, err)
		assert.Nil(t, storage)
		assert.Contains(t, err.Error(), "unknown storage backend")
	})
}

func TestLocalStorageEdgeCases(t *testing.T) {
	tmpDir := t.TempDir()
	storage, err := NewLocalStorage(tmpDir)
	require.NoError(t, err)

	ctx := context.Background()

	t.Run("Create nested directories", func(t *testing.T) {
		key := "a/b/c/d/e/file.txt"
		content := []byte("nested")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Verify file exists
		fullPath := filepath.Join(tmpDir, key)
		_, err = os.Stat(fullPath)
		assert.NoError(t, err)
	})

	t.Run("List empty prefix", func(t *testing.T) {
		results, err := storage.List(ctx, "nonexistent/prefix")
		assert.NoError(t, err)
		assert.Empty(t, results)
	})

	t.Run("URL for non-existent file", func(t *testing.T) {
		_, err := storage.URL(ctx, "nonexistent.txt", 1*time.Hour)
		assert.Error(t, err)
	})

	t.Run("Stream non-existent file", func(t *testing.T) {
		_, err := storage.Stream(ctx, "nonexistent.txt", 0, 0)
		assert.Error(t, err)
	})

	t.Run("Empty content", func(t *testing.T) {
		key := "empty.txt"
		content := []byte("")

		err := storage.Put(ctx, key, bytes.NewReader(content), 0, "text/plain")
		assert.NoError(t, err)

		reader, err := storage.Get(ctx, key)
		require.NoError(t, err)
		defer reader.Close()

		data, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Empty(t, data)
	})
}

func TestNewLocalStorageCreatesDirectory(t *testing.T) {
	tmpDir := t.TempDir()
	newDir := filepath.Join(tmpDir, "new", "storage", "path")

	// Directory doesn't exist yet
	_, err := os.Stat(newDir)
	assert.True(t, os.IsNotExist(err))

	// NewLocalStorage should create it
	storage, err := NewLocalStorage(newDir)
	assert.NoError(t, err)
	assert.NotNil(t, storage)

	// Directory should now exist
	info, err := os.Stat(newDir)
	assert.NoError(t, err)
	assert.True(t, info.IsDir())
}
