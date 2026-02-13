package tests

import (
	"errors"
	"sync"
	"testing"

	"antserver/internal/archive"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock implementations for all pipeline stage interfaces.

type mockFinalizer struct {
	mu  sync.Mutex
	err error
	ids []string
}

func (m *mockFinalizer) Finalize(recordingID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ids = append(m.ids, recordingID)
	return m.err
}

type mockDetector struct {
	mu  sync.Mutex
	err error
	ids []string
}

func (m *mockDetector) Detect(recordingID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ids = append(m.ids, recordingID)
	return m.err
}

type mockEncoder struct {
	mu  sync.Mutex
	err error
	ids []string
}

func (m *mockEncoder) Encode(recordingID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ids = append(m.ids, recordingID)
	return m.err
}

type mockTrickplay struct {
	mu  sync.Mutex
	err error
	ids []string
}

func (m *mockTrickplay) Generate(recordingID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ids = append(m.ids, recordingID)
	return m.err
}

type mockUploader struct {
	mu  sync.Mutex
	err error
	ids []string
}

func (m *mockUploader) Upload(recordingID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ids = append(m.ids, recordingID)
	return m.err
}

type mockIndexer struct {
	mu  sync.Mutex
	err error
	ids []string
}

func (m *mockIndexer) Index(recordingID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ids = append(m.ids, recordingID)
	return m.err
}

type mockPublisher struct {
	mu  sync.Mutex
	err error
	ids []string
}

func (m *mockPublisher) Publish(recordingID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ids = append(m.ids, recordingID)
	return m.err
}

func newMocks() (*mockFinalizer, *mockDetector, *mockEncoder, *mockTrickplay, *mockUploader, *mockIndexer, *mockPublisher) {
	return &mockFinalizer{}, &mockDetector{}, &mockEncoder{}, &mockTrickplay{}, &mockUploader{}, &mockIndexer{}, &mockPublisher{}
}

func newPipeline(t *testing.T) (*archive.Pipeline, *mockFinalizer, *mockDetector, *mockEncoder, *mockTrickplay, *mockUploader, *mockIndexer, *mockPublisher) {
	f, d, e, tp, u, i, p := newMocks()
	pipeline, err := archive.NewPipeline(f, d, e, tp, u, i, p)
	require.NoError(t, err)
	return pipeline, f, d, e, tp, u, i, p
}

func TestNewPipeline_NilDependency(t *testing.T) {
	f, d, e, tp, u, i, p := newMocks()

	tests := []struct {
		name string
		args [7]interface{}
	}{
		{"nil finalizer", [7]interface{}{nil, d, e, tp, u, i, p}},
		{"nil detector", [7]interface{}{f, nil, e, tp, u, i, p}},
		{"nil encoder", [7]interface{}{f, d, nil, tp, u, i, p}},
		{"nil trickplay", [7]interface{}{f, d, e, nil, u, i, p}},
		{"nil uploader", [7]interface{}{f, d, e, tp, nil, i, p}},
		{"nil indexer", [7]interface{}{f, d, e, tp, u, nil, p}},
		{"nil publisher", [7]interface{}{f, d, e, tp, u, i, nil}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var fin archive.Finalizer
			var det archive.CommercialDetector
			var enc archive.Encoder
			var trk archive.TrickplayGenerator
			var upl archive.Uploader
			var idx archive.SearchIndexer
			var pub archive.Publisher

			if tt.args[0] != nil {
				fin = tt.args[0].(archive.Finalizer)
			}
			if tt.args[1] != nil {
				det = tt.args[1].(archive.CommercialDetector)
			}
			if tt.args[2] != nil {
				enc = tt.args[2].(archive.Encoder)
			}
			if tt.args[3] != nil {
				trk = tt.args[3].(archive.TrickplayGenerator)
			}
			if tt.args[4] != nil {
				upl = tt.args[4].(archive.Uploader)
			}
			if tt.args[5] != nil {
				idx = tt.args[5].(archive.SearchIndexer)
			}
			if tt.args[6] != nil {
				pub = tt.args[6].(archive.Publisher)
			}

			_, err := archive.NewPipeline(fin, det, enc, trk, upl, idx, pub)
			assert.ErrorIs(t, err, archive.ErrNilDependency)
		})
	}
}

func TestStart_EmptyRecordingID(t *testing.T) {
	pipeline, _, _, _, _, _, _, _ := newPipeline(t)

	_, err := pipeline.Start("")
	assert.ErrorIs(t, err, archive.ErrEmptyRecordingID)
}

