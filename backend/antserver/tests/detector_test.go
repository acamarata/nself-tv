package tests

import (
	"errors"
	"testing"

	"antserver/internal/commercial"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockComskipRunner implements commercial.ComskipRunner for testing.
type mockComskipRunner struct {
	segmentMarkers   []commercial.Marker
	recordingMarkers []commercial.Marker
	segmentErr       error
	recordingErr     error
}

func (m *mockComskipRunner) RunOnSegment(segmentPath string) ([]commercial.Marker, error) {
	if m.segmentErr != nil {
		return nil, m.segmentErr
	}
	return m.segmentMarkers, nil
}

func (m *mockComskipRunner) RunOnRecording(recordingPath string) ([]commercial.Marker, error) {
	if m.recordingErr != nil {
		return nil, m.recordingErr
	}
	return m.recordingMarkers, nil
}

func TestNewDetector_NilRunner(t *testing.T) {
	_, err := commercial.NewDetector(nil, 0, 0)
	assert.ErrorIs(t, err, commercial.ErrNilRunner)
}

func TestNewDetector_DefaultThresholds(t *testing.T) {
	runner := &mockComskipRunner{}
	d, err := commercial.NewDetector(runner, 0, 0)
	require.NoError(t, err)
	assert.NotNil(t, d)

	// With default thresholds, 0.90 should auto-skip.
	assert.True(t, d.ShouldAutoSkip(commercial.Marker{Confidence: 0.90}))
	assert.False(t, d.ShouldAutoSkip(commercial.Marker{Confidence: 0.89}))
}

func TestNewDetector_CustomThresholds(t *testing.T) {
	runner := &mockComskipRunner{}
	d, err := commercial.NewDetector(runner, 0.95, 0.80)
	require.NoError(t, err)

	assert.True(t, d.ShouldAutoSkip(commercial.Marker{Confidence: 0.95}))
	assert.False(t, d.ShouldAutoSkip(commercial.Marker{Confidence: 0.94}))
	assert.True(t, d.ShouldPrompt(commercial.Marker{Confidence: 0.80}))
	assert.False(t, d.ShouldPrompt(commercial.Marker{Confidence: 0.79}))
}

func TestShouldAutoSkip(t *testing.T) {
	runner := &mockComskipRunner{}
	d, _ := commercial.NewDetector(runner, 0, 0)

	tests := []struct {
		name       string
		confidence float64
		expected   bool
	}{
		{"exactly at threshold", 0.90, true},
		{"above threshold", 0.95, true},
		{"perfect confidence", 1.0, true},
		{"just below threshold", 0.89, false},
		{"low confidence", 0.50, false},
		{"zero confidence", 0.0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := d.ShouldAutoSkip(commercial.Marker{Confidence: tt.confidence})
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestShouldPrompt(t *testing.T) {
	runner := &mockComskipRunner{}
	d, _ := commercial.NewDetector(runner, 0, 0)

	tests := []struct {
		name       string
		confidence float64
		expected   bool
	}{
		{"exactly at prompt threshold", 0.70, true},
		{"mid prompt range", 0.80, true},
		{"top of prompt range", 0.89, true},
		{"at auto-skip threshold (not prompt)", 0.90, false},
		{"above auto-skip (not prompt)", 0.95, false},
		{"below prompt threshold", 0.69, false},
		{"very low", 0.10, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := d.ShouldPrompt(commercial.Marker{Confidence: tt.confidence})
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestAnalyzeSegment_EmptyPath(t *testing.T) {
	runner := &mockComskipRunner{}
	d, _ := commercial.NewDetector(runner, 0, 0)

	_, err := d.AnalyzeSegment("")
	assert.ErrorIs(t, err, commercial.ErrEmptyPath)
}

func TestAnalyzeSegment_Success(t *testing.T) {
	runner := &mockComskipRunner{
		segmentMarkers: []commercial.Marker{
			{StartMs: 1000, EndMs: 5000, Confidence: 0.92, Source: "comskip"},
		},
	}
	d, _ := commercial.NewDetector(runner, 0, 0)

	markers, err := d.AnalyzeSegment("/path/to/segment.ts")
	require.NoError(t, err)
	assert.Len(t, markers, 1)
	assert.Equal(t, int64(1000), markers[0].StartMs)
	assert.Equal(t, int64(5000), markers[0].EndMs)
}

func TestAnalyzeSegment_AccumulatesMarkers(t *testing.T) {
	runner := &mockComskipRunner{
		segmentMarkers: []commercial.Marker{
			{StartMs: 0, EndMs: 3000, Confidence: 0.85, Source: "comskip"},
		},
	}
	d, _ := commercial.NewDetector(runner, 0, 0)

	// First segment analysis.
	d.AnalyzeSegment("/path/seg1.ts")
	assert.Len(t, d.GetAccumulatedMarkers(), 1)

	// Change runner to return a different non-overlapping marker.
	runner.segmentMarkers = []commercial.Marker{
		{StartMs: 10000, EndMs: 15000, Confidence: 0.91, Source: "comskip"},
	}

	// Second segment analysis — should accumulate.
	d.AnalyzeSegment("/path/seg2.ts")
	assert.Len(t, d.GetAccumulatedMarkers(), 2)
}

func TestAnalyzeSegment_RunnerError(t *testing.T) {
	runner := &mockComskipRunner{
		segmentErr: errors.New("comskip binary not found"),
	}
	d, _ := commercial.NewDetector(runner, 0, 0)

	_, err := d.AnalyzeSegment("/path/to/segment.ts")
	assert.Error(t, err)
}

func TestAnalyzeFullRecording_EmptyPath(t *testing.T) {
	runner := &mockComskipRunner{}
	d, _ := commercial.NewDetector(runner, 0, 0)

	_, err := d.AnalyzeFullRecording("")
	assert.ErrorIs(t, err, commercial.ErrEmptyPath)
}

func TestAnalyzeFullRecording_Success(t *testing.T) {
	runner := &mockComskipRunner{
		recordingMarkers: []commercial.Marker{
			{StartMs: 500, EndMs: 30000, Confidence: 0.95, Source: "comskip"},
			{StartMs: 60000, EndMs: 90000, Confidence: 0.88, Source: "comskip"},
		},
	}
	d, _ := commercial.NewDetector(runner, 0, 0)

	markers, err := d.AnalyzeFullRecording("/path/to/recording.ts")
	require.NoError(t, err)
	assert.Len(t, markers, 2)
}

func TestAnalyzeFullRecording_RunnerError(t *testing.T) {
	runner := &mockComskipRunner{
		recordingErr: errors.New("recording file corrupt"),
	}
	d, _ := commercial.NewDetector(runner, 0, 0)

	_, err := d.AnalyzeFullRecording("/path/to/recording.ts")
	assert.Error(t, err)
}

func TestMergeMarkers_BothEmpty(t *testing.T) {
	result := commercial.MergeMarkers(nil, nil)
	assert.Empty(t, result)
}

func TestMergeMarkers_ExistingEmpty(t *testing.T) {
	incoming := []commercial.Marker{
		{StartMs: 1000, EndMs: 5000, Confidence: 0.85, Source: "comskip"},
	}
	result := commercial.MergeMarkers(nil, incoming)
	assert.Len(t, result, 1)
}

func TestMergeMarkers_IncomingEmpty(t *testing.T) {
	existing := []commercial.Marker{
		{StartMs: 1000, EndMs: 5000, Confidence: 0.85, Source: "comskip"},
	}
	result := commercial.MergeMarkers(existing, nil)
	assert.Len(t, result, 1)
}

func TestMergeMarkers_NoOverlap(t *testing.T) {
	existing := []commercial.Marker{
		{StartMs: 1000, EndMs: 5000, Confidence: 0.85, Source: "comskip"},
	}
	incoming := []commercial.Marker{
		{StartMs: 10000, EndMs: 15000, Confidence: 0.92, Source: "comskip"},
	}
	result := commercial.MergeMarkers(existing, incoming)
	assert.Len(t, result, 2)
	assert.Equal(t, int64(1000), result[0].StartMs)
	assert.Equal(t, int64(10000), result[1].StartMs)
}

func TestMergeMarkers_FullOverlap(t *testing.T) {
	existing := []commercial.Marker{
		{StartMs: 1000, EndMs: 10000, Confidence: 0.85, Source: "comskip"},
	}
	incoming := []commercial.Marker{
		{StartMs: 2000, EndMs: 8000, Confidence: 0.95, Source: "ml"},
	}
	result := commercial.MergeMarkers(existing, incoming)
	assert.Len(t, result, 1)
	// Should keep the larger range and higher confidence.
	assert.Equal(t, int64(1000), result[0].StartMs)
	assert.Equal(t, int64(10000), result[0].EndMs)
	assert.Equal(t, 0.95, result[0].Confidence)
	assert.Equal(t, "ml", result[0].Source)
}

func TestMergeMarkers_PartialOverlap(t *testing.T) {
	existing := []commercial.Marker{
		{StartMs: 1000, EndMs: 5000, Confidence: 0.80, Source: "comskip"},
	}
	incoming := []commercial.Marker{
		{StartMs: 4000, EndMs: 8000, Confidence: 0.90, Source: "comskip"},
	}
	result := commercial.MergeMarkers(existing, incoming)
	assert.Len(t, result, 1)
	assert.Equal(t, int64(1000), result[0].StartMs)
	assert.Equal(t, int64(8000), result[0].EndMs)
	assert.Equal(t, 0.90, result[0].Confidence)
}

func TestMergeMarkers_MultipleOverlaps(t *testing.T) {
	existing := []commercial.Marker{
		{StartMs: 1000, EndMs: 3000, Confidence: 0.80, Source: "comskip"},
		{StartMs: 5000, EndMs: 7000, Confidence: 0.85, Source: "comskip"},
	}
	incoming := []commercial.Marker{
		{StartMs: 2500, EndMs: 5500, Confidence: 0.92, Source: "ml"},
	}
	// All three overlap in a chain: [1000-3000] overlaps [2500-5500] overlaps [5000-7000].
	result := commercial.MergeMarkers(existing, incoming)
	assert.Len(t, result, 1)
	assert.Equal(t, int64(1000), result[0].StartMs)
	assert.Equal(t, int64(7000), result[0].EndMs)
}

func TestMergeMarkers_SortedOutput(t *testing.T) {
	// Incoming markers are in reverse order.
	incoming := []commercial.Marker{
		{StartMs: 20000, EndMs: 25000, Confidence: 0.80, Source: "comskip"},
		{StartMs: 5000, EndMs: 10000, Confidence: 0.85, Source: "comskip"},
	}
	result := commercial.MergeMarkers(nil, incoming)
	assert.Len(t, result, 2)
	assert.Less(t, result[0].StartMs, result[1].StartMs)
}

func TestMergeMarkers_AdjacentNotMerged(t *testing.T) {
	existing := []commercial.Marker{
		{StartMs: 1000, EndMs: 5000, Confidence: 0.85, Source: "comskip"},
	}
	incoming := []commercial.Marker{
		{StartMs: 5001, EndMs: 10000, Confidence: 0.90, Source: "comskip"},
	}
	result := commercial.MergeMarkers(existing, incoming)
	assert.Len(t, result, 2, "adjacent but non-overlapping markers should not merge")
}
