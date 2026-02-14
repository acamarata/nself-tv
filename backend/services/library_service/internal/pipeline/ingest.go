package pipeline

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"

	"library_service/internal/ffprobe"
	"library_service/internal/search"
)

// IngestRequest describes what to ingest and where it came from.
type IngestRequest struct {
	UploadPath   string `json:"upload_path" binding:"required"`
	FamilyID     string `json:"family_id" binding:"required"`
	Title        string `json:"title" binding:"required"`
	Year         int    `json:"year,omitempty"`
	Type         string `json:"type" binding:"required"` // "movie" or "tv"
	SourceBucket string `json:"source_bucket,omitempty"`
	SourceKey    string `json:"source_key,omitempty"`
}

// IngestResult is the outcome of a completed ingest pipeline.
type IngestResult struct {
	IngestID  string `json:"ingest_id"`
	MediaID   string `json:"media_id"`
	HLSUrl    string `json:"hls_url,omitempty"`
	Status    string `json:"status"`
	Error     string `json:"error,omitempty"`
}

// IngestProgress tracks the progress of an ongoing ingest.
type IngestProgress struct {
	IngestID    string `json:"ingest_id"`
	Status      string `json:"status"`
	Stage       string `json:"stage"`
	Progress    int    `json:"progress"`
	MediaID     string `json:"media_id,omitempty"`
	HLSUrl      string `json:"hls_url,omitempty"`
	Error       string `json:"error,omitempty"`
	StartedAt   string `json:"started_at"`
	CompletedAt string `json:"completed_at,omitempty"`
}

// Pipeline stages.
const (
	StageValidating         = "validating"
	StageTranscoding        = "transcoding"
	StageTrickplay          = "trickplay"
	StageSubtitleExtraction = "subtitle_extraction"
	StagePosterGeneration   = "poster_generation"
	StageIndexing           = "indexing"
	StageDatabase           = "database_insert"
	StageComplete           = "complete"
	StageFailed             = "failed"
)

// Job status constants returned by downstream services.
const (
	JobStatusPending    = "pending"
	JobStatusProcessing = "processing"
	JobStatusCompleted  = "completed"
	JobStatusFailed     = "failed"
)

// Downstream service URLs.
const (
	videoProcessorURL     = "http://video_processor:5005/api/v1/jobs"
	thumbnailGeneratorURL = "http://thumbnail_generator:5006/api/v1/jobs"
)

// jobResponse is the standard response from downstream microservices.
type jobResponse struct {
	JobID  string `json:"job_id"`
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
	Output struct {
		HLSUrl string `json:"hls_url,omitempty"`
	} `json:"output,omitempty"`
}

// IngestPipeline orchestrates the full VOD ingest workflow.
type IngestPipeline struct {
	db          *sql.DB
	rdb         *redis.Client
	meili       *search.MeiliClient
	httpClient  *http.Client
	logger      *logrus.Logger
}