func TestStart_FullPipelineSuccess(t *testing.T) {
	pipeline, f, d, e, tp, u, i, p := newPipeline(t)

	job, err := pipeline.Start("rec-001")
	require.NoError(t, err)
	assert.Equal(t, archive.StatusCompleted, job.Status)
	assert.Equal(t, "rec-001", job.RecordingID)
	assert.NotEmpty(t, job.ID)

	// Verify all stages completed.
	assert.Len(t, job.Stages, 7)
	for _, stage := range job.Stages {
		assert.Equal(t, archive.StatusCompleted, stage.Status, "stage %s should be completed", stage.Name)
		assert.Empty(t, stage.Error)
	}

	// Verify stage order.
	assert.Equal(t, "finalize", job.Stages[0].Name)
	assert.Equal(t, "detect_commercials", job.Stages[1].Name)
	assert.Equal(t, "encode", job.Stages[2].Name)
	assert.Equal(t, "trickplay", job.Stages[3].Name)
	assert.Equal(t, "upload", job.Stages[4].Name)
	assert.Equal(t, "index", job.Stages[5].Name)
	assert.Equal(t, "publish", job.Stages[6].Name)

	// Verify each stage was called exactly once.
	assert.Equal(t, []string{"rec-001"}, f.ids)
	assert.Equal(t, []string{"rec-001"}, d.ids)
	assert.Equal(t, []string{"rec-001"}, e.ids)
	assert.Equal(t, []string{"rec-001"}, tp.ids)
	assert.Equal(t, []string{"rec-001"}, u.ids)
	assert.Equal(t, []string{"rec-001"}, i.ids)
	assert.Equal(t, []string{"rec-001"}, p.ids)
}

func TestStart_FailsAtEncode(t *testing.T) {
	pipeline, _, _, e, _, _, _, _ := newPipeline(t)
	e.err = errors.New("encoding failed: codec not supported")

	job, err := pipeline.Start("rec-002")
	require.NoError(t, err) // Start itself doesn't error; the job records the failure.
	assert.Equal(t, archive.StatusFailed, job.Status)

	// First two stages should be complete.
	assert.Equal(t, archive.StatusCompleted, job.Stages[0].Status) // finalize
	assert.Equal(t, archive.StatusCompleted, job.Stages[1].Status) // detect_commercials

	// Encode should have failed.
	assert.Equal(t, archive.StatusFailed, job.Stages[2].Status)
	assert.Equal(t, "encoding failed: codec not supported", job.Stages[2].Error)

	// Remaining stages should be pending.
	for i := 3; i < 7; i++ {
		assert.Equal(t, archive.StatusPending, job.Stages[i].Status)
	}
}

func TestGetStatus_NotFound(t *testing.T) {
	pipeline, _, _, _, _, _, _, _ := newPipeline(t)

	_, err := pipeline.GetStatus("nonexistent")
	assert.ErrorIs(t, err, archive.ErrJobNotFound)
}

func TestGetStatus_ReturnsSnapshot(t *testing.T) {
	pipeline, _, _, _, _, _, _, _ := newPipeline(t)

	job, _ := pipeline.Start("rec-003")
	status, err := pipeline.GetStatus(job.ID)
	require.NoError(t, err)

	assert.Equal(t, job.ID, status.ID)
	assert.Equal(t, "rec-003", status.RecordingID)
	assert.Equal(t, archive.StatusCompleted, status.Status)
}

func TestRetry_NotFound(t *testing.T) {
	pipeline, _, _, _, _, _, _, _ := newPipeline(t)

	err := pipeline.Retry("nonexistent")
	assert.ErrorIs(t, err, archive.ErrJobNotFound)
}

func TestRetry_NotFailed(t *testing.T) {
	pipeline, _, _, _, _, _, _, _ := newPipeline(t)

	job, _ := pipeline.Start("rec-004")
	err := pipeline.Retry(job.ID)
	assert.ErrorIs(t, err, archive.ErrJobNotFailed)
}

func TestRetry_ResumesFromFailedStage(t *testing.T) {
	pipeline, _, _, e, _, _, _, _ := newPipeline(t)

	// Fail at encode stage.
	e.err = errors.New("disk full")
	job, _ := pipeline.Start("rec-005")
	assert.Equal(t, archive.StatusFailed, job.Status)

	// Fix the error and retry.
	e.err = nil
	err := pipeline.Retry(job.ID)
	require.NoError(t, err)

	// Check that job completed.
	status, _ := pipeline.GetStatus(job.ID)
	assert.Equal(t, archive.StatusCompleted, status.Status)

	// All stages should now be complete.
	for _, stage := range status.Stages {
		assert.Equal(t, archive.StatusCompleted, stage.Status, "stage %s should be completed after retry", stage.Name)
	}
}

func TestRetry_FailsAgain(t *testing.T) {
	pipeline, _, _, e, _, _, _, _ := newPipeline(t)

	e.err = errors.New("persistent error")
	job, _ := pipeline.Start("rec-006")
	assert.Equal(t, archive.StatusFailed, job.Status)

	// Retry without fixing — fails again.
	err := pipeline.Retry(job.ID)
	require.NoError(t, err)

	status, _ := pipeline.GetStatus(job.ID)
	assert.Equal(t, archive.StatusFailed, status.Status)
}

