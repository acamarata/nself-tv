// Package scheduler manages event lifecycle, state transitions, retry policies,
// and drift detection for scheduled recording events.
package scheduler

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

// EventState represents the current state of a scheduled event.
type EventState string

const (
	StatePending    EventState = "pending"
	StateScheduled  EventState = "scheduled"
	StateActive     EventState = "active"
	StateRecording  EventState = "recording"
	StateFinalizing EventState = "finalizing"
	StateComplete   EventState = "complete"
	StateFailed     EventState = "failed"
)

// validTransitions defines which state transitions are allowed.
var validTransitions = map[EventState][]EventState{
	StatePending:    {StateScheduled, StateFailed},
	StateScheduled:  {StateActive, StateFailed},
	StateActive:     {StateRecording, StateFailed},
	StateRecording:  {StateFinalizing, StateFailed},
	StateFinalizing: {StateComplete, StateFailed},
}

// RetryType categorizes retriable failure modes.
type RetryType string

const (
	RetryTunerFailure  RetryType = "tuner_failure"
	RetryIngestFailure RetryType = "ingest_failure"
	RetryDrift         RetryType = "drift"
)

// RetryPolicy defines the retry behavior for a specific failure type.
type RetryPolicy struct {
	MaxAttempts int
	Delay       time.Duration
}

// DefaultRetryPolicies returns the standard retry policies for each failure type.
func DefaultRetryPolicies() map[RetryType]RetryPolicy {
	return map[RetryType]RetryPolicy{
		RetryTunerFailure:  {MaxAttempts: 3, Delay: 2 * time.Minute},
		RetryIngestFailure: {MaxAttempts: 5, Delay: 30 * time.Second},
		RetryDrift:         {MaxAttempts: 1, Delay: 0},
	}
}

// LeagueDuration returns the expected recording duration for a sports league.
func LeagueDuration(league string) time.Duration {
	switch league {
	case "NFL":
		return 4 * time.Hour
	case "NBA":
		return 3 * time.Hour
	case "NHL":
		return 3 * time.Hour
	case "MLB":
		return 4 * time.Hour
	case "Soccer", "MLS", "EPL", "UEFA":
		return 2*time.Hour + 30*time.Minute
	default:
		return 3 * time.Hour
	}
}

// DriftConfig controls drift detection parameters.
type DriftConfig struct {
	CheckInterval time.Duration
	MaxDrift      time.Duration
}

// DefaultDriftConfig returns the standard drift detection configuration.
func DefaultDriftConfig() DriftConfig {
	return DriftConfig{
		CheckInterval: 1 * time.Minute,
		MaxDrift:      5 * time.Minute,
	}
}

// EventMetadata holds supplementary information about an event.
type EventMetadata struct {
	League      string            `json:"league,omitempty"`
	Sport       string            `json:"sport,omitempty"`
	Title       string            `json:"title,omitempty"`
	Description string            `json:"description,omitempty"`
	Tags        map[string]string `json:"tags,omitempty"`
}

// Event represents a scheduled recording event.
type Event struct {
	ID        string        `json:"id"`
	Channel   string        `json:"channel"`
	StartTime time.Time     `json:"start_time"`
	EndTime   time.Time     `json:"end_time"`
	State     EventState    `json:"state"`
	Metadata  EventMetadata `json:"metadata"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`

	// RetryAttempts tracks retries per failure type.
	RetryAttempts map[RetryType]int `json:"retry_attempts"`
}

// TimeProvider is an interface for getting the current time, enabling test injection.
type TimeProvider interface {
	Now() time.Time
}

// RealClock implements TimeProvider using the system clock.
type RealClock struct{}

// Now returns the current system time.
func (RealClock) Now() time.Time { return time.Now() }

// Scheduler manages the lifecycle of recording events.
type Scheduler struct {
	mu            sync.RWMutex
	events        map[string]*Event
	retryPolicies map[RetryType]RetryPolicy
	driftConfig   DriftConfig
	clock         TimeProvider
}

// New creates a new Scheduler with default policies.
func New() *Scheduler {
	return &Scheduler{
		events:        make(map[string]*Event),
		retryPolicies: DefaultRetryPolicies(),
		driftConfig:   DefaultDriftConfig(),
		clock:         RealClock{},
	}
}

// NewWithClock creates a new Scheduler with a custom time provider (for testing).
func NewWithClock(clock TimeProvider) *Scheduler {
	return &Scheduler{
		events:        make(map[string]*Event),
		retryPolicies: DefaultRetryPolicies(),
		driftConfig:   DefaultDriftConfig(),
		clock:         clock,
	}
}

