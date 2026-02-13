// Package commercial provides commercial break detection using Comskip as the
// analysis backend. It supports both live-assist mode (5-minute segment batches)
// and full post-process mode for completed recordings.
//
// Detection confidence determines the UI action:
//   - >= 0.90: auto-skip without prompting
//   - 0.70-0.89: prompt user for skip confirmation
//   - < 0.70: ignored (likely false positive)
package commercial

import (
	"errors"
	"sort"
	"sync"
)

// Confidence thresholds for skip behaviour.
const (
	AutoSkipThreshold = 0.90
	PromptThreshold   = 0.70
)

// Sentinel errors.
var (
	ErrEmptyPath       = errors.New("commercial: segment path must not be empty")
	ErrComskipFailed   = errors.New("commercial: comskip analysis failed")
	ErrNilRunner       = errors.New("commercial: comskip runner must not be nil")
)

// Marker represents a detected commercial break with timing and confidence.
type Marker struct {
	// StartMs is the start of the commercial in milliseconds from recording start.
	StartMs int64

	// EndMs is the end of the commercial in milliseconds from recording start.
	EndMs int64

	// Confidence is a value between 0.0 and 1.0 indicating detection certainty.
	Confidence float64

	// Source identifies the detection engine (e.g. "comskip", "manual", "ml").
	Source string
}

// ComskipRunner abstracts the Comskip binary so it can be mocked in tests.
// The real implementation would shell out to the comskip CLI and parse its
// chapter/EDL output.
type ComskipRunner interface {
	// RunOnSegment analyses a single segment file and returns detected markers.
	RunOnSegment(segmentPath string) ([]Marker, error)

	// RunOnRecording analyses a complete recording file.
	RunOnRecording(recordingPath string) ([]Marker, error)
}

// Detector wraps a ComskipRunner with configurable thresholds and thread-safe
// marker accumulation for live-assist mode.
type Detector struct {
	mu              sync.Mutex
	runner          ComskipRunner
	autoSkip        float64
	prompt          float64
	accumulatedLive []Marker
}

// NewDetector creates a Detector backed by the given ComskipRunner.
// Custom thresholds can be supplied; zero values fall back to package defaults.
func NewDetector(runner ComskipRunner, autoSkipThreshold, promptThreshold float64) (*Detector, error) {
	if runner == nil {
		return nil, ErrNilRunner
	}

	autoSkip := autoSkipThreshold
	if autoSkip <= 0 {
		autoSkip = AutoSkipThreshold
	}
	prompt := promptThreshold
	if prompt <= 0 {
		prompt = PromptThreshold
	}

	return &Detector{
		runner:   runner,
		autoSkip: autoSkip,
		prompt:   prompt,
	}, nil
}

// AnalyzeSegment runs the comskip engine against a single segment (live-assist
// mode). Detected markers are accumulated internally and also returned.
func (d *Detector) AnalyzeSegment(segmentPath string) ([]Marker, error) {
	if segmentPath == "" {
		return nil, ErrEmptyPath
	}

	markers, err := d.runner.RunOnSegment(segmentPath)
	if err != nil {
		return nil, err
	}

	d.mu.Lock()
	d.accumulatedLive = MergeMarkers(d.accumulatedLive, markers)
	d.mu.Unlock()

	return markers, nil
}

// AnalyzeFullRecording runs the comskip engine against an entire recording file
// (post-process mode). This replaces any previously accumulated live markers.
func (d *Detector) AnalyzeFullRecording(recordingPath string) ([]Marker, error) {
	if recordingPath == "" {
		return nil, ErrEmptyPath
	}

	markers, err := d.runner.RunOnRecording(recordingPath)
	if err != nil {
		return nil, err
	}

	return markers, nil
}

// ShouldAutoSkip returns true when the marker confidence is at or above the
// auto-skip threshold (default 0.90).
func (d *Detector) ShouldAutoSkip(marker Marker) bool {
	return marker.Confidence >= d.autoSkip
}

// ShouldPrompt returns true when the marker confidence is in the "prompt" band:
// at or above the prompt threshold but below the auto-skip threshold.
func (d *Detector) ShouldPrompt(marker Marker) bool {
	return marker.Confidence >= d.prompt && marker.Confidence < d.autoSkip
}

// GetAccumulatedMarkers returns a copy of all markers accumulated during
// live-assist analysis.
func (d *Detector) GetAccumulatedMarkers() []Marker {
	d.mu.Lock()
	defer d.mu.Unlock()

	out := make([]Marker, len(d.accumulatedLive))
	copy(out, d.accumulatedLive)
	return out
}

// MergeMarkers combines two sorted marker slices, merging overlapping markers
// by taking the union of their time ranges and the higher confidence value.
// The result is sorted by StartMs.
func MergeMarkers(existing, incoming []Marker) []Marker {
	if len(existing) == 0 {
		sorted := make([]Marker, len(incoming))
		copy(sorted, incoming)
		sort.Slice(sorted, func(i, j int) bool { return sorted[i].StartMs < sorted[j].StartMs })
		return sorted
	}
	if len(incoming) == 0 {
		return existing
	}

	// Combine and sort all markers by start time.
	all := make([]Marker, 0, len(existing)+len(incoming))
	all = append(all, existing...)
	all = append(all, incoming...)
	sort.Slice(all, func(i, j int) bool { return all[i].StartMs < all[j].StartMs })

	// Merge overlapping intervals.
	merged := []Marker{all[0]}
	for i := 1; i < len(all); i++ {
		last := &merged[len(merged)-1]
		cur := all[i]

		if cur.StartMs <= last.EndMs {
			// Overlapping — extend end and take higher confidence.
			if cur.EndMs > last.EndMs {
				last.EndMs = cur.EndMs
			}
			if cur.Confidence > last.Confidence {
				last.Confidence = cur.Confidence
				last.Source = cur.Source
			}
		} else {
			merged = append(merged, cur)
		}
	}

	return merged
}