// NewIngestPipeline creates a new pipeline orchestrator.
func NewIngestPipeline(db *sql.DB, rdb *redis.Client, meili *search.MeiliClient, logger *logrus.Logger) *IngestPipeline {
	return &IngestPipeline{
		db:    db,
		rdb:   rdb,
		meili: meili,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// IngestMedia runs the full ingest pipeline for a single media item.
// It is designed to be called in a goroutine for background processing.
func (p *IngestPipeline) IngestMedia(ctx context.Context, req IngestRequest) (*IngestResult, error) {
	ingestID := uuid.New().String()
	mediaID := uuid.New().String()

	progress := &IngestProgress{
		IngestID:  ingestID,
		Status:    "processing",
		Stage:     StageValidating,
		Progress:  0,
		StartedAt: time.Now().UTC().Format(time.RFC3339),
	}
	p.saveProgress(ctx, progress)

	log := p.logger.WithFields(logrus.Fields{
		"ingest_id": ingestID,
		"media_id":  mediaID,
		"title":     req.Title,
	})

	// Stage 1: Validate source with FFprobe.
	log.Info("Stage 1: Validating source file")
	progress.Stage = StageValidating
	progress.Progress = 5
	p.saveProgress(ctx, progress)

	mediaInfo, err := ffprobe.ProbeFileWithContext(ctx, req.UploadPath)
	if err != nil {
		return p.failIngest(ctx, progress, ingestID, mediaID, fmt.Sprintf("validation failed: %v", err))
	}
	if mediaInfo.VideoCodec == "" {
		return p.failIngest(ctx, progress, ingestID, mediaID, "no video stream found in source file")
	}
	log.WithField("duration", mediaInfo.Duration).Info("Source validated")

	// Stage 2: Submit transcode job.
	log.Info("Stage 2: Submitting transcode job")
	progress.Stage = StageTranscoding
	progress.Progress = 10
	p.saveProgress(ctx, progress)

	transcodeResp, err := p.submitJob(ctx, videoProcessorURL+"/transcode", map[string]interface{}{
		"input_path": req.UploadPath,
		"media_id":   mediaID,
		"family_id":  req.FamilyID,
		"profiles":   []string{"1080p", "720p", "480p"},
	})
	if err != nil {
		return p.failIngest(ctx, progress, ingestID, mediaID, fmt.Sprintf("transcode submission failed: %v", err))
	}

	// Poll transcode job until completion.
	hlsURL, err := p.pollJobUntilComplete(ctx, videoProcessorURL+"/"+transcodeResp.JobID+"/status", progress, 10, 50)
	if err != nil {
		return p.failIngest(ctx, progress, ingestID, mediaID, fmt.Sprintf("transcode failed: %v", err))
	}
	log.WithField("hls_url", hlsURL).Info("Transcode complete")

	// Stage 3: Submit trickplay generation job.
	log.Info("Stage 3: Submitting trickplay job")
	progress.Stage = StageTrickplay
	progress.Progress = 55
	p.saveProgress(ctx, progress)

	trickplayResp, err := p.submitJob(ctx, videoProcessorURL+"/trickplay", map[string]interface{}{
		"input_path": req.UploadPath,
		"media_id":   mediaID,
		"family_id":  req.FamilyID,
		"interval":   10,
	})
	if err != nil {
		// Trickplay failure is non-fatal; log and continue.
		log.WithError(err).Warn("Trickplay submission failed (non-fatal)")
	} else {
		if _, err := p.pollJobUntilComplete(ctx, videoProcessorURL+"/"+trickplayResp.JobID+"/status", progress, 55, 65); err != nil {
			log.WithError(err).Warn("Trickplay generation failed (non-fatal)")
		}
	}

	// Stage 4: Submit subtitle extraction job.
	log.Info("Stage 4: Submitting subtitle extraction job")
	progress.Stage = StageSubtitleExtraction
	progress.Progress = 70
	p.saveProgress(ctx, progress)

	if len(mediaInfo.SubtitleStreams) > 0 {
		subtitleResp, err := p.submitJob(ctx, videoProcessorURL+"/subtitle-extract", map[string]interface{}{
			"input_path": req.UploadPath,
			"media_id":   mediaID,
			"family_id":  req.FamilyID,
			"streams":    mediaInfo.SubtitleStreams,
		})
		if err != nil {
			log.WithError(err).Warn("Subtitle extraction submission failed (non-fatal)")
		} else {
			if _, err := p.pollJobUntilComplete(ctx, videoProcessorURL+"/"+subtitleResp.JobID+"/status", progress, 70, 75); err != nil {
				log.WithError(err).Warn("Subtitle extraction failed (non-fatal)")
			}
		}
	} else {
		log.Info("No subtitle streams found, skipping extraction")
	}

	// Stage 5: Submit poster/thumbnail generation.
	log.Info("Stage 5: Submitting poster generation job")
	progress.Stage = StagePosterGeneration
	progress.Progress = 78
	p.saveProgress(ctx, progress)

	posterResp, err := p.submitJob(ctx, thumbnailGeneratorURL+"/poster", map[string]interface{}{
		"input_path": req.UploadPath,
		"media_id":   mediaID,
		"family_id":  req.FamilyID,
		"timestamps": []string{"10%", "25%", "50%"},
	})
	if err != nil {
		log.WithError(err).Warn("Poster generation submission failed (non-fatal)")
	} else {
		if _, err := p.pollJobUntilComplete(ctx, thumbnailGeneratorURL+"/"+posterResp.JobID+"/status", progress, 78, 85); err != nil {
			log.WithError(err).Warn("Poster generation failed (non-fatal)")
		}
	}

	// Stage 6: Index in MeiliSearch.
	log.Info("Stage 6: Indexing in MeiliSearch")
	progress.Stage = StageIndexing
	progress.Progress = 88
	p.saveProgress(ctx, progress)

	searchItem := search.MediaItem{
		ID:        mediaID,
		Title:     req.Title,
		Year:      req.Year,
		Type:      req.Type,
		Duration:  mediaInfo.Duration,
		Quality:   formatQuality(mediaInfo.Width, mediaInfo.Height),
		FamilyID:  req.FamilyID,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	if err := p.meili.IndexMedia(searchItem); err != nil {
		log.WithError(err).Warn("MeiliSearch indexing failed (non-fatal)")
	}

	// Stage 7: Insert into PostgreSQL.
	log.Info("Stage 7: Inserting into database")
	progress.Stage = StageDatabase
	progress.Progress = 93
	p.saveProgress(ctx, progress)

	if err := p.insertMediaRecord(ctx, mediaID, req, mediaInfo, hlsURL); err != nil {
		return p.failIngest(ctx, progress, ingestID, mediaID, fmt.Sprintf("database insert failed: %v", err))
	}

	// Complete.
	log.Info("Ingest pipeline complete")
	progress.Stage = StageComplete
	progress.Status = "completed"
	progress.Progress = 100
	progress.MediaID = mediaID
	progress.HLSUrl = hlsURL
	progress.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	p.saveProgress(ctx, progress)

	return &IngestResult{
		IngestID: ingestID,
		MediaID:  mediaID,
		HLSUrl:   hlsURL,
		Status:   "completed",
	}, nil
}

// GetProgress retrieves the current ingest progress from Redis.
func (p *IngestPipeline) GetProgress(ctx context.Context, ingestID string) (*IngestProgress, error) {
	data, err := p.rdb.Get(ctx, "ingest:"+ingestID).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("ingest %q not found", ingestID)
		}
		return nil, fmt.Errorf("failed to get ingest progress: %w", err)
	}

	var progress IngestProgress
	if err := json.Unmarshal(data, &progress); err != nil {
		return nil, fmt.Errorf("failed to parse ingest progress: %w", err)
	}
	return &progress, nil
}

// saveProgress persists the current ingest progress to Redis with a 24-hour TTL.
func (p *IngestPipeline) saveProgress(ctx context.Context, progress *IngestProgress) {
	data, err := json.Marshal(progress)
	if err != nil {
		p.logger.WithError(err).Error("Failed to marshal ingest progress")
		return
	}
	if err := p.rdb.Set(ctx, "ingest:"+progress.IngestID, data, 24*time.Hour).Err(); err != nil {
		p.logger.WithError(err).Error("Failed to save ingest progress to Redis")
	}
}

// failIngest marks the ingest as failed, saves progress, and returns an error result.
func (p *IngestPipeline) failIngest(ctx context.Context, progress *IngestProgress, ingestID, mediaID, errMsg string) (*IngestResult, error) {
	progress.Stage = StageFailed
	progress.Status = "failed"
	progress.Error = errMsg
	progress.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	p.saveProgress(ctx, progress)

	return &IngestResult{
		IngestID: ingestID,
		MediaID:  mediaID,
		Status:   "failed",
		Error:    errMsg,
	}, fmt.Errorf("ingest failed: %s", errMsg)
}

// submitJob sends a job to a downstream microservice and returns the job response.
func (p *IngestPipeline) submitJob(ctx context.Context, url string, payload interface{}) (*jobResponse, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal job payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to %s failed: %w", url, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response from %s: %w", url, err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("job submission to %s returned HTTP %d: %s", url, resp.StatusCode, string(body))
	}

	var jobResp jobResponse
	if err := json.Unmarshal(body, &jobResp); err != nil {
		return nil, fmt.Errorf("failed to parse job response from %s: %w", url, err)
	}

	return &jobResp, nil
}

