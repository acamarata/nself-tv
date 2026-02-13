package tests

import (
	"testing"
	"time"

	"antserver/internal/scheduler"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockClock is a controllable clock for testing time-dependent behavior.
type mockClock struct {
	now time.Time
}

func (m *mockClock) Now() time.Time { return m.now }
func (m *mockClock) Advance(d time.Duration) { m.now = m.now.Add(d) }

func newMockClock() *mockClock {
	return &mockClock{now: time.Date(2026, 2, 13, 12, 0, 0, 0, time.UTC)}
}

// --- Event State Machine Tests ---

func TestCreateEvent(t *testing.T) {
	s := scheduler.New()
	start := time.Now().Add(1 * time.Hour)
	end := start.Add(3 * time.Hour)

	evt := s.CreateEvent("ESPN", start, end, scheduler.EventMetadata{
		League: "NBA",
		Title:  "Lakers vs Celtics",
	})

	assert.NotEmpty(t, evt.ID)
	assert.Equal(t, "ESPN", evt.Channel)
	assert.Equal(t, start, evt.StartTime)
	assert.Equal(t, end, evt.EndTime)
	assert.Equal(t, scheduler.StatePending, evt.State)
	assert.Equal(t, "NBA", evt.Metadata.League)
	assert.Equal(t, "Lakers vs Celtics", evt.Metadata.Title)
	assert.NotZero(t, evt.CreatedAt)
}

func TestCreateEventAutoEndTime(t *testing.T) {
	s := scheduler.New()
	start := time.Now().Add(1 * time.Hour)

	evt := s.CreateEvent("ESPN", start, time.Time{}, scheduler.EventMetadata{
		League: "NFL",
	})

	// NFL duration is 4 hours.
	expected := start.Add(4 * time.Hour)
	assert.Equal(t, expected, evt.EndTime)
}

func TestCreateEventAutoEndTimeNoLeague(t *testing.T) {
	s := scheduler.New()
	start := time.Now().Add(1 * time.Hour)

	evt := s.CreateEvent("ESPN", start, time.Time{}, scheduler.EventMetadata{})

	// Without a league, end time stays zero when no league provided.
	assert.True(t, evt.EndTime.IsZero())
}

func TestValidStateTransitions(t *testing.T) {
	tests := []struct {
		name   string
		states []scheduler.EventState
	}{
		{
			name: "full happy path",
			states: []scheduler.EventState{
				scheduler.StateScheduled,
				scheduler.StateActive,
				scheduler.StateRecording,
				scheduler.StateFinalizing,
				scheduler.StateComplete,
			},
		},
		{
			name: "pending to failed",
			states: []scheduler.EventState{
				scheduler.StateFailed,
			},
		},
		{
			name: "scheduled to failed",
			states: []scheduler.EventState{
				scheduler.StateScheduled,
				scheduler.StateFailed,
			},
		},
		{
			name: "active to failed",
			states: []scheduler.EventState{
				scheduler.StateScheduled,
				scheduler.StateActive,
				scheduler.StateFailed,
			},
		},
		{
			name: "recording to failed",
			states: []scheduler.EventState{
				scheduler.StateScheduled,
				scheduler.StateActive,
				scheduler.StateRecording,
				scheduler.StateFailed,
			},
		},
		{
			name: "finalizing to failed",
			states: []scheduler.EventState{
				scheduler.StateScheduled,
				scheduler.StateActive,
				scheduler.StateRecording,
				scheduler.StateFinalizing,
				scheduler.StateFailed,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := scheduler.New()
			evt := s.CreateEvent("test-ch", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

			for _, target := range tt.states {
				err := s.Transition(evt.ID, target)
				require.NoError(t, err, "transition to %s should succeed", target)
			}
		})
	}
}

func TestInvalidStateTransitions(t *testing.T) {
	tests := []struct {
		name    string
		setup   []scheduler.EventState
		target  scheduler.EventState
	}{
		{
			name:   "pending to active (skip scheduled)",
			setup:  nil,
			target: scheduler.StateActive,
		},
		{
			name:   "pending to recording (skip scheduled and active)",
			setup:  nil,
			target: scheduler.StateRecording,
		},
		{
			name:   "pending to complete (skip all)",
			setup:  nil,
			target: scheduler.StateComplete,
		},
		{
			name:   "scheduled to recording (skip active)",
			setup:  []scheduler.EventState{scheduler.StateScheduled},
			target: scheduler.StateRecording,
		},
		{
			name:   "complete to anything",
			setup:  []scheduler.EventState{scheduler.StateScheduled, scheduler.StateActive, scheduler.StateRecording, scheduler.StateFinalizing, scheduler.StateComplete},
			target: scheduler.StatePending,
		},
		{
			name:   "failed to anything",
			setup:  []scheduler.EventState{scheduler.StateFailed},
			target: scheduler.StatePending,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := scheduler.New()
			evt := s.CreateEvent("test-ch", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

			for _, state := range tt.setup {
				require.NoError(t, s.Transition(evt.ID, state))
			}

			err := s.Transition(evt.ID, tt.target)
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "invalid transition")
		})
	}
}

func TestTransitionNonExistentEvent(t *testing.T) {
	s := scheduler.New()
	err := s.Transition("nonexistent-id", scheduler.StateScheduled)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "event not found")
}

