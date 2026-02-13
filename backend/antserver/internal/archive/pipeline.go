// Package archive implements the post-game archive pipeline that processes
// completed DVR recordings through a series of idempotent stages:
//
//	finalize -> detect_commercials -> encode -> trickplay -> upload -> index -> publish
//
// Each stage is individually retryable and the pipeline can resume from any
// failed stage without re-executing prior completed stages.
package archive

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Stage names used in the pipeline.
const (
	StageFinalize          = "finalize"
	StageDetectCommercials = "detect_commercials"
	StageEncode            = "encode"
	StageTrickplay         = "trickplay"
	StageUpload            = "upload"
	StageIndex             = "index"
	StagePublish           = "publish"
)

// JobStatus represents the current state of an archive job.
type JobStatus string

const (
	StatusPending    JobStatus = "pending"
	StatusRunning    JobStatus = "running"
	StatusCompleted  JobStatus = "completed"
	StatusFailed     JobStatus = "failed"
)

// StageResult records the outcome of a single pipeline stage.
type StageResult struct {
	// Name identifies the stage.
	Name string

	// Status is the current state of this stage.
	Status JobStatus

	// StartedAt is when execution began.
	StartedAt time.Time

	// CompletedAt is when execution finished (success or failure).
	CompletedAt time.Time

	// Error holds the failure message if Status is StatusFailed.
	Error string
}

// ArchiveJob tracks the full lifecycle of a recording through the pipeline.
type ArchiveJob struct {
	// ID is a unique identifier for this job.
	ID string

	// RecordingID is the DVR recording being archived.
	RecordingID string

	// Status is the overall job status.
	Status JobStatus

	// CurrentStage is the name of the stage currently executing.
	CurrentStage string

	// Stages holds the result of each pipeline stage in execution order.
	Stages []StageResult

	// CreatedAt is when the job was created.
	CreatedAt time.Time

	// UpdatedAt is when the job was last modified.
	UpdatedAt time.Time
}

// Sentinel errors.
var (
	ErrEmptyRecordingID = errors.New("archive: recording ID must not be empty")
	ErrJobNotFound      = errors.New("archive: job not found")
	ErrJobNotFailed     = errors.New("archive: job is not in failed state")
	ErrNilDependency    = errors.New("archive: all stage dependencies must be non-nil")
)

// stageOrder defines the fixed execution sequence.
var stageOrder = []string{
	StageFinalize,
	StageDetectCommercials,
	StageEncode,
	StageTrickplay,
	StageUpload,
	StageIndex,
	StagePublish,
}

// Finalizer finalizes a raw recording (e.g. mux into container format).
type Finalizer interface {
	Finalize(recordingID string) error
}

// CommercialDetector detects commercial breaks in a recording.
type CommercialDetector interface {
	Detect(recordingID string) error
}

// Encoder transcodes the recording into distribution formats.
type Encoder interface {
	Encode(recordingID string) error
}

// TrickplayGenerator creates trick-play thumbnails (preview sprites).
type TrickplayGenerator interface {
	Generate(recordingID string) error
}

// Uploader transfers encoded assets to object storage.
type Uploader interface {
	Upload(recordingID string) error
}

// SearchIndexer adds the recording to the search index.
type SearchIndexer interface {
	Index(recordingID string) error
}

// Publisher makes the recording visible in the catalog.
type Publisher interface {
	Publish(recordingID string) error
}

// Pipeline orchestrates archive jobs through the stage sequence.
type Pipeline struct {
	mu   sync.RWMutex
	jobs map[string]*ArchiveJob

	finalizer  Finalizer
	detector   CommercialDetector
	encoder    Encoder
	trickplay  TrickplayGenerator
	uploader   Uploader
	indexer    SearchIndexer
	publisher  Publisher

	// now is overridable for testing.
	now func() time.Time
}

// NewPipeline creates a Pipeline with all required stage implementations.
func NewPipeline(
	finalizer Finalizer,
	detector CommercialDetector,
	encoder Encoder,
	trickplay TrickplayGenerator,
	uploader Uploader,
	indexer SearchIndexer,
	publisher Publisher,
) (*Pipeline, error) {
	if finalizer == nil || detector == nil || encoder == nil ||
		trickplay == nil || uploader == nil || indexer == nil || publisher == nil {
		return nil, ErrNilDependency
	}

	return &Pipeline{
		jobs:      make(map[string]*ArchiveJob),
		finalizer: finalizer,
		detector:  detector,
		encoder:   encoder,
		trickplay: trickplay,
		uploader:  uploader,
		indexer:   indexer,
		publisher: publisher,
		now:       time.Now,
	}, nil
}