// pollJobUntilComplete polls a job status endpoint until the job completes or fails.
// It updates progress percentage linearly between progressStart and progressEnd.
func (p *IngestPipeline) pollJobUntilComplete(ctx context.Context, statusURL string, progress *IngestProgress, progressStart, progressEnd int) (string, error) {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	timeout := time.After(30 * time.Minute)
	attempts := 0

	for {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-timeout:
			return "", fmt.Errorf("job timed out after 30 minutes")
		case <-ticker.C:
			attempts++

			req, err := http.NewRequestWithContext(ctx, "GET", statusURL, nil)
			if err != nil {
				return "", fmt.Errorf("failed to create status request: %w", err)
			}

			resp, err := p.httpClient.Do(req)
			if err != nil {
				p.logger.WithError(err).Warn("Failed to poll job status, retrying...")
				continue
			}

			body, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				continue
			}

			var jobResp jobResponse
			if err := json.Unmarshal(body, &jobResp); err != nil {
				continue
			}

			switch jobResp.Status {
			case JobStatusCompleted:
				progress.Progress = progressEnd
				p.saveProgress(ctx, progress)
				return jobResp.Output.HLSUrl, nil

			case JobStatusFailed:
				return "", fmt.Errorf("job failed: %s", jobResp.Error)

			case JobStatusProcessing, JobStatusPending:
				// Linear interpolation of progress.
				stepProgress := progressStart + (progressEnd-progressStart)*attempts/100
				if stepProgress > progressEnd {
					stepProgress = progressEnd - 1
				}
				progress.Progress = stepProgress
				p.saveProgress(ctx, progress)
			}
		}
	}
}

