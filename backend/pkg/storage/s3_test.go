package storage

import (
	"bytes"
	"context"
	"io"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Helper to check if MinIO is available
func isMinIOAvailable() bool {
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "http://localhost:9000"
	}
	// Try to create a client
	storage, err := NewS3Storage(
		endpoint,
		"us-east-1",
		"minioadmin",
		"minioadmin",
		"test-bucket",
		true,
	)
	return err == nil && storage != nil
}

func TestS3Storage(t *testing.T) {
	if !isMinIOAvailable() {
		t.Skip("MinIO not available, skipping S3 tests")
	}

	storage, err := NewS3Storage(
		"http://localhost:9000",
		"us-east-1",
		"minioadmin",
		"minioadmin",
		"test-bucket",
		true,
	)
	require.NoError(t, err)
	require.NotNil(t, storage)

	ctx := context.Background()

	t.Run("Put and Get", func(t *testing.T) {
		key := "test/s3-file.txt"
		content := []byte("Hello from S3!")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		reader, err := storage.Get(ctx, key)
		require.NoError(t, err)
		defer reader.Close()

		data, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Equal(t, content, data)

		// Cleanup
		_ = storage.Delete(ctx, key)
	})

	t.Run("Exists", func(t *testing.T) {
		key := "test/s3-exists.txt"
		content := []byte("test")

		exists, err := storage.Exists(ctx, key)
		assert.NoError(t, err)
		assert.False(t, exists)

		err = storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		exists, err = storage.Exists(ctx, key)
		assert.NoError(t, err)
		assert.True(t, exists)

		// Cleanup
		_ = storage.Delete(ctx, key)
	})

	t.Run("Delete", func(t *testing.T) {
		key := "test/s3-delete.txt"
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
		prefix := "test/s3-list/"
		keys := []string{
			prefix + "file1.txt",
			prefix + "file2.txt",
			prefix + "subdir/file3.txt",
		}

		// Create files
		for _, key := range keys {
			err := storage.Put(ctx, key, bytes.NewReader([]byte("test")), 4, "text/plain")
			assert.NoError(t, err)
		}

		// List files
		results, err := storage.List(ctx, prefix)
		assert.NoError(t, err)
		assert.GreaterOrEqual(t, len(results), 3)

		// Cleanup
		for _, key := range keys {
			_ = storage.Delete(ctx, key)
		}
	})

	t.Run("URL", func(t *testing.T) {
		key := "test/s3-url.txt"
		content := []byte("test")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		url, err := storage.URL(ctx, key, 1*time.Hour)
		assert.NoError(t, err)
		assert.NotEmpty(t, url)
		assert.Contains(t, url, key)

		// Cleanup
		_ = storage.Delete(ctx, key)
	})

	t.Run("Stream with Range", func(t *testing.T) {
		key := "test/s3-stream.txt"
		content := []byte("0123456789")

		err := storage.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Read bytes 5-9
		reader, err := storage.Stream(ctx, key, 5, 5)
		require.NoError(t, err)
		defer reader.Close()

		data, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Equal(t, []byte("56789"), data)

		// Cleanup
		_ = storage.Delete(ctx, key)
	})
}

func TestNewS3Storage(t *testing.T) {
	t.Run("Missing bucket name", func(t *testing.T) {
		storage, err := NewS3Storage(
			"http://localhost:9000",
			"us-east-1",
			"minioadmin",
			"minioadmin",
			"", // Empty bucket
			true,
		)
		assert.Error(t, err)
		assert.Nil(t, storage)
		assert.Contains(t, err.Error(), "bucket name is required")
	})

	t.Run("With endpoint", func(t *testing.T) {
		storage, err := NewS3Storage(
			"http://localhost:9000",
			"us-east-1",
			"minioadmin",
			"minioadmin",
			"test-bucket",
			true,
		)
		// May fail if MinIO not running, but should create instance if credentials valid
		if err == nil {
			assert.NotNil(t, storage)
			assert.Equal(t, "test-bucket", storage.bucket)
			assert.Equal(t, "http://localhost:9000", storage.endpoint)
		}
	})
}
