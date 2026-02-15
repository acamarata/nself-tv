package storage

import (
	"bytes"
	"context"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHybridStorage(t *testing.T) {
	if !isMinIOAvailable() {
		t.Skip("MinIO not available, skipping Hybrid tests")
	}

	tmpDir := t.TempDir()

	local, err := NewLocalStorage(tmpDir)
	require.NoError(t, err)

	s3, err := NewS3Storage(
		"http://localhost:9000",
		"us-east-1",
		"minioadmin",
		"minioadmin",
		"test-bucket",
		true,
	)
	require.NoError(t, err)

	hybrid, err := NewHybridStorage(local, s3, 2)
	require.NoError(t, err)
	require.NotNil(t, hybrid)
	defer hybrid.Close()

	ctx := context.Background()

	t.Run("Put writes to local immediately", func(t *testing.T) {
		key := "test/hybrid-put.txt"
		content := []byte("Hybrid content")

		err := hybrid.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Should be in local immediately
		exists, err := local.Exists(ctx, key)
		assert.NoError(t, err)
		assert.True(t, exists)

		// Wait a bit for async sync to S3
		time.Sleep(100 * time.Millisecond)

		// Should also be in S3 eventually
		exists, err = s3.Exists(ctx, key)
		if err == nil {
			assert.True(t, exists)
		}

		// Cleanup
		_ = hybrid.Delete(ctx, key)
	})

	t.Run("Get prefers local, falls back to S3", func(t *testing.T) {
		key := "test/hybrid-get.txt"
		content := []byte("Get test")

		// Put directly to S3 (not in local)
		err := s3.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Get should find it in S3
		reader, err := hybrid.Get(ctx, key)
		require.NoError(t, err)
		defer reader.Close()

		data, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Equal(t, content, data)

		// Cleanup
		_ = hybrid.Delete(ctx, key)
	})

	t.Run("Delete removes from both", func(t *testing.T) {
		key := "test/hybrid-delete.txt"
		content := []byte("to be deleted")

		// Put to both
		err := local.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)
		err = s3.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Delete via hybrid
		err = hybrid.Delete(ctx, key)
		assert.NoError(t, err)

		// Should be gone from both
		exists, _ := local.Exists(ctx, key)
		assert.False(t, exists)
		exists, _ = s3.Exists(ctx, key)
		assert.False(t, exists)
	})

	t.Run("List merges from both backends", func(t *testing.T) {
		prefix := "test/hybrid-list/"

		// Put one file to local only
		localKey := prefix + "local.txt"
		err := local.Put(ctx, localKey, bytes.NewReader([]byte("local")), 5, "text/plain")
		assert.NoError(t, err)

		// Put one file to S3 only
		s3Key := prefix + "s3.txt"
		err = s3.Put(ctx, s3Key, bytes.NewReader([]byte("s3")), 2, "text/plain")
		assert.NoError(t, err)

		// List should return both
		results, err := hybrid.List(ctx, prefix)
		assert.NoError(t, err)
		assert.GreaterOrEqual(t, len(results), 2)

		// Cleanup
		_ = hybrid.Delete(ctx, localKey)
		_ = hybrid.Delete(ctx, s3Key)
	})

	t.Run("Exists checks both backends", func(t *testing.T) {
		key := "test/hybrid-exists.txt"
		content := []byte("test")

		// Not in either
		exists, err := hybrid.Exists(ctx, key)
		assert.NoError(t, err)
		assert.False(t, exists)

		// Put to local only
		err = local.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Should exist
		exists, err = hybrid.Exists(ctx, key)
		assert.NoError(t, err)
		assert.True(t, exists)

		// Cleanup
		_ = hybrid.Delete(ctx, key)
	})

	t.Run("URL prefers S3 when available", func(t *testing.T) {
		key := "test/hybrid-url.txt"
		content := []byte("test")

		// Put to both
		err := local.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)
		err = s3.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// URL should be from S3 (presigned URL)
		url, err := hybrid.URL(ctx, key, 1*time.Hour)
		assert.NoError(t, err)
		assert.NotEmpty(t, url)
		// S3 URL should not start with "file://"
		assert.NotContains(t, url, "file://")

		// Cleanup
		_ = hybrid.Delete(ctx, key)
	})

	t.Run("Stream prefers local", func(t *testing.T) {
		key := "test/hybrid-stream.txt"
		content := []byte("0123456789")

		// Put to local
		err := local.Put(ctx, key, bytes.NewReader(content), int64(len(content)), "text/plain")
		assert.NoError(t, err)

		// Stream should use local
		reader, err := hybrid.Stream(ctx, key, 5, 5)
		require.NoError(t, err)
		defer reader.Close()

		data, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Equal(t, []byte("56789"), data)

		// Cleanup
		_ = hybrid.Delete(ctx, key)
	})
}

func TestNewHybridStorage(t *testing.T) {
	tmpDir := t.TempDir()

	t.Run("Requires local storage", func(t *testing.T) {
		s3, _ := NewS3Storage(
			"http://localhost:9000",
			"us-east-1",
			"minioadmin",
			"minioadmin",
			"test-bucket",
			true,
		)

		hybrid, err := NewHybridStorage(nil, s3, 2)
		assert.Error(t, err)
		assert.Nil(t, hybrid)
		assert.Contains(t, err.Error(), "local storage is required")
	})

	t.Run("Requires S3 storage", func(t *testing.T) {
		local, err := NewLocalStorage(tmpDir)
		require.NoError(t, err)

		hybrid, err := NewHybridStorage(local, nil, 2)
		assert.Error(t, err)
		assert.Nil(t, hybrid)
		assert.Contains(t, err.Error(), "s3 storage is required")
	})

	t.Run("Defaults to 4 workers when maxWorkers <= 0", func(t *testing.T) {
		if !isMinIOAvailable() {
			t.Skip("MinIO not available")
		}

		local, err := NewLocalStorage(tmpDir)
		require.NoError(t, err)

		s3, err := NewS3Storage(
			"http://localhost:9000",
			"us-east-1",
			"minioadmin",
			"minioadmin",
			"test-bucket",
			true,
		)
		require.NoError(t, err)

		hybrid, err := NewHybridStorage(local, s3, 0)
		require.NoError(t, err)
		require.NotNil(t, hybrid)
		defer hybrid.Close()

		assert.Equal(t, 4, hybrid.maxWorkers)
	})

	t.Run("Close waits for workers", func(t *testing.T) {
		if !isMinIOAvailable() {
			t.Skip("MinIO not available")
		}

		local, err := NewLocalStorage(tmpDir)
		require.NoError(t, err)

		s3, err := NewS3Storage(
			"http://localhost:9000",
			"us-east-1",
			"minioadmin",
			"minioadmin",
			"test-bucket",
			true,
		)
		require.NoError(t, err)

		hybrid, err := NewHybridStorage(local, s3, 2)
		require.NoError(t, err)

		// Close should not hang
		err = hybrid.Close()
		assert.NoError(t, err)
	})
}
