package scanner

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// MediaFile represents a discovered media file on disk.
type MediaFile struct {
	Path    string    `json:"path"`
	Name    string    `json:"name"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"mod_time"`
}

// videoExtensions is the set of recognized video file extensions.
var videoExtensions = map[string]bool{
	".mp4":  true,
	".mkv":  true,
	".avi":  true,
	".mov":  true,
	".m4v":  true,
	".webm": true,
	".ts":   true,
	".flv":  true,
}

// Scanner walks directories to discover media files.
type Scanner struct{}

// NewScanner creates a new Scanner instance.
func NewScanner() *Scanner {
	return &Scanner{}
}

// ScanDirectory recursively walks the given rootPath and returns all recognized
// video files found within it. Non-video files and unreadable directories are
// silently skipped.
func (s *Scanner) ScanDirectory(rootPath string) ([]MediaFile, error) {
	info, err := os.Stat(rootPath)
	if err != nil {
		return nil, fmt.Errorf("cannot access directory %q: %w", rootPath, err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("%q is not a directory", rootPath)
	}

	var files []MediaFile

	err = filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			// Skip directories we can't read.
			return nil
		}
		if info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(info.Name()))
		if videoExtensions[ext] {
			files = append(files, MediaFile{
				Path:    path,
				Name:    info.Name(),
				Size:    info.Size(),
				ModTime: info.ModTime(),
			})
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("error walking directory %q: %w", rootPath, err)
	}

	return files, nil
}

// IsVideoFile checks whether the given filename has a recognized video extension.
func IsVideoFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return videoExtensions[ext]
}