// insertMediaRecord writes the media item to the PostgreSQL database.
func (p *IngestPipeline) insertMediaRecord(ctx context.Context, mediaID string, req IngestRequest, info *ffprobe.MediaInfo, hlsURL string) error {
	query := `
		INSERT INTO media_items (
			id, title, year, type, family_id,
			duration, width, height, video_codec, audio_codec,
			bitrate, frame_rate, hls_url, source_path,
			status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17
		)`

	now := time.Now().UTC()
	_, err := p.db.ExecContext(ctx, query,
		mediaID, req.Title, req.Year, req.Type, req.FamilyID,
		info.Duration, info.Width, info.Height, info.VideoCodec, info.AudioCodec,
		info.Bitrate, info.FrameRate, hlsURL, req.UploadPath,
		"ready", now, now,
	)
	if err != nil {
		return fmt.Errorf("failed to insert media record: %w", err)
	}
	return nil
}

// formatQuality returns a human-friendly quality string from resolution dimensions.
func formatQuality(width, height int) string {
	if height >= 2160 || width >= 3840 {
		return "2160p"
	}
	if height >= 1080 || width >= 1920 {
		return "1080p"
	}
	if height >= 720 || width >= 1280 {
		return "720p"
	}
	if height >= 480 || width >= 854 {
		return "480p"
	}
	if height > 0 {
		return fmt.Sprintf("%dp", height)
	}
	return "unknown"
}