// CreateEvent creates a new event and places it into the pending state.
// If the metadata includes a league and end time is zero, the end time is
// computed from the league's default duration.
func (s *Scheduler) CreateEvent(channel string, startTime, endTime time.Time, metadata EventMetadata) *Event {
	now := s.clock.Now()

	if endTime.IsZero() && metadata.League != "" {
		endTime = startTime.Add(LeagueDuration(metadata.League))
	}

	evt := &Event{
		ID:            uuid.New().String(),
		Channel:       channel,
		StartTime:     startTime,
		EndTime:       endTime,
		State:         StatePending,
		Metadata:      metadata,
		CreatedAt:     now,
		UpdatedAt:     now,
		RetryAttempts: make(map[RetryType]int),
	}

	s.mu.Lock()
	s.events[evt.ID] = evt
	s.mu.Unlock()

	log.WithFields(log.Fields{
		"event_id": evt.ID,
		"channel":  channel,
		"start":    startTime,
		"end":      endTime,
		"state":    evt.State,
	}).Info("event created")

	return evt
}

// Transition moves an event to the given target state if the transition is valid.
func (s *Scheduler) Transition(eventID string, target EventState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	evt, ok := s.events[eventID]
	if !ok {
		return fmt.Errorf("event not found: %s", eventID)
	}

	if !isValidTransition(evt.State, target) {
		return fmt.Errorf("invalid transition: %s -> %s", evt.State, target)
	}

	old := evt.State
	evt.State = target
	evt.UpdatedAt = s.clock.Now()

	log.WithFields(log.Fields{
		"event_id": eventID,
		"from":     old,
		"to":       target,
	}).Info("event state transition")

	return nil
}

// Retry attempts to retry a failed operation for the given event and retry type.
// It returns true if the retry is allowed (under max attempts), false if exhausted.
func (s *Scheduler) Retry(eventID string, retryType RetryType) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	evt, ok := s.events[eventID]
	if !ok {
		return false, fmt.Errorf("event not found: %s", eventID)
	}

	policy, ok := s.retryPolicies[retryType]
	if !ok {
		return false, fmt.Errorf("unknown retry type: %s", retryType)
	}

	current := evt.RetryAttempts[retryType]
	if current >= policy.MaxAttempts {
		log.WithFields(log.Fields{
			"event_id":   eventID,
			"retry_type": retryType,
			"attempts":   current,
			"max":        policy.MaxAttempts,
		}).Warn("retry attempts exhausted")
		return false, nil
	}

	evt.RetryAttempts[retryType] = current + 1
	evt.UpdatedAt = s.clock.Now()

	log.WithFields(log.Fields{
		"event_id":   eventID,
		"retry_type": retryType,
		"attempt":    current + 1,
		"max":        policy.MaxAttempts,
		"delay":      policy.Delay,
	}).Info("retry scheduled")

	return true, nil
}

// GetRetryDelay returns the delay for the given retry type.
func (s *Scheduler) GetRetryDelay(retryType RetryType) (time.Duration, error) {
	policy, ok := s.retryPolicies[retryType]
	if !ok {
		return 0, fmt.Errorf("unknown retry type: %s", retryType)
	}
	return policy.Delay, nil
}

// CheckDrift determines whether the event's actual start has drifted beyond
// the acceptable threshold. Returns the drift duration and whether it exceeds the max.
func (s *Scheduler) CheckDrift(eventID string) (time.Duration, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	evt, ok := s.events[eventID]
	if !ok {
		return 0, false, fmt.Errorf("event not found: %s", eventID)
	}

	now := s.clock.Now()
	if now.Before(evt.StartTime) {
		return 0, false, nil
	}

	drift := now.Sub(evt.StartTime)
	exceeded := drift > s.driftConfig.MaxDrift

	if exceeded {
		log.WithFields(log.Fields{
			"event_id":  eventID,
			"drift":     drift,
			"max_drift": s.driftConfig.MaxDrift,
		}).Warn("drift threshold exceeded")
	}

	return drift, exceeded, nil
}

// GetEvent returns a copy of the event with the given ID.
func (s *Scheduler) GetEvent(eventID string) (*Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	evt, ok := s.events[eventID]
	if !ok {
		return nil, fmt.Errorf("event not found: %s", eventID)
	}

	// Return a copy to prevent external mutation.
	copy := *evt
	copyRetries := make(map[RetryType]int, len(evt.RetryAttempts))
	for k, v := range evt.RetryAttempts {
		copyRetries[k] = v
	}
	copy.RetryAttempts = copyRetries
	return &copy, nil
}

// ListEvents returns a snapshot of all events.
func (s *Scheduler) ListEvents() []*Event {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*Event, 0, len(s.events))
	for _, evt := range s.events {
		copy := *evt
		result = append(result, &copy)
	}
	return result
}

// isValidTransition checks if moving from current to target state is allowed.
func isValidTransition(current, target EventState) bool {
	allowed, ok := validTransitions[current]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == target {
			return true
		}
	}
	return false
}
