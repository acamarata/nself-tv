package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"library_service/internal/parser"
	"library_service/internal/pipeline"
	"library_service/internal/scanner"
	"library_service/internal/search"
)

// Handlers holds all HTTP handler dependencies.
type Handlers struct {
	db       *sql.DB
	scanner  *scanner.Scanner
	meili    *search.MeiliClient
	pipeline *pipeline.IngestPipeline
	logger   *logrus.Logger
}

// NewHandlers creates a new Handlers instance with all dependencies.
func NewHandlers(db *sql.DB, scanner *scanner.Scanner, meili *search.MeiliClient, pipeline *pipeline.IngestPipeline, logger *logrus.Logger) *Handlers {
	return &Handlers{
		db:       db,
		scanner:  scanner,
		meili:    meili,
		pipeline: pipeline,
		logger:   logger,
	}
}

// healthResponse is the JSON body returned by the health endpoint.
type healthResponse struct {
	Status    string `json:"status"`
	Service   string `json:"service"`
	Timestamp string `json:"timestamp"`
}

// HealthHandler returns the service health status.
// GET /health
func (h *Handlers) HealthHandler(c *gin.Context) {
	// Quick database ping to verify connectivity.
	status := "healthy"
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	if err := h.db.PingContext(ctx); err != nil {
		status = "degraded"
		h.logger.WithError(err).Warn("Database health check failed")
	}

	c.JSON(http.StatusOK, healthResponse{
		Status:    status,
		Service:   "library_service",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

// scanRequest is the JSON body for a scan request.
type scanRequest struct {
	Path string `json:"path" binding:"required"`
}

// scanResult is the JSON body returned after scanning.
type scanResult struct {
	Path       string            `json:"path"`
	FilesFound int               `json:"files_found"`
	Files      []scannedFileInfo `json:"files"`
}

type scannedFileInfo struct {
	Path    string              `json:"path"`
	Name    string              `json:"name"`
	Size    int64               `json:"size"`
	ModTime string              `json:"mod_time"`
	Parsed  *parser.ParsedMedia `json:"parsed"`
}

// ScanHandler scans a directory for media files and parses their filenames.
// POST /api/v1/scan
func (h *Handlers) ScanHandler(c *gin.Context) {
	var req scanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: path is required"})
		return
	}

	h.logger.WithField("path", req.Path).Info("Starting directory scan")

	files, err := h.scanner.ScanDirectory(req.Path)
	if err != nil {
		h.logger.WithError(err).Error("Scan failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := scanResult{
		Path:       req.Path,
		FilesFound: len(files),
		Files:      make([]scannedFileInfo, 0, len(files)),
	}

	for _, f := range files {
		parsed := parser.ParseFilename(f.Name)
		result.Files = append(result.Files, scannedFileInfo{
			Path:    f.Path,
			Name:    f.Name,
			Size:    f.Size,
			ModTime: f.ModTime.Format(time.RFC3339),
			Parsed:  parsed,
		})
	}

	h.logger.WithField("files_found", len(files)).Info("Scan complete")
	c.JSON(http.StatusOK, result)
}

// statsResponse is the JSON body returned by the stats endpoint.
type statsResponse struct {
	TotalMedia    int    `json:"total_media"`
	TotalMovies   int    `json:"total_movies"`
	TotalTVShows  int    `json:"total_tv_shows"`
	TotalDuration float64 `json:"total_duration_seconds"`
	LastUpdated   string `json:"last_updated"`
}

// StatsHandler returns library statistics.
// GET /api/v1/stats
func (h *Handlers) StatsHandler(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	var stats statsResponse

	err := h.db.QueryRowContext(ctx,
		`SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE type = 'movie') AS movies,
			COUNT(*) FILTER (WHERE type = 'tv') AS tv_shows,
			COALESCE(SUM(duration), 0) AS total_duration,
			COALESCE(MAX(updated_at)::text, '') AS last_updated
		FROM media_items`,
	).Scan(&stats.TotalMedia, &stats.TotalMovies, &stats.TotalTVShows, &stats.TotalDuration, &stats.LastUpdated)

	if err != nil {
		h.logger.WithError(err).Error("Failed to query stats")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ingestRequest is the JSON body for an ingest request.
type ingestRequest struct {
	UploadPath   string `json:"upload_path" binding:"required"`
	FamilyID     string `json:"family_id" binding:"required"`
	Title        string `json:"title" binding:"required"`
	Year         int    `json:"year,omitempty"`
	Type         string `json:"type" binding:"required"`
	SourceBucket string `json:"source_bucket,omitempty"`
	SourceKey    string `json:"source_key,omitempty"`
}

// IngestHandler starts a VOD ingest pipeline for a media file.
// POST /api/v1/ingest
func (h *Handlers) IngestHandler(c *gin.Context) {
	var req ingestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: upload_path, family_id, title, and type are required"})
		return
	}

	if req.Type != "movie" && req.Type != "tv" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'movie' or 'tv'"})
		return
	}

	pipelineReq := pipeline.IngestRequest{
		UploadPath:   req.UploadPath,
		FamilyID:     req.FamilyID,
		Title:        req.Title,
		Year:         req.Year,
		Type:         req.Type,
		SourceBucket: req.SourceBucket,
		SourceKey:    req.SourceKey,
	}

	h.logger.WithFields(logrus.Fields{
		"title":     req.Title,
		"type":      req.Type,
		"family_id": req.FamilyID,
	}).Info("Starting ingest pipeline")

	// Run the pipeline in a background goroutine so the HTTP request returns immediately.
	resultCh := make(chan *pipeline.IngestResult, 1)
	go func() {
		result, err := h.pipeline.IngestMedia(context.Background(), pipelineReq)
		if err != nil {
			h.logger.WithError(err).Error("Ingest pipeline failed")
		}
		resultCh <- result
	}()

	// Wait briefly to capture the ingest ID, or return accepted.
	select {
	case result := <-resultCh:
		if result != nil {
			c.JSON(http.StatusAccepted, gin.H{
				"ingest_id": result.IngestID,
				"status":    result.Status,
				"message":   "Ingest pipeline started",
			})
			return
		}
	case <-time.After(500 * time.Millisecond):
		// Pipeline is still initializing; return accepted without ingest_id.
	}

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "accepted",
		"message": "Ingest pipeline started, check back for status",
	})
}

// IngestStatusHandler retrieves the current status of an ingest pipeline.
// GET /api/v1/ingest/:ingestId/status
func (h *Handlers) IngestStatusHandler(c *gin.Context) {
	ingestID := c.Param("ingestId")
	if ingestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ingestId is required"})
		return
	}

	progress, err := h.pipeline.GetProgress(c.Request.Context(), ingestID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, progress)
}

