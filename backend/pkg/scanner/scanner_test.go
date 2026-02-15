package scanner

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScanner(t *testing.T) {
	tmpDir := t.TempDir()

	// Create test files
	testFiles := map[string]MediaType{
		"videos/movie.mp4":      MediaTypeVideo,
		"videos/show.mkv":       MediaTypeVideo,
		"music/song.mp3":        MediaTypeAudio,
		"music/album/track.flac": MediaTypeAudio,
		"images/photo.jpg":      MediaTypeImage,
		"documents/readme.txt":  "", // Should be ignored
	}

	for path := range testFiles {
		fullPath := filepath.Join(tmpDir, path)
		err := os.MkdirAll(filepath.Dir(fullPath), 0755)
		require.NoError(t, err)
		err = os.WriteFile(fullPath, []byte("test content"), 0644)
		require.NoError(t, err)
	}

	scanner, err := New(Config{
		BasePath: tmpDir,
		Workers:  2,
	})
	require.NoError(t, err)
	require.NotNil(t, scanner)

	t.Run("Scan finds all media files", func(t *testing.T) {
		ctx := context.Background()
		files, errs := scanner.Scan(ctx)

		var found []MediaFile
		for file := range files {
			found = append(found, file)
		}

		// Check for errors
		for err := range errs {
			t.Fatalf("Unexpected error: %v", err)
		}

		// Should find 5 media files (not the .txt file)
		assert.Len(t, found, 5)

		// Verify types
		typeCount := make(map[MediaType]int)
		for _, file := range found {
			typeCount[file.Type]++
			assert.Greater(t, file.Size, int64(0))
			assert.NotEmpty(t, file.Extension)
		}

		assert.Equal(t, 2, typeCount[MediaTypeVideo])
		assert.Equal(t, 2, typeCount[MediaTypeAudio])
		assert.Equal(t, 1, typeCount[MediaTypeImage])
	})

	t.Run("ScanWithFilter filters files", func(t *testing.T) {
		ctx := context.Background()

		// Filter only video files
		files, errs := scanner.ScanWithFilter(ctx, func(f MediaFile) bool {
			return f.Type == MediaTypeVideo
		})

		var found []MediaFile
		for file := range files {
			found = append(found, file)
		}

		for err := range errs {
			t.Fatalf("Unexpected error: %v", err)
		}

		// Should find only 2 video files
		assert.Len(t, found, 2)
		for _, file := range found {
			assert.Equal(t, MediaTypeVideo, file.Type)
		}
	})

	t.Run("ScanParallel scans multiple directories", func(t *testing.T) {
		ctx := context.Background()

		dirs := []string{
			filepath.Join(tmpDir, "videos"),
			filepath.Join(tmpDir, "music"),
		}

		files, errs := scanner.ScanParallel(ctx, dirs)

		var found []MediaFile
		for file := range files {
			found = append(found, file)
		}

		for err := range errs {
			t.Fatalf("Unexpected error: %v", err)
		}

		// Should find 4 files (2 videos + 2 audio)
		assert.Len(t, found, 4)
	})

	t.Run("Context cancellation stops scan", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		files, errs := scanner.Scan(ctx)

		// Drain channels
		for range files {
		}

		var gotError bool
		for err := range errs {
			if err == context.Canceled {
				gotError = true
			}
		}

		// Should get context canceled error
		assert.True(t, gotError)
	})
}

func TestNew(t *testing.T) {
	t.Run("Requires basePath", func(t *testing.T) {
		scanner, err := New(Config{})
		assert.Error(t, err)
		assert.Nil(t, scanner)
		assert.Contains(t, err.Error(), "basePath is required")
	})

	t.Run("Defaults workers to 4", func(t *testing.T) {
		tmpDir := t.TempDir()
		scanner, err := New(Config{
			BasePath: tmpDir,
			Workers:  0,
		})
		require.NoError(t, err)
		assert.Equal(t, 4, scanner.workers)
	})

	t.Run("Creates scanner with custom workers", func(t *testing.T) {
		tmpDir := t.TempDir()
		scanner, err := New(Config{
			BasePath: tmpDir,
			Workers:  8,
		})
		require.NoError(t, err)
		assert.Equal(t, 8, scanner.workers)
	})
}

func TestMediaTypeDetection(t *testing.T) {
	tmpDir := t.TempDir()

	tests := []struct {
		filename  string
		mediaType MediaType
	}{
		{"video.mp4", MediaTypeVideo},
		{"video.mkv", MediaTypeVideo},
		{"video.avi", MediaTypeVideo},
		{"audio.mp3", MediaTypeAudio},
		{"audio.flac", MediaTypeAudio},
		{"image.jpg", MediaTypeImage},
		{"image.png", MediaTypeImage},
		{"VIDEO.MP4", MediaTypeVideo}, // Test case insensitivity
	}

	for _, tt := range tests {
		t.Run(tt.filename, func(t *testing.T) {
			// Create test file
			fullPath := filepath.Join(tmpDir, tt.filename)
			err := os.WriteFile(fullPath, []byte("test"), 0644)
			require.NoError(t, err)

			scanner, err := New(Config{
				BasePath: tmpDir,
			})
			require.NoError(t, err)

			ctx := context.Background()
			files, errs := scanner.Scan(ctx)

			var found MediaFile
			for file := range files {
				if filepath.Base(file.Path) == tt.filename {
					found = file
					break
				}
			}

			for err := range errs {
				t.Fatalf("Unexpected error: %v", err)
			}

			assert.Equal(t, tt.mediaType, found.Type)

			// Cleanup
			os.Remove(fullPath)
		})
	}
}

func TestScannerEdgeCases(t *testing.T) {
	tmpDir := t.TempDir()

	t.Run("Empty directory", func(t *testing.T) {
		emptyDir := filepath.Join(tmpDir, "empty")
		err := os.MkdirAll(emptyDir, 0755)
		require.NoError(t, err)

		scanner, err := New(Config{
			BasePath: emptyDir,
		})
		require.NoError(t, err)

		ctx := context.Background()
		files, errs := scanner.Scan(ctx)

		var found []MediaFile
		for file := range files {
			found = append(found, file)
		}

		for err := range errs {
			t.Fatalf("Unexpected error: %v", err)
		}

		assert.Empty(t, found)
	})

	t.Run("Non-existent directory", func(t *testing.T) {
		scanner, err := New(Config{
			BasePath: "/nonexistent/path",
		})
		require.NoError(t, err)

		ctx := context.Background()
		files, errs := scanner.Scan(ctx)

		var found []MediaFile
		for file := range files {
			found = append(found, file)
		}

		// Drain errors (may or may not have errors depending on OS)
		for range errs {
		}

		// Should find no files
		assert.Empty(t, found)
	})
}
