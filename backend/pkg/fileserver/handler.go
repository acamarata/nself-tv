package fileserver

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// Storage interface for retrieving files
type Storage interface {
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	Stream(ctx context.Context, key string, offset, length int64) (io.ReadCloser, error)
	Exists(ctx context.Context, key string) (bool, error)
}

// Handler handles HTTP requests for serving files
type Handler struct {
	storage      Storage
	allowedPaths map[string]bool
}

// Config holds handler configuration
type Config struct {
	Storage      Storage
	AllowedPaths []string // Optional: restrict serving to specific prefixes
}

// New creates a new file serving handler
func New(cfg Config) (*Handler, error) {
	if cfg.Storage == nil {
		return nil, fmt.Errorf("storage is required")
	}

	allowed := make(map[string]bool)
	for _, path := range cfg.AllowedPaths {
		allowed[path] = true
	}

	return &Handler{
		storage:      cfg.Storage,
		allowedPaths: allowed,
	}, nil
}

// ServeHTTP handles file serving requests with Range support
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Only allow GET and HEAD requests
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get file path from URL
	key := strings.TrimPrefix(r.URL.Path, "/")
	if key == "" {
		http.Error(w, "File path required", http.StatusBadRequest)
		return
	}

	// Check if path is allowed
	if len(h.allowedPaths) > 0 && !h.isPathAllowed(key) {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Check if file exists
	exists, err := h.storage.Exists(r.Context(), key)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Determine content type
	contentType := detectContentType(key)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Accept-Ranges", "bytes")

	// Handle Range request
	rangeHeader := r.Header.Get("Range")
	if rangeHeader != "" {
		h.serveRange(w, r, key, rangeHeader)
	} else {
		h.serveFull(w, r, key)
	}
}

func (h *Handler) isPathAllowed(key string) bool {
	for allowedPath := range h.allowedPaths {
		if strings.HasPrefix(key, allowedPath) {
			return true
		}
	}
	return false
}

func (h *Handler) serveFull(w http.ResponseWriter, r *http.Request, key string) {
	reader, err := h.storage.Get(r.Context(), key)
	if err != nil {
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}
	defer reader.Close()

	// For HEAD requests, don't send body
	if r.Method == http.MethodHead {
		return
	}

	// Stream file to response
	_, err = io.Copy(w, reader)
	if err != nil {
		// Can't write error here as headers already sent
		return
	}
}

func (h *Handler) serveRange(w http.ResponseWriter, r *http.Request, key string, rangeHeader string) {
	// Parse Range header
	offset, length, err := parseRange(rangeHeader)
	if err != nil {
		http.Error(w, "Invalid Range header", http.StatusRequestedRangeNotSatisfiable)
		return
	}

	// Get file size (we need this for Content-Range header)
	// For now, we'll use -1 as size (unknown) and serve the range
	reader, err := h.storage.Stream(r.Context(), key, offset, length)
	if err != nil {
		http.Error(w, "Failed to stream file", http.StatusInternalServerError)
		return
	}
	defer reader.Close()

	// Set headers for partial content
	w.Header().Set("Content-Range", formatContentRange(offset, offset+length-1, -1))
	if length > 0 {
		w.Header().Set("Content-Length", strconv.FormatInt(length, 10))
	}
	w.WriteHeader(http.StatusPartialContent)

	// For HEAD requests, don't send body
	if r.Method == http.MethodHead {
		return
	}

	// Stream range to response
	_, err = io.Copy(w, reader)
	if err != nil {
		// Can't write error here as headers already sent
		return
	}
}

// parseRange parses HTTP Range header (e.g., "bytes=0-1023")
// Returns offset and length
func parseRange(rangeHeader string) (offset int64, length int64, err error) {
	// Expected format: "bytes=start-end" or "bytes=start-"
	if !strings.HasPrefix(rangeHeader, "bytes=") {
		return 0, 0, fmt.Errorf("invalid range header format")
	}

	rangeSpec := strings.TrimPrefix(rangeHeader, "bytes=")
	parts := strings.Split(rangeSpec, "-")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("invalid range specification")
	}

	// Parse start
	start, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("invalid range start")
	}

	offset = start

	// Parse end (optional)
	if parts[1] != "" {
		end, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil {
			return 0, 0, fmt.Errorf("invalid range end")
		}
		length = end - start + 1
	} else {
		// Read to end (length = 0)
		length = 0
	}

	return offset, length, nil
}

// formatContentRange formats Content-Range header
func formatContentRange(start, end, total int64) string {
	if total >= 0 {
		return fmt.Sprintf("bytes %d-%d/%d", start, end, total)
	}
	return fmt.Sprintf("bytes %d-%d/*", start, end)
}

// detectContentType determines MIME type from file extension
func detectContentType(key string) string {
	ext := strings.ToLower(key[strings.LastIndex(key, "."):])

	contentTypes := map[string]string{
		".mp4":  "video/mp4",
		".mkv":  "video/x-matroska",
		".webm": "video/webm",
		".avi":  "video/x-msvideo",
		".mov":  "video/quicktime",
		".mp3":  "audio/mpeg",
		".flac": "audio/flac",
		".wav":  "audio/wav",
		".m4a":  "audio/mp4",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".webp": "image/webp",
	}

	if ct, ok := contentTypes[ext]; ok {
		return ct
	}

	return "application/octet-stream"
}