// mediaListItem is a compact representation of a media item for list views.
type mediaListItem struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Year      int     `json:"year"`
	Type      string  `json:"type"`
	Duration  float64 `json:"duration"`
	Quality   string  `json:"quality"`
	PosterURL string  `json:"poster_url"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
}

// MediaListHandler returns a paginated list of media items.
// GET /api/v1/media
func (h *Handlers) MediaListHandler(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Parse query parameters.
	mediaType := c.Query("type")
	searchQuery := c.Query("q")

	// If there is a search query, delegate to MeiliSearch.
	if searchQuery != "" {
		filters := map[string]interface{}{}
		if mediaType != "" {
			filters["type"] = mediaType
		}

		results, err := h.meili.SearchMedia(searchQuery, filters)
		if err != nil {
			h.logger.WithError(err).Error("Search failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"results":         results.Hits,
			"total":           results.EstimatedTotalHits,
			"query":           results.Query,
			"processing_time": results.ProcessingTimeMs,
		})
		return
	}

	// Otherwise, query PostgreSQL directly.
	query := `
		SELECT id, title, year, type, duration,
			CASE
				WHEN height >= 2160 THEN '2160p'
				WHEN height >= 1080 THEN '1080p'
				WHEN height >= 720 THEN '720p'
				WHEN height >= 480 THEN '480p'
				ELSE 'unknown'
			END AS quality,
			COALESCE(poster_url, '') AS poster_url,
			status,
			created_at
		FROM media_items
		WHERE ($1 = '' OR type = $1)
		ORDER BY created_at DESC
		LIMIT 100`

	rows, err := h.db.QueryContext(ctx, query, mediaType)
	if err != nil {
		h.logger.WithError(err).Error("Failed to query media list")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve media"})
		return
	}
	defer rows.Close()

	items := make([]mediaListItem, 0)
	for rows.Next() {
		var item mediaListItem
		var createdAt time.Time
		if err := rows.Scan(&item.ID, &item.Title, &item.Year, &item.Type, &item.Duration,
			&item.Quality, &item.PosterURL, &item.Status, &createdAt); err != nil {
			h.logger.WithError(err).Error("Failed to scan media row")
			continue
		}
		item.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		h.logger.WithError(err).Error("Error iterating media rows")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve media"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results": items,
		"total":   len(items),
	})
}

// mediaDetail is the full representation of a single media item.
type mediaDetail struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Year        int     `json:"year"`
	Type        string  `json:"type"`
	FamilyID    string  `json:"family_id"`
	Duration    float64 `json:"duration"`
	Width       int     `json:"width"`
	Height      int     `json:"height"`
	VideoCodec  string  `json:"video_codec"`
	AudioCodec  string  `json:"audio_codec"`
	Bitrate     int64   `json:"bitrate"`
	FrameRate   string  `json:"frame_rate"`
	HLSUrl      string  `json:"hls_url"`
	PosterURL   string  `json:"poster_url"`
	SourcePath  string  `json:"source_path"`
	Status      string  `json:"status"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// MediaDetailHandler returns detailed information about a single media item.
// GET /api/v1/media/:id
func (h *Handlers) MediaDetailHandler(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "media id is required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	query := `
		SELECT id, title, year, type, family_id,
			duration, width, height, video_codec, audio_codec,
			bitrate, frame_rate, COALESCE(hls_url, '') AS hls_url,
			COALESCE(poster_url, '') AS poster_url, source_path,
			status, created_at, updated_at
		FROM media_items
		WHERE id = $1`

	var detail mediaDetail
	var createdAt, updatedAt time.Time
	err := h.db.QueryRowContext(ctx, query, id).Scan(
		&detail.ID, &detail.Title, &detail.Year, &detail.Type, &detail.FamilyID,
		&detail.Duration, &detail.Width, &detail.Height, &detail.VideoCodec, &detail.AudioCodec,
		&detail.Bitrate, &detail.FrameRate, &detail.HLSUrl,
		&detail.PosterURL, &detail.SourcePath,
		&detail.Status, &createdAt, &updatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "media not found"})
			return
		}
		h.logger.WithError(err).Error("Failed to query media detail")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve media"})
		return
	}

	detail.CreatedAt = createdAt.Format(time.RFC3339)
	detail.UpdatedAt = updatedAt.Format(time.RFC3339)

	c.JSON(http.StatusOK, detail)
}
