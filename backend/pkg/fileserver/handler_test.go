package fileserver

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockStorage implements Storage interface for testing
type mockStorage struct {
	files map[string][]byte
}

func newMockStorage() *mockStorage {
	return &mockStorage{
		files: make(map[string][]byte),
	}
}

func (m *mockStorage) addFile(key string, content []byte) {
	m.files[key] = content
}

func (m *mockStorage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	content, ok := m.files[key]
	if !ok {
		return nil, fmt.Errorf("file not found")
	}
	return io.NopCloser(bytes.NewReader(content)), nil
}

func (m *mockStorage) Stream(ctx context.Context, key string, offset, length int64) (io.ReadCloser, error) {
	content, ok := m.files[key]
	if !ok {
		return nil, fmt.Errorf("file not found")
	}

	if offset >= int64(len(content)) {
		return io.NopCloser(bytes.NewReader([]byte{})), nil
	}

	end := int64(len(content))
	if length > 0 && offset+length < end {
		end = offset + length
	}

	return io.NopCloser(bytes.NewReader(content[offset:end])), nil
}

func (m *mockStorage) Exists(ctx context.Context, key string) (bool, error) {
	_, ok := m.files[key]
	return ok, nil
}

func TestHandler(t *testing.T) {
	storage := newMockStorage()
	storage.addFile("videos/test.mp4", []byte("0123456789"))

	handler, err := New(Config{
		Storage: storage,
	})
	require.NoError(t, err)

	t.Run("GET full file", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/videos/test.mp4", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "0123456789", w.Body.String())
		assert.Equal(t, "video/mp4", w.Header().Get("Content-Type"))
		assert.Equal(t, "bytes", w.Header().Get("Accept-Ranges"))
	})

	t.Run("HEAD request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodHead, "/videos/test.mp4", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Empty(t, w.Body.String())
	})

	t.Run("GET with Range header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/videos/test.mp4", nil)
		req.Header.Set("Range", "bytes=5-9")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusPartialContent, w.Code)
		assert.Equal(t, "56789", w.Body.String())
		assert.Equal(t, "bytes 5-9/*", w.Header().Get("Content-Range"))
		assert.Equal(t, "5", w.Header().Get("Content-Length"))
	})

	t.Run("GET with open-ended Range", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/videos/test.mp4", nil)
		req.Header.Set("Range", "bytes=5-")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusPartialContent, w.Code)
		assert.Equal(t, "56789", w.Body.String())
	})

	t.Run("Non-existent file returns 404", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/nonexistent.mp4", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("POST method not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/videos/test.mp4", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("Empty path returns bad request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Invalid Range header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/videos/test.mp4", nil)
		req.Header.Set("Range", "invalid")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusRequestedRangeNotSatisfiable, w.Code)
	})
}

func TestHandlerWithAllowedPaths(t *testing.T) {
	storage := newMockStorage()
	storage.addFile("public/file.mp4", []byte("public content"))
	storage.addFile("private/file.mp4", []byte("private content"))

	handler, err := New(Config{
		Storage:      storage,
		AllowedPaths: []string{"public/"},
	})
	require.NoError(t, err)

	t.Run("Allowed path is accessible", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/public/file.mp4", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "public content", w.Body.String())
	})

	t.Run("Restricted path is forbidden", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/private/file.mp4", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestNew(t *testing.T) {
	t.Run("Requires storage", func(t *testing.T) {
		handler, err := New(Config{})
		assert.Error(t, err)
		assert.Nil(t, handler)
		assert.Contains(t, err.Error(), "storage is required")
	})

	t.Run("Creates handler with storage", func(t *testing.T) {
		storage := newMockStorage()
		handler, err := New(Config{
			Storage: storage,
		})
		require.NoError(t, err)
		assert.NotNil(t, handler)
	})
}

func TestParseRange(t *testing.T) {
	tests := []struct {
		name          string
		rangeHeader   string
		expectOffset  int64
		expectLength  int64
		expectError   bool
	}{
		{
			name:         "Valid range with end",
			rangeHeader:  "bytes=0-1023",
			expectOffset: 0,
			expectLength: 1024,
		},
		{
			name:         "Valid range without end",
			rangeHeader:  "bytes=1024-",
			expectOffset: 1024,
			expectLength: 0,
		},
		{
			name:         "Valid range in middle",
			rangeHeader:  "bytes=100-199",
			expectOffset: 100,
			expectLength: 100,
		},
		{
			name:        "Invalid prefix",
			rangeHeader: "invalid=0-1023",
			expectError: true,
		},
		{
			name:        "Invalid format",
			rangeHeader: "bytes=invalid",
			expectError: true,
		},
		{
			name:        "Invalid start",
			rangeHeader: "bytes=abc-100",
			expectError: true,
		},
		{
			name:        "Invalid end",
			rangeHeader: "bytes=0-abc",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			offset, length, err := parseRange(tt.rangeHeader)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectOffset, offset)
				assert.Equal(t, tt.expectLength, length)
			}
		})
	}
}

func TestDetectContentType(t *testing.T) {
	tests := []struct {
		filename    string
		contentType string
	}{
		{"video.mp4", "video/mp4"},
		{"video.mkv", "video/x-matroska"},
		{"audio.mp3", "audio/mpeg"},
		{"audio.flac", "audio/flac"},
		{"image.jpg", "image/jpeg"},
		{"image.png", "image/png"},
		{"unknown.xyz", "application/octet-stream"},
	}

	for _, tt := range tests {
		t.Run(tt.filename, func(t *testing.T) {
			ct := detectContentType(tt.filename)
			assert.Equal(t, tt.contentType, ct)
		})
	}
}

func TestFormatContentRange(t *testing.T) {
	tests := []struct {
		name     string
		start    int64
		end      int64
		total    int64
		expected string
	}{
		{
			name:     "With total size",
			start:    0,
			end:      1023,
			total:    10000,
			expected: "bytes 0-1023/10000",
		},
		{
			name:     "Without total size",
			start:    100,
			end:      199,
			total:    -1,
			expected: "bytes 100-199/*",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatContentRange(tt.start, tt.end, tt.total)
			assert.Equal(t, tt.expected, result)
		})
	}
}
