package session

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// StreamSession represents an active playback session stored in Redis.
type StreamSession struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	MediaID   string    `json:"mediaId"`
	DeviceID  string    `json:"deviceId"`
	FamilyID  string    `json:"familyId"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// Redis key prefixes for session storage.
const (
	keyPrefixSession = "stream:session:"
	keyPrefixFamily  = "stream:family:"
	keyPrefixDevice  = "stream:device:"
)

// Manager handles stream session lifecycle in Redis.
type Manager struct {
	client     *redis.Client
	log        *logrus.Logger
	sessionTTL time.Duration
}

// NewManager creates a new session manager from a Redis URL.
func NewManager(redisURL string, sessionTTL time.Duration, log *logrus.Logger) (*Manager, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing redis URL: %w", err)
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return &Manager{
		client:     client,
		log:        log,
		sessionTTL: sessionTTL,
	}, nil
}

// CreateSession creates a new stream session and stores it in Redis.
// It sets up three key structures:
//   - session:<id> -> session JSON (with TTL)
//   - family:<familyId> -> set of session IDs
//   - device:<deviceId> -> set of session IDs
func (m *Manager) CreateSession(ctx context.Context, userID, mediaID, deviceID, familyID string) (*StreamSession, error) {
	sessionID := uuid.New().String()
	now := time.Now().UTC()

	sess := &StreamSession{
		ID:        sessionID,
		UserID:    userID,
		MediaID:   mediaID,
		DeviceID:  deviceID,
		FamilyID:  familyID,
		CreatedAt: now,
		ExpiresAt: now.Add(m.sessionTTL),
	}

	data, err := json.Marshal(sess)
	if err != nil {
		return nil, fmt.Errorf("marshaling session: %w", err)
	}

	pipe := m.client.Pipeline()

	// Store session data with TTL.
	sessionKey := keyPrefixSession + sessionID
	pipe.Set(ctx, sessionKey, data, m.sessionTTL)

	// Add session ID to family set.
	familyKey := keyPrefixFamily + familyID
	pipe.SAdd(ctx, familyKey, sessionID)
	pipe.Expire(ctx, familyKey, m.sessionTTL+time.Minute)

	// Add session ID to device set.
	deviceKey := keyPrefixDevice + deviceID
	pipe.SAdd(ctx, deviceKey, sessionID)
	pipe.Expire(ctx, deviceKey, m.sessionTTL+time.Minute)

	if _, err := pipe.Exec(ctx); err != nil {
		return nil, fmt.Errorf("creating session in Redis: %w", err)
	}

	m.log.WithFields(logrus.Fields{
		"session_id": sessionID,
		"user_id":    userID,
		"media_id":   mediaID,
		"device_id":  deviceID,
		"family_id":  familyID,
		"ttl":        m.sessionTTL,
	}).Info("session created")

	return sess, nil
}

// RecordHeartbeat extends the session TTL, indicating the client is still active.
func (m *Manager) RecordHeartbeat(ctx context.Context, sessionID string) error {
	sessionKey := keyPrefixSession + sessionID

	// Check if session exists.
	exists, err := m.client.Exists(ctx, sessionKey).Result()
	if err != nil {
		return fmt.Errorf("checking session existence: %w", err)
	}
	if exists == 0 {
		return fmt.Errorf("session %s not found or expired", sessionID)
	}

	// Load session to get family/device IDs for their set TTLs.
	data, err := m.client.Get(ctx, sessionKey).Bytes()
	if err != nil {
		return fmt.Errorf("reading session data: %w", err)
	}

	var sess StreamSession
	if err := json.Unmarshal(data, &sess); err != nil {
		return fmt.Errorf("unmarshaling session: %w", err)
	}

	// Update expiry on session.
	newExpiry := time.Now().UTC().Add(m.sessionTTL)
	sess.ExpiresAt = newExpiry

	updatedData, err := json.Marshal(sess)
	if err != nil {
		return fmt.Errorf("marshaling updated session: %w", err)
	}

	pipe := m.client.Pipeline()
	pipe.Set(ctx, sessionKey, updatedData, m.sessionTTL)
	pipe.Expire(ctx, keyPrefixFamily+sess.FamilyID, m.sessionTTL+time.Minute)
	pipe.Expire(ctx, keyPrefixDevice+sess.DeviceID, m.sessionTTL+time.Minute)

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("extending session TTL: %w", err)
	}

	m.log.WithFields(logrus.Fields{
		"session_id": sessionID,
		"new_expiry": newExpiry,
	}).Debug("heartbeat recorded")

	return nil
}

// EndSession removes a session from Redis and cleans up family/device sets.
func (m *Manager) EndSession(ctx context.Context, sessionID string) error {
	sessionKey := keyPrefixSession + sessionID

	// Load session to get family/device IDs.
	data, err := m.client.Get(ctx, sessionKey).Bytes()
	if err == redis.Nil {
		// Session already expired or removed.
		m.log.WithField("session_id", sessionID).Debug("session already expired")
		return nil
	}
	if err != nil {
		return fmt.Errorf("reading session for cleanup: %w", err)
	}

	var sess StreamSession
	if err := json.Unmarshal(data, &sess); err != nil {
		return fmt.Errorf("unmarshaling session for cleanup: %w", err)
	}

	pipe := m.client.Pipeline()
	pipe.Del(ctx, sessionKey)
	pipe.SRem(ctx, keyPrefixFamily+sess.FamilyID, sessionID)
	pipe.SRem(ctx, keyPrefixDevice+sess.DeviceID, sessionID)

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("ending session: %w", err)
	}

	m.log.WithField("session_id", sessionID).Info("session ended")

	return nil
}

// GetActiveSessions returns all active sessions for a family.
// It validates each session ID still exists (TTL-expired sessions are pruned).
func (m *Manager) GetActiveSessions(ctx context.Context, familyID string) ([]StreamSession, error) {
	familyKey := keyPrefixFamily + familyID

	sessionIDs, err := m.client.SMembers(ctx, familyKey).Result()
	if err != nil {
		return nil, fmt.Errorf("listing family sessions: %w", err)
	}

	return m.loadAndPruneSessions(ctx, sessionIDs, familyKey)
}

// GetDeviceSessions returns all active sessions for a device.
// It validates each session ID still exists (TTL-expired sessions are pruned).
func (m *Manager) GetDeviceSessions(ctx context.Context, deviceID string) ([]StreamSession, error) {
	deviceKey := keyPrefixDevice + deviceID

	sessionIDs, err := m.client.SMembers(ctx, deviceKey).Result()
	if err != nil {
		return nil, fmt.Errorf("listing device sessions: %w", err)
	}

	return m.loadAndPruneSessions(ctx, sessionIDs, deviceKey)
}

// loadAndPruneSessions loads sessions by ID, removing stale entries from the set.
func (m *Manager) loadAndPruneSessions(ctx context.Context, sessionIDs []string, setKey string) ([]StreamSession, error) {
	var sessions []StreamSession

	for _, id := range sessionIDs {
		data, err := m.client.Get(ctx, keyPrefixSession+id).Bytes()
		if err == redis.Nil {
			// Session expired; remove stale reference from set.
			m.client.SRem(ctx, setKey, id)
			continue
		}
		if err != nil {
			m.log.WithError(err).WithField("session_id", id).Warn("failed to load session")
			continue
		}

		var sess StreamSession
		if err := json.Unmarshal(data, &sess); err != nil {
			m.log.WithError(err).WithField("session_id", id).Warn("failed to unmarshal session")
			continue
		}

		sessions = append(sessions, sess)
	}

	return sessions, nil
}

// Ping checks the Redis connection.
func (m *Manager) Ping(ctx context.Context) error {
	return m.client.Ping(ctx).Err()
}

// Close closes the underlying Redis client.
func (m *Manager) Close() error {
	return m.client.Close()
}