func TestRetry_MultipleRetries(t *testing.T) {
	pipeline, _, _, e, _, u, _, _ := newPipeline(t)

	// First failure at encode.
	e.err = errors.New("codec error")
	job, _ := pipeline.Start("rec-007")
	assert.Equal(t, archive.StatusFailed, job.Status)

	// Fix encode, but upload will fail.
	e.err = nil
	u.err = errors.New("storage unavailable")
	pipeline.Retry(job.ID)

	status, _ := pipeline.GetStatus(job.ID)
	assert.Equal(t, archive.StatusFailed, status.Status)
	assert.Equal(t, archive.StatusCompleted, status.Stages[2].Status) // encode now passes
	assert.Equal(t, archive.StatusFailed, status.Stages[4].Status)   // upload fails

	// Fix upload and retry again.
	u.err = nil
	pipeline.Retry(job.ID)

	status, _ = pipeline.GetStatus(job.ID)
	assert.Equal(t, archive.StatusCompleted, status.Status)
}

func TestStageIdempotency(t *testing.T) {
	// Verify that completed stages aren't re-executed on retry.
	pipeline, f, _, e, _, _, _, _ := newPipeline(t)

	e.err = errors.New("fail")
	pipeline.Start("rec-008")

	// Finalize was called once.
	assert.Len(t, f.ids, 1)

	// Retry (fix encoder).
	e.err = nil
	// Find the job by starting fresh inspection.
	// We need the job ID — start returns it.
	pipeline2, f2, _, e2, _, _, _, _ := newPipeline(t)
	e2.err = errors.New("fail")
	job, _ := pipeline2.Start("rec-009")
	assert.Len(t, f2.ids, 1) // called once

	e2.err = nil
	pipeline2.Retry(job.ID)

	// Finalize should NOT have been called again (still 1 call total).
	assert.Len(t, f2.ids, 1, "finalize should not be re-executed after successful completion")
}

func TestStart_MultipleJobs(t *testing.T) {
	pipeline, _, _, _, _, _, _, _ := newPipeline(t)

	job1, err := pipeline.Start("rec-010")
	require.NoError(t, err)

	job2, err := pipeline.Start("rec-011")
	require.NoError(t, err)

	assert.NotEqual(t, job1.ID, job2.ID)
	assert.Equal(t, "rec-010", job1.RecordingID)
	assert.Equal(t, "rec-011", job2.RecordingID)

	// Both should be queryable.
	s1, _ := pipeline.GetStatus(job1.ID)
	s2, _ := pipeline.GetStatus(job2.ID)
	assert.Equal(t, archive.StatusCompleted, s1.Status)
	assert.Equal(t, archive.StatusCompleted, s2.Status)
}

func TestStart_FailsAtFirstStage(t *testing.T) {
	pipeline, f, _, _, _, _, _, _ := newPipeline(t)
	f.err = errors.New("finalize failed")

	job, err := pipeline.Start("rec-012")
	require.NoError(t, err)
	assert.Equal(t, archive.StatusFailed, job.Status)
	assert.Equal(t, archive.StatusFailed, job.Stages[0].Status)

	// All other stages should be pending.
	for i := 1; i < 7; i++ {
		assert.Equal(t, archive.StatusPending, job.Stages[i].Status)
	}
}

func TestStart_FailsAtLastStage(t *testing.T) {
	pipeline, _, _, _, _, _, _, p := newPipeline(t)
	p.err = errors.New("publish failed")

	job, err := pipeline.Start("rec-013")
	require.NoError(t, err)
	assert.Equal(t, archive.StatusFailed, job.Status)

	// All stages except last should be completed.
	for i := 0; i < 6; i++ {
		assert.Equal(t, archive.StatusCompleted, job.Stages[i].Status)
	}
	assert.Equal(t, archive.StatusFailed, job.Stages[6].Status)
}

func TestStageTimestamps(t *testing.T) {
	pipeline, _, _, _, _, _, _, _ := newPipeline(t)

	job, _ := pipeline.Start("rec-014")
	for _, stage := range job.Stages {
		assert.False(t, stage.StartedAt.IsZero(), "stage %s should have StartedAt", stage.Name)
		assert.False(t, stage.CompletedAt.IsZero(), "stage %s should have CompletedAt", stage.Name)
		assert.True(t, stage.CompletedAt.After(stage.StartedAt) || stage.CompletedAt.Equal(stage.StartedAt),
			"stage %s CompletedAt should be >= StartedAt", stage.Name)
	}
}

func TestJobTimestamps(t *testing.T) {
	pipeline, _, _, _, _, _, _, _ := newPipeline(t)

	job, _ := pipeline.Start("rec-015")
	assert.False(t, job.CreatedAt.IsZero())
	assert.False(t, job.UpdatedAt.IsZero())
	assert.True(t, job.UpdatedAt.After(job.CreatedAt) || job.UpdatedAt.Equal(job.CreatedAt))
}
