package tests

import (
	"sync"
	"testing"
	"time"

	"antserver/internal/dvr"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// helper creates a segment with the given index starting at base + offset.
func makeSegment(index int64, base time.Time, offsetSec int, durationSec int) dvr.Segment {
	return dvr.Segment{
		Index:     index,
		StartTime: base.Add(time.Duration(offsetSec) * time.Second),
		Duration:  time.Duration(durationSec) * time.Second,
		Data:      []byte("segment-data"),
		Size:      12,
	}
}

func TestNewRingBuffer_Defaults(t *testing.T) {
	rb, err := dvr.NewRingBuffer(0)
	require.NoError(t, err)
	assert.NotNil(t, rb)
	assert.Equal(t, 0, rb.Len())
	assert.Equal(t, time.Duration(0), rb.GetBufferDuration())
}

func TestNewRingBuffer_CustomDuration(t *testing.T) {
	rb, err := dvr.NewRingBuffer(2 * time.Hour)
	require.NoError(t, err)
	assert.NotNil(t, rb)
}

func TestNewRingBuffer_NegativeDuration(t *testing.T) {
	_, err := dvr.NewRingBuffer(-1 * time.Second)
	assert.ErrorIs(t, err, dvr.ErrZeroDuration)
}

func TestNewRingBuffer_ExceedsMaximum(t *testing.T) {
	_, err := dvr.NewRingBuffer(11 * time.Hour)
	assert.ErrorIs(t, err, dvr.ErrExceedsMaximum)
}

func TestNewRingBuffer_ExactMaximum(t *testing.T) {
	rb, err := dvr.NewRingBuffer(10 * time.Hour)
	require.NoError(t, err)
	assert.NotNil(t, rb)
}

func TestWrite_SingleSegment(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	err = rb.Write(makeSegment(1, base, 0, 6))
	require.NoError(t, err)
	assert.Equal(t, 1, rb.Len())
}

func TestWrite_MultipleSegments(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	for i := int64(0); i < 100; i++ {
		err := rb.Write(makeSegment(i, base, int(i)*6, 6))
		require.NoError(t, err)
	}
	assert.Equal(t, 100, rb.Len())
}

func TestWrite_EvictsOldSegments(t *testing.T) {
	// Buffer holds max 30 seconds. Each segment is 6 seconds.
	// After writing 10 segments (60s total), buffer should evict oldest.
	rb, err := dvr.NewRingBuffer(30 * time.Second)
	require.NoError(t, err)

	base := time.Now()
	for i := int64(0); i < 10; i++ {
		err := rb.Write(makeSegment(i, base, int(i)*6, 6))
		require.NoError(t, err)
	}

	// Buffer should have evicted enough segments to be <= 30s.
	dur := rb.GetBufferDuration()
	assert.LessOrEqual(t, dur, 30*time.Second)
	assert.Less(t, rb.Len(), 10)
}

func TestSeek_EmptyBuffer(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	_, err = rb.Seek(10 * time.Second)
	assert.ErrorIs(t, err, dvr.ErrBufferEmpty)
}

func TestSeek_ZeroOffset_ReturnsLive(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))
	rb.Write(makeSegment(2, base, 6, 6))
	rb.Write(makeSegment(3, base, 12, 6))

	seg, err := rb.Seek(0)
	require.NoError(t, err)
	assert.Equal(t, int64(3), seg.Index)
}

func TestSeek_NegativeOffset_ReturnsLive(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))
	rb.Write(makeSegment(2, base, 6, 6))

	seg, err := rb.Seek(-5 * time.Second)
	require.NoError(t, err)
	assert.Equal(t, int64(2), seg.Index)
}

func TestSeek_ValidOffset(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))
	rb.Write(makeSegment(2, base, 6, 6))
	rb.Write(makeSegment(3, base, 12, 6))
	rb.Write(makeSegment(4, base, 18, 6))

	// Seek 10 seconds behind live (segment 4 starts at 18s).
	// Target = 18s - 10s = 8s from base -> should land in segment 2 (starts at 6s).
	seg, err := rb.Seek(10 * time.Second)
	require.NoError(t, err)
	assert.Equal(t, int64(2), seg.Index)
}

func TestSeek_BeforeBuffer_ClampsToOldest(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))
	rb.Write(makeSegment(2, base, 6, 6))

	// Seek way behind — should clamp to segment 1.
	seg, err := rb.Seek(time.Hour)
	require.NoError(t, err)
	assert.Equal(t, int64(1), seg.Index)
}

