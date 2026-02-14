package session

import (
	"context"
	"sync"
	"time"

	"stream_gateway/internal/admission"
)

// ConcurrencyTracker tracks concurrent streams using in-memory maps with
// sync.RWMutex for thread safety. This implementation is suitable for
// single-instance deployments; Redis-backed tracking will replace this later.
type ConcurrencyTracker struct {
	mu       sync.RWMutex
	sessions map[string]*trackedSession // sessionID -> tracked session

	// Index maps for fast lookups.
	familyIndex map[string]map[string]struct{} // familyID -> set of sessionIDs
	deviceIndex map[string]map[string]struct{} // deviceID -> set of sessionIDs

	// heartbeatTimeout is how long a session can go without a heartbeat
	// before being considered stale.
	heartbeatTimeout time.Duration
}

// trackedSession holds a session and its last heartbeat time.
type trackedSession struct {
	session       *admission.StreamSession
	lastHeartbeat time.Time
}

// NewConcurrencyTracker creates a new in-memory concurrency tracker.
// heartbeatTimeout defines how long a session can go without a heartbeat
// before being eligible for cleanup (default 5 minutes if zero).
func NewConcurrencyTracker(heartbeatTimeout time.Duration) *ConcurrencyTracker {
	if heartbeatTimeout == 0 {
		heartbeatTimeout = 5 * time.Minute
	}
	return &ConcurrencyTracker{
		sessions:         make(map[string]*trackedSession),
		familyIndex:      make(map[string]map[string]struct{}),
		deviceIndex:      make(map[string]map[string]struct{}),
		heartbeatTimeout: heartbeatTimeout,
	}
}

// GetFamilyStreamCount returns the number of active sessions for a family.
func (ct *ConcurrencyTracker) GetFamilyStreamCount(ctx context.Context, familyID string) (int, error) {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	sessionIDs, ok := ct.familyIndex[familyID]
	if !ok {
		return 0, nil
	}
	return len(sessionIDs), nil
}

// GetDeviceStreamCount returns the number of active sessions for a device.
func (ct *ConcurrencyTracker) GetDeviceStreamCount(ctx context.Context, deviceID string) (int, error) {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	sessionIDs, ok := ct.deviceIndex[deviceID]
	if !ok {
		return 0, nil
	}
	return len(sessionIDs), nil
}

// RegisterSession adds a session to the concurrency tracking maps.
func (ct *ConcurrencyTracker) RegisterSession(ctx context.Context, session *admission.StreamSession) error {
	if session == nil {
		return nil
	}

	ct.mu.Lock()
	defer ct.mu.Unlock()

	ct.sessions[session.ID] = &trackedSession{
		session:       session,
		lastHeartbeat: time.Now(),
	}

	// Add to family index.
	if ct.familyIndex[session.FamilyID] == nil {
		ct.familyIndex[session.FamilyID] = make(map[string]struct{})
	}
	ct.familyIndex[session.FamilyID][session.ID] = struct{}{}

	// Add to device index.
	if ct.deviceIndex[session.DeviceID] == nil {
		ct.deviceIndex[session.DeviceID] = make(map[string]struct{})
	}
	ct.deviceIndex[session.DeviceID][session.ID] = struct{}{}

	return nil
}

// UnregisterSession removes a session from all tracking maps.
func (ct *ConcurrencyTracker) UnregisterSession(ctx context.Context, sessionID string) error {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	tracked, ok := ct.sessions[sessionID]
	if !ok {
		return nil // Already unregistered or never registered.
	}

	ct.removeSessionLocked(sessionID, tracked.session)
	return nil
}

// RecordHeartbeat updates the last-seen timestamp for a session.
func (ct *ConcurrencyTracker) RecordHeartbeat(ctx context.Context, sessionID string) error {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	tracked, ok := ct.sessions[sessionID]
	if !ok {
		return nil // Session not tracked (may be using Redis-backed session manager).
	}

	tracked.lastHeartbeat = time.Now()
	return nil
}

// CleanupExpired removes sessions that have expired (past ExpiresAt) or
// have not received a heartbeat within the heartbeat timeout (5 min default).
func (ct *ConcurrencyTracker) CleanupExpired(ctx context.Context) error {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	now := time.Now()
	var toRemove []string

	for id, tracked := range ct.sessions {
		expired := now.After(tracked.session.ExpiresAt)
		stale := now.Sub(tracked.lastHeartbeat) > ct.heartbeatTimeout

		if expired || stale {
			toRemove = append(toRemove, id)
		}
	}

	for _, id := range toRemove {
		tracked := ct.sessions[id]
		ct.removeSessionLocked(id, tracked.session)
	}

	return nil
}

// GetAllSessions returns all currently tracked sessions. This is primarily
// for administrative listing.
func (ct *ConcurrencyTracker) GetAllSessions(ctx context.Context) []*admission.StreamSession {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	result := make([]*admission.StreamSession, 0, len(ct.sessions))
	for _, tracked := range ct.sessions {
		result = append(result, tracked.session)
	}
	return result
}

// removeSessionLocked removes a session from all maps. Must be called with
// ct.mu held in write mode.
func (ct *ConcurrencyTracker) removeSessionLocked(sessionID string, sess *admission.StreamSession) {
	delete(ct.sessions, sessionID)

	// Remove from family index.
	if familySessions, ok := ct.familyIndex[sess.FamilyID]; ok {
		delete(familySessions, sessionID)
		if len(familySessions) == 0 {
			delete(ct.familyIndex, sess.FamilyID)
		}
	}

	// Remove from device index.
	if deviceSessions, ok := ct.deviceIndex[sess.DeviceID]; ok {
		delete(deviceSessions, sessionID)
		if len(deviceSessions) == 0 {
			delete(ct.deviceIndex, sess.DeviceID)
		}
	}
}
