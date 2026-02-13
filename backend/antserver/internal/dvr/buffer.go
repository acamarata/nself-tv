// Package dvr provides a time-shift ring buffer for live TV DVR functionality.
// Segments are appended as they arrive from the live stream and automatically
// evicted when the buffer exceeds the configured maximum duration.
package dvr

import (
	"errors"
	"sync"
	"time"
)

// Default and limit constants for the ring buffer.
const (
	DefaultMaxDuration = 6 * time.Hour
	AbsoluteMaxDuration = 10 * time.Hour
)

// Sentinel errors returned by buffer operations.
var (
	ErrBufferEmpty    = errors.New("dvr: buffer is empty")
	ErrInvalidRange   = errors.New("dvr: start must be before end")
	ErrZeroDuration   = errors.New("dvr: max duration must be positive")
	ErrExceedsMaximum = errors.New("dvr: max duration exceeds absolute maximum of 10h")
)

// Segment represents a single HLS/DASH segment stored in the DVR buffer.
type Segment struct {
	// Index is a monotonically increasing segment identifier.
	Index int64

	// StartTime is when this segment begins in wall-clock time.
	StartTime time.Time

	// Duration is the playback length of this segment.
	Duration time.Duration

	// Data holds the segment payload. In production this would typically be a
	// file path; bytes are used here to simplify testing.
	Data []byte

	// Size is the byte length of the segment payload.
	Size int64
}

// RingBuffer is a concurrency-safe, duration-bounded ring buffer for DVR
// time-shift playback. Segments are stored in chronological order and the
// oldest segments are evicted once the total buffered duration exceeds
// MaxDuration.
type RingBuffer struct {
	mu          sync.RWMutex
	segments    []Segment
	maxDuration time.Duration
}

// NewRingBuffer creates a RingBuffer with the given maximum duration.
// If maxDuration is zero the default of 6 hours is used. Durations exceeding
// the absolute maximum of 10 hours are rejected.
func NewRingBuffer(maxDuration time.Duration) (*RingBuffer, error) {
	if maxDuration < 0 {
		return nil, ErrZeroDuration
	}
	if maxDuration == 0 {
		maxDuration = DefaultMaxDuration
	}
	if maxDuration > AbsoluteMaxDuration {
		return nil, ErrExceedsMaximum
	}

	return &RingBuffer{
		segments:    make([]Segment, 0, 256),
		maxDuration: maxDuration,
	}, nil
}

// Write appends a segment to the buffer and evicts the oldest segments
// if the total buffered duration would exceed MaxDuration.
func (rb *RingBuffer) Write(seg Segment) error {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	rb.segments = append(rb.segments, seg)
	rb.evict()
	return nil
}

// Seek returns the segment closest to the given offset from the live edge.
// A positive offset means "this far behind live". If the offset falls before
// the earliest buffered time the earliest segment is returned. If the offset
// is zero or negative the latest (live) segment is returned.
func (rb *RingBuffer) Seek(offset time.Duration) (Segment, error) {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if len(rb.segments) == 0 {
		return Segment{}, ErrBufferEmpty
	}

	// Offset <= 0 means "jump to live".
	if offset <= 0 {
		return rb.segments[len(rb.segments)-1], nil
	}

	live := rb.segments[len(rb.segments)-1]
	target := live.StartTime.Add(-offset)

	// Before earliest available — clamp to oldest segment.
	if target.Before(rb.segments[0].StartTime) {
		return rb.segments[0], nil
	}

	// Find the segment whose time range contains the target.
	best := rb.segments[0]
	for _, seg := range rb.segments {
		if seg.StartTime.After(target) {
			break
		}
		best = seg
	}
	return best, nil
}

// GetRange returns all segments whose start time falls within [now-end, now-start]
// measured backwards from the live edge. start and end are durations behind live
// where start < end (start is closer to live). For example GetRange(10s, 60s)
// returns segments from 60 seconds ago up to 10 seconds ago.
func (rb *RingBuffer) GetRange(start, end time.Duration) ([]Segment, error) {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if len(rb.segments) == 0 {
		return nil, ErrBufferEmpty
	}

	if start >= end {
		return nil, ErrInvalidRange
	}

	live := rb.segments[len(rb.segments)-1]
	rangeStart := live.StartTime.Add(-end)   // further back in time
	rangeEnd := live.StartTime.Add(-start)   // closer to live

	// Clamp to buffer boundaries.
	oldest := rb.segments[0].StartTime
	if rangeStart.Before(oldest) {
		rangeStart = oldest
	}

	var result []Segment
	for _, seg := range rb.segments {
		segEnd := seg.StartTime.Add(seg.Duration)
		// Segment overlaps range if it starts before rangeEnd and ends after rangeStart.
		if seg.StartTime.Before(rangeEnd) && segEnd.After(rangeStart) {
			result = append(result, seg)
		}
	}
	return result, nil
}

// JumpToLive returns the most recent segment in the buffer.
func (rb *RingBuffer) JumpToLive() (Segment, error) {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if len(rb.segments) == 0 {
		return Segment{}, ErrBufferEmpty
	}
	return rb.segments[len(rb.segments)-1], nil
}

// GetBufferDuration returns the total time span from the oldest segment's
// start to the newest segment's end.
func (rb *RingBuffer) GetBufferDuration() time.Duration {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if len(rb.segments) == 0 {
		return 0
	}

	oldest := rb.segments[0].StartTime
	newest := rb.segments[len(rb.segments)-1]
	return newest.StartTime.Add(newest.Duration).Sub(oldest)
}

// GetOldestTime returns the start time of the oldest buffered segment.
// Returns zero time if the buffer is empty.
func (rb *RingBuffer) GetOldestTime() time.Time {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if len(rb.segments) == 0 {
		return time.Time{}
	}
	return rb.segments[0].StartTime
}

// Len returns the number of segments currently in the buffer.
func (rb *RingBuffer) Len() int {
	rb.mu.RLock()
	defer rb.mu.RUnlock()
	return len(rb.segments)
}

// evict removes the oldest segments until total duration is within maxDuration.
// Must be called with rb.mu held for writing.
func (rb *RingBuffer) evict() {
	if len(rb.segments) < 2 {
		return
	}

	newest := rb.segments[len(rb.segments)-1]
	liveEdge := newest.StartTime.Add(newest.Duration)

	cutoff := 0
	for i, seg := range rb.segments {
		if liveEdge.Sub(seg.StartTime) <= rb.maxDuration {
			cutoff = i
			break
		}
		// If this is the last segment before the one we want to keep, mark the next.
		if i == len(rb.segments)-1 {
			cutoff = i
		}
	}

	if cutoff > 0 {
		// Shift remaining segments to the front to allow GC of evicted data.
		remaining := make([]Segment, len(rb.segments)-cutoff)
		copy(remaining, rb.segments[cutoff:])
		rb.segments = remaining
	}
}