func TestJumpToLive_EmptyBuffer(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	_, err = rb.JumpToLive()
	assert.ErrorIs(t, err, dvr.ErrBufferEmpty)
}

func TestJumpToLive_ReturnsLatest(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))
	rb.Write(makeSegment(2, base, 6, 6))
	rb.Write(makeSegment(3, base, 12, 6))

	seg, err := rb.JumpToLive()
	require.NoError(t, err)
	assert.Equal(t, int64(3), seg.Index)
}

func TestGetRange_EmptyBuffer(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	_, err = rb.GetRange(0, 10*time.Second)
	assert.ErrorIs(t, err, dvr.ErrBufferEmpty)
}

func TestGetRange_InvalidRange(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))

	_, err = rb.GetRange(10*time.Second, 5*time.Second)
	assert.ErrorIs(t, err, dvr.ErrInvalidRange)
}

func TestGetRange_EqualStartEnd(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))

	_, err = rb.GetRange(5*time.Second, 5*time.Second)
	assert.ErrorIs(t, err, dvr.ErrInvalidRange)
}

func TestGetRange_ReturnsCorrectSegments(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	// Segments at 0s, 6s, 12s, 18s, 24s (each 6s duration)
	for i := int64(0); i < 5; i++ {
		rb.Write(makeSegment(i, base, int(i)*6, 6))
	}

	// Get range from 6s behind live to 18s behind live.
	// Live edge is segment 4 (starts 24s). So:
	//   rangeEnd   = 24s - 6s  = 18s from base
	//   rangeStart = 24s - 18s = 6s from base
	// Segments overlapping [6s, 18s]: segment 1 (6-12s), segment 2 (12-18s)
	segs, err := rb.GetRange(6*time.Second, 18*time.Second)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(segs), 2)

	// All returned segments should be within the expected range.
	for _, seg := range segs {
		segEnd := seg.StartTime.Add(seg.Duration)
		assert.True(t, segEnd.After(base.Add(6*time.Second)), "segment ends too early")
		assert.True(t, seg.StartTime.Before(base.Add(18*time.Second)), "segment starts too late")
	}
}

func TestGetBufferDuration(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	assert.Equal(t, time.Duration(0), rb.GetBufferDuration())

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))
	assert.Equal(t, 6*time.Second, rb.GetBufferDuration())

	rb.Write(makeSegment(2, base, 6, 6))
	assert.Equal(t, 12*time.Second, rb.GetBufferDuration())
}

func TestGetOldestTime_EmptyBuffer(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)
	assert.True(t, rb.GetOldestTime().IsZero())
}

func TestGetOldestTime_WithSegments(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Hour)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))
	rb.Write(makeSegment(2, base, 6, 6))

	assert.Equal(t, base, rb.GetOldestTime())
}

func TestGetOldestTime_AfterEviction(t *testing.T) {
	rb, err := dvr.NewRingBuffer(18 * time.Second)
	require.NoError(t, err)

	base := time.Now()
	for i := int64(0); i < 10; i++ {
		rb.Write(makeSegment(i, base, int(i)*6, 6))
	}

	oldest := rb.GetOldestTime()
	assert.True(t, oldest.After(base), "oldest time should have advanced after eviction")
}

func TestConcurrentAccess(t *testing.T) {
	rb, err := dvr.NewRingBuffer(time.Minute)
	require.NoError(t, err)

	base := time.Now()
	var wg sync.WaitGroup

	// Writers.
	for w := 0; w < 5; w++ {
		wg.Add(1)
		go func(writer int) {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				idx := int64(writer*100 + i)
				offset := int(idx) * 6
				rb.Write(makeSegment(idx, base, offset, 6))
			}
		}(w)
	}

	// Readers.
	for r := 0; r < 5; r++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				rb.Len()
				rb.GetBufferDuration()
				rb.GetOldestTime()
				rb.JumpToLive()
				rb.Seek(10 * time.Second)
			}
		}()
	}

	wg.Wait()
	assert.Greater(t, rb.Len(), 0)
}

func TestEviction_LeavesAtLeastOneSegment(t *testing.T) {
	// Even with a very short max duration, at least one segment should remain.
	rb, err := dvr.NewRingBuffer(1 * time.Millisecond)
	require.NoError(t, err)

	base := time.Now()
	rb.Write(makeSegment(1, base, 0, 6))
	rb.Write(makeSegment(2, base, 6, 6))

	assert.GreaterOrEqual(t, rb.Len(), 1)
}
