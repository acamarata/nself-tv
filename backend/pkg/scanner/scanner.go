package scanner

import (
	"context"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
	"sync"
)

// MediaType represents the type of media file
type MediaType string

const (
	MediaTypeVideo MediaType = "video"
	MediaTypeAudio MediaType = "audio"
	MediaTypeImage MediaType = "image"
)

// MediaFile represents a discovered media file
type MediaFile struct {
	Path      string    `json:"path"`
	Type      MediaType `json:"type"`
	Size      int64     `json:"size"`
	Extension string    `json:"extension"`
}

// Scanner scans directories for media files
type Scanner struct {
	basePath string
	workers  int
	videoExts map[string]bool
	audioExts map[string]bool
	imageExts map[string]bool
}

// Config holds scanner configuration
type Config struct {
	BasePath string
	Workers  int
}

// New creates a new media scanner
func New(cfg Config) (*Scanner, error) {
	if cfg.BasePath == "" {
		return nil, fmt.Errorf("basePath is required")
	}

	workers := cfg.Workers
	if workers <= 0 {
		workers = 4
	}

	return &Scanner{
		basePath: cfg.BasePath,
		workers:  workers,
		videoExts: map[string]bool{
			".mp4": true, ".mkv": true, ".avi": true, ".mov": true,
			".wmv": true, ".flv": true, ".webm": true, ".m4v": true,
			".mpg": true, ".mpeg": true, ".3gp": true, ".ts": true,
		},
		audioExts: map[string]bool{
			".mp3": true, ".flac": true, ".wav": true, ".aac": true,
			".m4a": true, ".ogg": true, ".wma": true, ".alac": true,
			".ape": true, ".opus": true,
		},
		imageExts: map[string]bool{
			".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
			".bmp": true, ".webp": true, ".tiff": true, ".svg": true,
		},
	}, nil
}

// Scan scans the base path for media files
func (s *Scanner) Scan(ctx context.Context) (<-chan MediaFile, <-chan error) {
	files := make(chan MediaFile, 100)
	errs := make(chan error, 1)

	go func() {
		defer close(files)
		defer close(errs)

		if err := s.scanDir(ctx, s.basePath, files); err != nil {
			errs <- err
		}
	}()

	return files, errs
}

func (s *Scanner) scanDir(ctx context.Context, dir string, files chan<- MediaFile) error {
	return filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err != nil {
			// Skip directories we can't read
			return nil
		}

		// Skip directories
		if d.IsDir() {
			return nil
		}

		// Check if it's a media file
		ext := strings.ToLower(filepath.Ext(path))
		var mediaType MediaType

		if s.videoExts[ext] {
			mediaType = MediaTypeVideo
		} else if s.audioExts[ext] {
			mediaType = MediaTypeAudio
		} else if s.imageExts[ext] {
			mediaType = MediaTypeImage
		} else {
			// Not a media file
			return nil
		}

		// Get file info
		info, err := d.Info()
		if err != nil {
			return nil
		}

		// Send media file
		files <- MediaFile{
			Path:      path,
			Type:      mediaType,
			Size:      info.Size(),
			Extension: ext,
		}

		return nil
	})
}

// ScanWithFilter scans with a custom filter function
func (s *Scanner) ScanWithFilter(ctx context.Context, filter func(MediaFile) bool) (<-chan MediaFile, <-chan error) {
	inputFiles, inputErrs := s.Scan(ctx)
	files := make(chan MediaFile, 100)
	errs := make(chan error, 1)

	go func() {
		defer close(files)
		defer close(errs)

		for file := range inputFiles {
			if filter(file) {
				files <- file
			}
		}

		// Forward errors
		for err := range inputErrs {
			errs <- err
		}
	}()

	return files, errs
}

// ScanParallel scans directories in parallel using multiple workers
func (s *Scanner) ScanParallel(ctx context.Context, dirs []string) (<-chan MediaFile, <-chan error) {
	files := make(chan MediaFile, 100)
	errs := make(chan error, s.workers)

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, s.workers)

	wg.Add(len(dirs))

	for _, dir := range dirs {
		go func(d string) {
			defer wg.Done()

			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			if err := s.scanDir(ctx, d, files); err != nil {
				select {
				case errs <- err:
				default:
					// Error channel full
				}
			}
		}(dir)
	}

	// Close channels when all workers done
	go func() {
		wg.Wait()
		close(files)
		close(errs)
	}()

	return files, errs
}