// Start creates a new archive job and begins processing it through all stages.
// Processing runs synchronously; wrap in a goroutine for async execution.
func (p *Pipeline) Start(recordingID string) (*ArchiveJob, error) {
	if recordingID == "" {
		return nil, ErrEmptyRecordingID
	}

	job := &ArchiveJob{
		ID:          uuid.New().String(),
		RecordingID: recordingID,
		Status:      StatusRunning,
		CreatedAt:   p.now(),
		UpdatedAt:   p.now(),
		Stages:      makeStages(),
	}

	p.mu.Lock()
	p.jobs[job.ID] = job
	p.mu.Unlock()

	p.runFromStage(job, 0)
	return job, nil
}

// GetStatus returns a snapshot of the archive job.
func (p *Pipeline) GetStatus(jobID string) (*ArchiveJob, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	job, ok := p.jobs[jobID]
	if !ok {
		return nil, ErrJobNotFound
	}

	// Return a copy to prevent data races on the caller side.
	cp := *job
	cp.Stages = make([]StageResult, len(job.Stages))
	copy(cp.Stages, job.Stages)
	return &cp, nil
}

// Retry resumes a failed job from the failed stage. All prior completed stages
// are preserved (idempotent retry).
func (p *Pipeline) Retry(jobID string) error {
	p.mu.Lock()
	job, ok := p.jobs[jobID]
	if !ok {
		p.mu.Unlock()
		return ErrJobNotFound
	}
	if job.Status != StatusFailed {
		p.mu.Unlock()
		return ErrJobNotFailed
	}

	// Find the first non-completed stage.
	resumeIdx := -1
	for i, s := range job.Stages {
		if s.Status != StatusCompleted {
			resumeIdx = i
			break
		}
	}

	if resumeIdx == -1 {
		// All stages complete — mark done (shouldn't happen but handle gracefully).
		job.Status = StatusCompleted
		job.UpdatedAt = p.now()
		p.mu.Unlock()
		return nil
	}

	// Reset the failed stage for re-execution.
	job.Stages[resumeIdx].Status = StatusPending
	job.Stages[resumeIdx].Error = ""
	job.Status = StatusRunning
	job.UpdatedAt = p.now()
	p.mu.Unlock()

	p.runFromStage(job, resumeIdx)
	return nil
}

// runFromStage executes pipeline stages starting at the given index.
func (p *Pipeline) runFromStage(job *ArchiveJob, startIdx int) {
	for i := startIdx; i < len(stageOrder); i++ {
		stageName := stageOrder[i]

		p.mu.Lock()
		job.CurrentStage = stageName
		job.Stages[i].Status = StatusRunning
		job.Stages[i].StartedAt = p.now()
		job.UpdatedAt = p.now()
		p.mu.Unlock()

		err := p.executeStage(stageName, job.RecordingID)

		p.mu.Lock()
		job.Stages[i].CompletedAt = p.now()
		if err != nil {
			job.Stages[i].Status = StatusFailed
			job.Stages[i].Error = err.Error()
			job.Status = StatusFailed
			job.UpdatedAt = p.now()
			p.mu.Unlock()
			return
		}
		job.Stages[i].Status = StatusCompleted
		job.UpdatedAt = p.now()
		p.mu.Unlock()
	}

	p.mu.Lock()
	job.Status = StatusCompleted
	job.CurrentStage = ""
	job.UpdatedAt = p.now()
	p.mu.Unlock()
}

// executeStage dispatches to the correct stage implementation.
func (p *Pipeline) executeStage(stage, recordingID string) error {
	switch stage {
	case StageFinalize:
		return p.finalizer.Finalize(recordingID)
	case StageDetectCommercials:
		return p.detector.Detect(recordingID)
	case StageEncode:
		return p.encoder.Encode(recordingID)
	case StageTrickplay:
		return p.trickplay.Generate(recordingID)
	case StageUpload:
		return p.uploader.Upload(recordingID)
	case StageIndex:
		return p.indexer.Index(recordingID)
	case StagePublish:
		return p.publisher.Publish(recordingID)
	default:
		return errors.New("archive: unknown stage: " + stage)
	}
}

// makeStages initializes the stage result slice with all stages in pending state.
func makeStages() []StageResult {
	stages := make([]StageResult, len(stageOrder))
	for i, name := range stageOrder {
		stages[i] = StageResult{
			Name:   name,
			Status: StatusPending,
		}
	}
	return stages
}