// --- Retry Logic Tests ---

func TestRetryTunerFailure(t *testing.T) {
	s := scheduler.New()
	evt := s.CreateEvent("test-ch", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

	// Tuner failure: 3 retries at 2 minute intervals.
	for i := 0; i < 3; i++ {
		allowed, err := s.Retry(evt.ID, scheduler.RetryTunerFailure)
		require.NoError(t, err)
		assert.True(t, allowed, "attempt %d should be allowed", i+1)
	}

	// Fourth attempt should be denied.
	allowed, err := s.Retry(evt.ID, scheduler.RetryTunerFailure)
	require.NoError(t, err)
	assert.False(t, allowed, "fourth attempt should be denied")
}

func TestRetryIngestFailure(t *testing.T) {
	s := scheduler.New()
	evt := s.CreateEvent("test-ch", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

	// Ingest failure: 5 retries at 30 second intervals.
	for i := 0; i < 5; i++ {
		allowed, err := s.Retry(evt.ID, scheduler.RetryIngestFailure)
		require.NoError(t, err)
		assert.True(t, allowed, "attempt %d should be allowed", i+1)
	}

	allowed, err := s.Retry(evt.ID, scheduler.RetryIngestFailure)
	require.NoError(t, err)
	assert.False(t, allowed, "sixth attempt should be denied")
}

func TestRetryDrift(t *testing.T) {
	s := scheduler.New()
	evt := s.CreateEvent("test-ch", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

	// Drift: 1 retry, immediate.
	allowed, err := s.Retry(evt.ID, scheduler.RetryDrift)
	require.NoError(t, err)
	assert.True(t, allowed)

	// Second drift attempt should be denied.
	allowed, err = s.Retry(evt.ID, scheduler.RetryDrift)
	require.NoError(t, err)
	assert.False(t, allowed)
}

func TestRetryDelays(t *testing.T) {
	s := scheduler.New()

	delay, err := s.GetRetryDelay(scheduler.RetryTunerFailure)
	require.NoError(t, err)
	assert.Equal(t, 2*time.Minute, delay)

	delay, err = s.GetRetryDelay(scheduler.RetryIngestFailure)
	require.NoError(t, err)
	assert.Equal(t, 30*time.Second, delay)

	delay, err = s.GetRetryDelay(scheduler.RetryDrift)
	require.NoError(t, err)
	assert.Equal(t, time.Duration(0), delay)
}

func TestRetryUnknownType(t *testing.T) {
	s := scheduler.New()
	evt := s.CreateEvent("test-ch", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

	_, err := s.Retry(evt.ID, scheduler.RetryType("unknown"))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unknown retry type")
}

func TestRetryNonExistentEvent(t *testing.T) {
	s := scheduler.New()
	_, err := s.Retry("nonexistent", scheduler.RetryTunerFailure)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "event not found")
}

// --- Drift Detection Tests ---

func TestDriftBeforeStartTime(t *testing.T) {
	clock := newMockClock()
	s := scheduler.NewWithClock(clock)

	start := clock.Now().Add(1 * time.Hour)
	evt := s.CreateEvent("test-ch", start, start.Add(3*time.Hour), scheduler.EventMetadata{})

	drift, exceeded, err := s.CheckDrift(evt.ID)
	require.NoError(t, err)
	assert.Equal(t, time.Duration(0), drift)
	assert.False(t, exceeded)
}

func TestDriftWithinThreshold(t *testing.T) {
	clock := newMockClock()
	s := scheduler.NewWithClock(clock)

	start := clock.Now()
	evt := s.CreateEvent("test-ch", start, start.Add(3*time.Hour), scheduler.EventMetadata{})

	// Advance 3 minutes (under 5 minute threshold).
	clock.Advance(3 * time.Minute)

	drift, exceeded, err := s.CheckDrift(evt.ID)
	require.NoError(t, err)
	assert.Equal(t, 3*time.Minute, drift)
	assert.False(t, exceeded)
}

func TestDriftExceedsThreshold(t *testing.T) {
	clock := newMockClock()
	s := scheduler.NewWithClock(clock)

	start := clock.Now()
	evt := s.CreateEvent("test-ch", start, start.Add(3*time.Hour), scheduler.EventMetadata{})

	// Advance 6 minutes (over 5 minute threshold).
	clock.Advance(6 * time.Minute)

	drift, exceeded, err := s.CheckDrift(evt.ID)
	require.NoError(t, err)
	assert.Equal(t, 6*time.Minute, drift)
	assert.True(t, exceeded)
}

func TestDriftExactThreshold(t *testing.T) {
	clock := newMockClock()
	s := scheduler.NewWithClock(clock)

	start := clock.Now()
	evt := s.CreateEvent("test-ch", start, start.Add(3*time.Hour), scheduler.EventMetadata{})

	// Advance exactly 5 minutes (at threshold, not exceeded).
	clock.Advance(5 * time.Minute)

	drift, exceeded, err := s.CheckDrift(evt.ID)
	require.NoError(t, err)
	assert.Equal(t, 5*time.Minute, drift)
	assert.False(t, exceeded)
}

func TestDriftNonExistentEvent(t *testing.T) {
	s := scheduler.New()
	_, _, err := s.CheckDrift("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "event not found")
}

// --- League Duration Tests ---

func TestLeagueDurations(t *testing.T) {
	tests := []struct {
		league   string
		expected time.Duration
	}{
		{"NFL", 4 * time.Hour},
		{"NBA", 3 * time.Hour},
		{"NHL", 3 * time.Hour},
		{"MLB", 4 * time.Hour},
		{"Soccer", 2*time.Hour + 30*time.Minute},
		{"MLS", 2*time.Hour + 30*time.Minute},
		{"EPL", 2*time.Hour + 30*time.Minute},
		{"UEFA", 2*time.Hour + 30*time.Minute},
		{"Unknown", 3 * time.Hour},
		{"", 3 * time.Hour},
	}

	for _, tt := range tests {
		t.Run(tt.league, func(t *testing.T) {
			assert.Equal(t, tt.expected, scheduler.LeagueDuration(tt.league))
		})
	}
}

// --- List and Get Tests ---

func TestListEvents(t *testing.T) {
	s := scheduler.New()

	// Empty list initially.
	events := s.ListEvents()
	assert.Empty(t, events)

	// Create some events.
	s.CreateEvent("ch1", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})
	s.CreateEvent("ch2", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

	events = s.ListEvents()
	assert.Len(t, events, 2)
}

func TestGetEventNotFound(t *testing.T) {
	s := scheduler.New()
	_, err := s.GetEvent("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "event not found")
}

func TestGetEventReturnsCopy(t *testing.T) {
	s := scheduler.New()
	evt := s.CreateEvent("test-ch", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

	copy1, err := s.GetEvent(evt.ID)
	require.NoError(t, err)

	// Mutating the copy should not affect the original.
	copy1.Channel = "mutated"
	copy1.RetryAttempts[scheduler.RetryDrift] = 999

	copy2, err := s.GetEvent(evt.ID)
	require.NoError(t, err)
	assert.Equal(t, "test-ch", copy2.Channel)
	assert.Equal(t, 0, copy2.RetryAttempts[scheduler.RetryDrift])
}

// --- Default Policy Tests ---

func TestDefaultRetryPolicies(t *testing.T) {
	policies := scheduler.DefaultRetryPolicies()

	tuner := policies[scheduler.RetryTunerFailure]
	assert.Equal(t, 3, tuner.MaxAttempts)
	assert.Equal(t, 2*time.Minute, tuner.Delay)

	ingest := policies[scheduler.RetryIngestFailure]
	assert.Equal(t, 5, ingest.MaxAttempts)
	assert.Equal(t, 30*time.Second, ingest.Delay)

	drift := policies[scheduler.RetryDrift]
	assert.Equal(t, 1, drift.MaxAttempts)
	assert.Equal(t, time.Duration(0), drift.Delay)
}

func TestDefaultDriftConfig(t *testing.T) {
	cfg := scheduler.DefaultDriftConfig()
	assert.Equal(t, 1*time.Minute, cfg.CheckInterval)
	assert.Equal(t, 5*time.Minute, cfg.MaxDrift)
}
