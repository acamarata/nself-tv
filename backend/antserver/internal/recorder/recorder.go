// Package recorder manages the recording lifecycle: creation, finalization, and status tracking.
package recorder

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

// RecordingState represents the state of a recording.
type RecordingState string

const (
	RecordingStarting   RecordingState = "starting"
	RecordingActive     RecordingState = "active"
	RecordingFinalizing RecordingState = "finalizing"
	RecordingComplete   RecordingState = "complete"
	RecordingFailed     RecordingState = "failed"
)

// RecordingStatus provides a read-only view of a recording's current state.
type RecordingStatus struct {
	ID           string         `json:"id"`
	EventID      string         `json:"event_id"`
	StreamURL    string         `json:"stream_url"`
	State        RecordingState `json:"state"`
	StartedAt    time.Time      `json:"started_at"`
	StoppedAt    time.Time      `json:"stopped_at,omitempty"`
	FinalizedAt  time.Time      `json:"finalized_at,omitempty"`
	BytesWritten int64          `json:"bytes_written"`
	ErrorMessage string         `json:"error_message,omitempty"`
}

// Recording is the internal representation of an active recording session.
type Recording struct {
	ID           string         `json:"id"`
	EventID      string         `json:"event_id"`
	StreamURL    string         `json:"stream_url"`
	State        RecordingState `json:"state"`
	StartedAt    time.Time      `json:"started_at"`
	StoppedAt    time.Time      `json:"stopped_at,omitempty"`
	FinalizedAt  time.Time      `json:"finalized_at,omitempty"`
	BytesWritten int64          `json:"bytes_written"`
	ErrorMessage string         `json:"error_message,omitempty"`
	StoragePath  string         `json:"storage_path,omitempty"`
}

// Recorder manages the lifecycle of recording sessions.
type Recorder struct {
	mu         sync.RWMutex
	recordings map[string]*Recording
}

// New creates a new Recorder.
func New() *Recorder {
	return &Recorder{
		recordings: make(map[string]*Recording),
	}
}

// StartRecording initiates a new recording for the given event and stream URL.
func (r *Recorder) StartRecording(eventID, streamURL string) *Recording {
	rec := &Recording{
		ID:        uuid.New().String(),
		EventID:   eventID,
		StreamURL: streamURL,
		State:     RecordingStarting,
		StartedAt: time.Now(),
	}

	r.mu.Lock()
	r.recordings[rec.ID] = rec
	r.mu.Unlock()

	log.WithFields(log.Fields{
		"recording_id": rec.ID,
		"event_id":     eventID,
		"stream_url":   streamURL,
	}).Info("recording started")

	// Move to active state immediately (in production this would happen
	// after the ingest pipeline confirms the stream is flowing).
	r.mu.Lock()
	rec.State = RecordingActive
	r.mu.Unlock()

	return rec
}

// UpdateBytes updates the bytes written counter for a recording.
func (r *Recorder) UpdateBytes(recordingID string, bytes int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rec, ok := r.recordings[recordingID]
	if !ok {
		return fmt.Errorf("recording not found: %s", recordingID)
	}

	if rec.State != RecordingActive {
		return fmt.Errorf("recording %s is not active (state: %s)", recordingID, rec.State)
	}

	rec.BytesWritten = bytes
	return nil
}

// StopRecording stops an active recording and transitions it to finalizing.
func (r *Recorder) StopRecording(recordingID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rec, ok := r.recordings[recordingID]
	if !ok {
		return fmt.Errorf("recording not found: %s", recordingID)
	}

	if rec.State != RecordingActive {
		return fmt.Errorf("recording %s is not active (state: %s)", recordingID, rec.State)
	}

	rec.State = RecordingFinalizing
	rec.StoppedAt = time.Now()

	log.WithFields(log.Fields{
		"recording_id": recordingID,
		"event_id":     rec.EventID,
		"bytes":        rec.BytesWritten,
	}).Info("recording stopped, finalizing")

	return nil
}

// FinalizeRecording completes the finalization process for a recording.
// In production this would trigger post-processing, transcoding, and storage upload.
func (r *Recorder) FinalizeRecording(recordingID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rec, ok := r.recordings[recordingID]
	if !ok {
		return fmt.Errorf("recording not found: %s", recordingID)
	}

	if rec.State != RecordingFinalizing {
		return fmt.Errorf("recording %s is not in finalizing state (state: %s)", recordingID, rec.State)
	}

	rec.State = RecordingComplete
	rec.FinalizedAt = time.Now()
	rec.StoragePath = fmt.Sprintf("recordings/%s/%s.ts", rec.EventID, rec.ID)

	log.WithFields(log.Fields{
		"recording_id": recordingID,
		"event_id":     rec.EventID,
		"storage_path": rec.StoragePath,
		"bytes":        rec.BytesWritten,
	}).Info("recording finalized")

	return nil
}

// FailRecording marks a recording as failed with the given error message.
func (r *Recorder) FailRecording(recordingID, errMsg string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rec, ok := r.recordings[recordingID]
	if !ok {
		return fmt.Errorf("recording not found: %s", recordingID)
	}

	rec.State = RecordingFailed
	rec.ErrorMessage = errMsg
	rec.StoppedAt = time.Now()

	log.WithFields(log.Fields{
		"recording_id": recordingID,
		"event_id":     rec.EventID,
		"error":        errMsg,
	}).Error("recording failed")

	return nil
}

// GetRecordingStatus returns the current status of a recording.
func (r *Recorder) GetRecordingStatus(recordingID string) (*RecordingStatus, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rec, ok := r.recordings[recordingID]
	if !ok {
		return nil, fmt.Errorf("recording not found: %s", recordingID)
	}

	return &RecordingStatus{
		ID:           rec.ID,
		EventID:      rec.EventID,
		StreamURL:    rec.StreamURL,
		State:        rec.State,
		StartedAt:    rec.StartedAt,
		StoppedAt:    rec.StoppedAt,
		FinalizedAt:  rec.FinalizedAt,
		BytesWritten: rec.BytesWritten,
		ErrorMessage: rec.ErrorMessage,
	}, nil
}

// ListRecordings returns a list of all recordings.
func (r *Recorder) ListRecordings() []*RecordingStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*RecordingStatus, 0, len(r.recordings))
	for _, rec := range r.recordings {
		result = append(result, &RecordingStatus{
			ID:           rec.ID,
			EventID:      rec.EventID,
			StreamURL:    rec.StreamURL,
			State:        rec.State,
			StartedAt:    rec.StartedAt,
			StoppedAt:    rec.StoppedAt,
			FinalizedAt:  rec.FinalizedAt,
			BytesWritten: rec.BytesWritten,
			ErrorMessage: rec.ErrorMessage,
		})
	}
	return result
}
