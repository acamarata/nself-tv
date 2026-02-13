package tests

import (
	"testing"

	"antserver/internal/recorder"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStartRecording(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	assert.NotEmpty(t, rec.ID)
	assert.Equal(t, "event-001", rec.EventID)
	assert.Equal(t, "srt://192.168.1.100:9000", rec.StreamURL)
	assert.Equal(t, recorder.RecordingActive, rec.State)
	assert.NotZero(t, rec.StartedAt)
}

func TestStopRecording(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	err := r.StopRecording(rec.ID)
	require.NoError(t, err)

	status, err := r.GetRecordingStatus(rec.ID)
	require.NoError(t, err)
	assert.Equal(t, recorder.RecordingFinalizing, status.State)
	assert.NotZero(t, status.StoppedAt)
}

func TestStopRecordingNotActive(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	// Stop it first.
	err := r.StopRecording(rec.ID)
	require.NoError(t, err)

	// Try to stop again.
	err = r.StopRecording(rec.ID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not active")
}

func TestStopRecordingNotFound(t *testing.T) {
	r := recorder.New()
	err := r.StopRecording("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "recording not found")
}

func TestFinalizeRecording(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	// Must stop before finalize.
	err := r.StopRecording(rec.ID)
	require.NoError(t, err)

	err = r.FinalizeRecording(rec.ID)
	require.NoError(t, err)

	status, err := r.GetRecordingStatus(rec.ID)
	require.NoError(t, err)
	assert.Equal(t, recorder.RecordingComplete, status.State)
}

func TestFinalizeRecordingNotFinalizing(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	// Try to finalize without stopping.
	err := r.FinalizeRecording(rec.ID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not in finalizing state")
}

func TestFinalizeRecordingNotFound(t *testing.T) {
	r := recorder.New()
	err := r.FinalizeRecording("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "recording not found")
}

func TestFailRecording(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	err := r.FailRecording(rec.ID, "stream dropped unexpectedly")
	require.NoError(t, err)

	status, err := r.GetRecordingStatus(rec.ID)
	require.NoError(t, err)
	assert.Equal(t, recorder.RecordingFailed, status.State)
	assert.Equal(t, "stream dropped unexpectedly", status.ErrorMessage)
	assert.NotZero(t, status.StoppedAt)
}

func TestFailRecordingNotFound(t *testing.T) {
	r := recorder.New()
	err := r.FailRecording("nonexistent", "error")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "recording not found")
}

func TestUpdateBytes(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	err := r.UpdateBytes(rec.ID, 1024*1024)
	require.NoError(t, err)

	status, err := r.GetRecordingStatus(rec.ID)
	require.NoError(t, err)
	assert.Equal(t, int64(1024*1024), status.BytesWritten)
}

func TestUpdateBytesNotActive(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	err := r.StopRecording(rec.ID)
	require.NoError(t, err)

	err = r.UpdateBytes(rec.ID, 1024)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not active")
}

func TestUpdateBytesNotFound(t *testing.T) {
	r := recorder.New()
	err := r.UpdateBytes("nonexistent", 1024)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "recording not found")
}

func TestGetRecordingStatus(t *testing.T) {
	r := recorder.New()
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")

	status, err := r.GetRecordingStatus(rec.ID)
	require.NoError(t, err)

	assert.Equal(t, rec.ID, status.ID)
	assert.Equal(t, "event-001", status.EventID)
	assert.Equal(t, "srt://192.168.1.100:9000", status.StreamURL)
	assert.Equal(t, recorder.RecordingActive, status.State)
}

func TestGetRecordingStatusNotFound(t *testing.T) {
	r := recorder.New()
	_, err := r.GetRecordingStatus("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "recording not found")
}

func TestListRecordings(t *testing.T) {
	r := recorder.New()

	recordings := r.ListRecordings()
	assert.Empty(t, recordings)

	r.StartRecording("event-001", "srt://192.168.1.100:9000")
	r.StartRecording("event-002", "srt://192.168.1.101:9000")

	recordings = r.ListRecordings()
	assert.Len(t, recordings, 2)
}

func TestFullRecordingLifecycle(t *testing.T) {
	r := recorder.New()

	// Start.
	rec := r.StartRecording("event-001", "srt://192.168.1.100:9000")
	assert.Equal(t, recorder.RecordingActive, rec.State)

	// Update bytes.
	err := r.UpdateBytes(rec.ID, 5*1024*1024)
	require.NoError(t, err)

	// Stop.
	err = r.StopRecording(rec.ID)
	require.NoError(t, err)

	status, _ := r.GetRecordingStatus(rec.ID)
	assert.Equal(t, recorder.RecordingFinalizing, status.State)

	// Finalize.
	err = r.FinalizeRecording(rec.ID)
	require.NoError(t, err)

	status, _ = r.GetRecordingStatus(rec.ID)
	assert.Equal(t, recorder.RecordingComplete, status.State)
	assert.Equal(t, int64(5*1024*1024), status.BytesWritten)
}
