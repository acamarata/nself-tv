package tests

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"stream_gateway/internal/admission"
	"stream_gateway/internal/session"

	"github.com/alicebob/miniredis/v2"
	"github.com/sirupsen/logrus"
)

// newTestSessionManager creates a session.Manager backed by miniredis.
// Caller must defer mr.Close() and mgr.Close().
func newTestSessionManager(t *testing.T, ttl time.Duration) (*session.Manager, *miniredis.Miniredis) {
	t.Helper()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}

	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	mgr, err := session.NewManager(
		fmt.Sprintf("redis://%s/0", mr.Addr()),
		ttl,
		log,
	)
	if err != nil {
		mr.Close()
		t.Fatalf("failed to create session manager: %v", err)
	}

	return mgr, mr
}

// ---------------------------------------------------------------------------
// CreateSession: stores in correct Redis key patterns
// ---------------------------------------------------------------------------

func TestCreateSession_StoresSessionKey(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Verify session key exists: stream:session:<id>
	sessionKey := "stream:session:" + sess.ID
	if !mr.Exists(sessionKey) {
		t.Errorf("expected session key %q to exist in Redis", sessionKey)
	}

	// Verify the stored data is valid JSON with correct fields.
	data, err := mr.Get(sessionKey)
	if err != nil {
		t.Fatalf("failed to get session data: %v", err)
	}

	var stored admission.StreamSession
	if err := json.Unmarshal([]byte(data), &stored); err != nil {
		t.Fatalf("failed to unmarshal session data: %v", err)
	}

	if stored.ID != sess.ID {
		t.Errorf("stored ID: got %q, want %q", stored.ID, sess.ID)
	}
	if stored.UserID != "user-1" {
		t.Errorf("stored UserID: got %q, want %q", stored.UserID, "user-1")
	}
	if stored.MediaID != "media-1" {
		t.Errorf("stored MediaID: got %q, want %q", stored.MediaID, "media-1")
	}
	if stored.DeviceID != "device-1" {
		t.Errorf("stored DeviceID: got %q, want %q", stored.DeviceID, "device-1")
	}
	if stored.FamilyID != "family-1" {
		t.Errorf("stored FamilyID: got %q, want %q", stored.FamilyID, "family-1")
	}
}

func TestCreateSession_StoresFamilySet(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Verify family set key exists: stream:family:<familyId>
	familyKey := "stream:family:family-1"
	if !mr.Exists(familyKey) {
		t.Errorf("expected family key %q to exist in Redis", familyKey)
	}

	// Verify session ID is a member of the family set.
	members, err := mr.Members(familyKey)
	if err != nil {
		t.Fatalf("failed to get family set members: %v", err)
	}
	if !contains(members, sess.ID) {
		t.Errorf("expected session %q to be in family set, got: %v", sess.ID, members)
	}
}

func TestCreateSession_StoresDeviceSet(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Verify device set key exists: stream:device:<deviceId>
	deviceKey := "stream:device:device-1"
	if !mr.Exists(deviceKey) {
		t.Errorf("expected device key %q to exist in Redis", deviceKey)
	}

	// Verify session ID is a member of the device set.
	members, err := mr.Members(deviceKey)
	if err != nil {
		t.Fatalf("failed to get device set members: %v", err)
	}
	if !contains(members, sess.ID) {
		t.Errorf("expected session %q to be in device set, got: %v", sess.ID, members)
	}
}

func TestCreateSession_SessionHasTTL(t *testing.T) {
	ttl := 5 * time.Minute
	mgr, mr := newTestSessionManager(t, ttl)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	sessionKey := "stream:session:" + sess.ID
	sessionTTL := mr.TTL(sessionKey)

	// TTL should be close to the configured value (within a few seconds).
	if sessionTTL < ttl-5*time.Second || sessionTTL > ttl+5*time.Second {
		t.Errorf("session TTL: got %v, want ~%v", sessionTTL, ttl)
	}
}

func TestCreateSession_MultipleSessions_SameFamily(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess1, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-shared")
	if err != nil {
		t.Fatalf("session 1 error: %v", err)
	}

	sess2, err := mgr.CreateSession(ctx, "user-2", "media-2", "device-2", "family-shared")
	if err != nil {
		t.Fatalf("session 2 error: %v", err)
	}

	// Both session IDs should be in the family set.
	familyKey := "stream:family:family-shared"
	members, err := mr.Members(familyKey)
	if err != nil {
		t.Fatalf("failed to get family set members: %v", err)
	}

	if !contains(members, sess1.ID) {
		t.Errorf("session 1 %q not found in family set", sess1.ID)
	}
	if !contains(members, sess2.ID) {
		t.Errorf("session 2 %q not found in family set", sess2.ID)
	}
	if len(members) != 2 {
		t.Errorf("expected 2 family members, got %d", len(members))
	}
}

func TestCreateSession_MultipleSessions_SameDevice(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess1, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-shared", "family-1")
	if err != nil {
		t.Fatalf("session 1 error: %v", err)
	}

	sess2, err := mgr.CreateSession(ctx, "user-2", "media-2", "device-shared", "family-2")
	if err != nil {
		t.Fatalf("session 2 error: %v", err)
	}

	// Both session IDs should be in the device set.
	deviceKey := "stream:device:device-shared"
	members, err := mr.Members(deviceKey)
	if err != nil {
		t.Fatalf("failed to get device set members: %v", err)
	}

	if !contains(members, sess1.ID) {
		t.Errorf("session 1 %q not found in device set", sess1.ID)
	}
	if !contains(members, sess2.ID) {
		t.Errorf("session 2 %q not found in device set", sess2.ID)
	}
	if len(members) != 2 {
		t.Errorf("expected 2 device members, got %d", len(members))
	}
}

// ---------------------------------------------------------------------------
// Heartbeat: extends TTL
// ---------------------------------------------------------------------------

func TestRecordHeartbeat_ExtendsTTL(t *testing.T) {
	ttl := 5 * time.Minute
	mgr, mr := newTestSessionManager(t, ttl)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	sessionKey := "stream:session:" + sess.ID

	// Fast-forward time in miniredis by 3 minutes so TTL drops.
	mr.FastForward(3 * time.Minute)

	ttlBefore := mr.TTL(sessionKey)
	// After 3 min forward, TTL should be approximately 2 minutes remaining.
	if ttlBefore > 3*time.Minute {
		t.Errorf("expected TTL < 3min after fast-forward, got %v", ttlBefore)
	}

	// Record heartbeat which should reset TTL back to ~5 minutes.
	err = mgr.RecordHeartbeat(ctx, sess.ID)
	if err != nil {
		t.Fatalf("heartbeat error: %v", err)
	}

	ttlAfter := mr.TTL(sessionKey)
	// After heartbeat, TTL should be close to the full 5 minutes again.
	if ttlAfter < ttl-10*time.Second {
		t.Errorf("TTL after heartbeat should be ~%v, got %v", ttl, ttlAfter)
	}
}

func TestRecordHeartbeat_UpdatesExpiresAtField(t *testing.T) {
	ttl := 5 * time.Minute
	mgr, mr := newTestSessionManager(t, ttl)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	originalExpiry := sess.ExpiresAt

	// Small delay to ensure time difference.
	time.Sleep(50 * time.Millisecond)

	// Record heartbeat.
	err = mgr.RecordHeartbeat(ctx, sess.ID)
	if err != nil {
		t.Fatalf("heartbeat error: %v", err)
	}

	// Read the session data back from Redis.
	sessionKey := "stream:session:" + sess.ID
	data, err := mr.Get(sessionKey)
	if err != nil {
		t.Fatalf("failed to get session data: %v", err)
	}

	var updated admission.StreamSession
	if err := json.Unmarshal([]byte(data), &updated); err != nil {
		t.Fatalf("failed to unmarshal session: %v", err)
	}

	// ExpiresAt should be later than the original.
	if !updated.ExpiresAt.After(originalExpiry) {
		t.Errorf("ExpiresAt after heartbeat (%v) should be after original (%v)",
			updated.ExpiresAt, originalExpiry)
	}
}

func TestRecordHeartbeat_NonexistentSession_ReturnsError(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	err := mgr.RecordHeartbeat(ctx, "nonexistent-session-id")
	if err == nil {
		t.Error("expected error for nonexistent session heartbeat, got nil")
	}
}

func TestRecordHeartbeat_ExpiredSession_ReturnsError(t *testing.T) {
	ttl := 5 * time.Minute
	mgr, mr := newTestSessionManager(t, ttl)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Fast-forward past the TTL so the session key expires.
	mr.FastForward(ttl + 1*time.Minute)

	err = mgr.RecordHeartbeat(ctx, sess.ID)
	if err == nil {
		t.Error("expected error for expired session heartbeat, got nil")
	}
}

// ---------------------------------------------------------------------------
// EndSession: removes from all key structures
// ---------------------------------------------------------------------------

func TestEndSession_RemovesSessionKey(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	sessionKey := "stream:session:" + sess.ID
	if !mr.Exists(sessionKey) {
		t.Fatal("session key should exist before EndSession")
	}

	err = mgr.EndSession(ctx, sess.ID)
	if err != nil {
		t.Fatalf("EndSession error: %v", err)
	}

	if mr.Exists(sessionKey) {
		t.Error("session key should be removed after EndSession")
	}
}

func TestEndSession_RemovesFromFamilySet(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	familyKey := "stream:family:family-1"
	membersBefore, _ := mr.Members(familyKey)
	if !contains(membersBefore, sess.ID) {
		t.Fatal("session should be in family set before EndSession")
	}

	err = mgr.EndSession(ctx, sess.ID)
	if err != nil {
		t.Fatalf("EndSession error: %v", err)
	}

	membersAfter, _ := mr.Members(familyKey)
	if contains(membersAfter, sess.ID) {
		t.Error("session should be removed from family set after EndSession")
	}
}

func TestEndSession_RemovesFromDeviceSet(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	deviceKey := "stream:device:device-1"
	membersBefore, _ := mr.Members(deviceKey)
	if !contains(membersBefore, sess.ID) {
		t.Fatal("session should be in device set before EndSession")
	}

	err = mgr.EndSession(ctx, sess.ID)
	if err != nil {
		t.Fatalf("EndSession error: %v", err)
	}

	membersAfter, _ := mr.Members(deviceKey)
	if contains(membersAfter, sess.ID) {
		t.Error("session should be removed from device set after EndSession")
	}
}

func TestEndSession_OnlyRemovesTargetSession(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	// Create two sessions in the same family and device.
	sess1, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-shared", "family-shared")
	if err != nil {
		t.Fatalf("session 1 error: %v", err)
	}

	sess2, err := mgr.CreateSession(ctx, "user-2", "media-2", "device-shared", "family-shared")
	if err != nil {
		t.Fatalf("session 2 error: %v", err)
	}

	// End only session 1.
	err = mgr.EndSession(ctx, sess1.ID)
	if err != nil {
		t.Fatalf("EndSession error: %v", err)
	}

	// Session 1 key should be gone.
	if mr.Exists("stream:session:" + sess1.ID) {
		t.Error("session 1 key should be removed")
	}

	// Session 2 key should still exist.
	if !mr.Exists("stream:session:" + sess2.ID) {
		t.Error("session 2 key should still exist")
	}

	// Family set should still contain session 2 but not session 1.
	familyMembers, _ := mr.Members("stream:family:family-shared")
	if contains(familyMembers, sess1.ID) {
		t.Error("session 1 should be removed from family set")
	}
	if !contains(familyMembers, sess2.ID) {
		t.Error("session 2 should still be in family set")
	}

	// Device set should still contain session 2 but not session 1.
	deviceMembers, _ := mr.Members("stream:device:device-shared")
	if contains(deviceMembers, sess1.ID) {
		t.Error("session 1 should be removed from device set")
	}
	if !contains(deviceMembers, sess2.ID) {
		t.Error("session 2 should still be in device set")
	}
}

func TestEndSession_AlreadyExpired_NoError(t *testing.T) {
	ttl := 5 * time.Minute
	mgr, mr := newTestSessionManager(t, ttl)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Expire the session by advancing time.
	mr.FastForward(ttl + 1*time.Minute)

	// EndSession on an already-expired session should NOT return an error.
	err = mgr.EndSession(ctx, sess.ID)
	if err != nil {
		t.Errorf("expected no error for already-expired session, got: %v", err)
	}
}

func TestEndSession_NonexistentSession_NoError(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	// EndSession on a session that never existed should not error.
	err := mgr.EndSession(ctx, "never-existed-session-id")
	if err != nil {
		t.Errorf("expected no error for nonexistent session, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// GetActiveSessions / GetDeviceSessions: family and device set maintenance
// ---------------------------------------------------------------------------

func TestGetActiveSessions_ReturnsAllFamilySessions(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess1, _ := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-group")
	sess2, _ := mgr.CreateSession(ctx, "user-2", "media-2", "device-2", "family-group")

	sessions, err := mgr.GetActiveSessions(ctx, "family-group")
	if err != nil {
		t.Fatalf("GetActiveSessions error: %v", err)
	}

	if len(sessions) != 2 {
		t.Errorf("expected 2 active sessions, got %d", len(sessions))
	}

	ids := make(map[string]bool)
	for _, s := range sessions {
		ids[s.ID] = true
	}
	if !ids[sess1.ID] {
		t.Errorf("session 1 %q not found in active sessions", sess1.ID)
	}
	if !ids[sess2.ID] {
		t.Errorf("session 2 %q not found in active sessions", sess2.ID)
	}
}

func TestGetActiveSessions_PrunesExpiredSessions(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	// Create two sessions.
	mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-prune")
	sess2, _ := mgr.CreateSession(ctx, "user-2", "media-2", "device-2", "family-prune")

	// Get all sessions to find the first one's ID.
	allSessions, _ := mgr.GetActiveSessions(ctx, "family-prune")
	if len(allSessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(allSessions))
	}

	var firstSessionID string
	for _, s := range allSessions {
		if s.ID != sess2.ID {
			firstSessionID = s.ID
			break
		}
	}

	// Simulate expiration by deleting the session key directly.
	mr.Del("stream:session:" + firstSessionID)

	// GetActiveSessions should now return only 1 session and prune the stale reference.
	activeSessions, err := mgr.GetActiveSessions(ctx, "family-prune")
	if err != nil {
		t.Fatalf("GetActiveSessions error: %v", err)
	}

	if len(activeSessions) != 1 {
		t.Errorf("expected 1 active session after pruning, got %d", len(activeSessions))
	}
	if len(activeSessions) > 0 && activeSessions[0].ID != sess2.ID {
		t.Errorf("surviving session should be %q, got %q", sess2.ID, activeSessions[0].ID)
	}

	// The stale session ID should have been removed from the family set.
	familyMembers, _ := mr.Members("stream:family:family-prune")
	if contains(familyMembers, firstSessionID) {
		t.Error("expired session should have been pruned from family set")
	}
}

func TestGetDeviceSessions_ReturnsAllDeviceSessions(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess1, _ := mgr.CreateSession(ctx, "user-1", "media-1", "device-group", "family-1")
	sess2, _ := mgr.CreateSession(ctx, "user-2", "media-2", "device-group", "family-2")

	sessions, err := mgr.GetDeviceSessions(ctx, "device-group")
	if err != nil {
		t.Fatalf("GetDeviceSessions error: %v", err)
	}

	if len(sessions) != 2 {
		t.Errorf("expected 2 device sessions, got %d", len(sessions))
	}

	ids := make(map[string]bool)
	for _, s := range sessions {
		ids[s.ID] = true
	}
	if !ids[sess1.ID] {
		t.Errorf("session 1 %q not found in device sessions", sess1.ID)
	}
	if !ids[sess2.ID] {
		t.Errorf("session 2 %q not found in device sessions", sess2.ID)
	}
}

func TestGetDeviceSessions_PrunesExpiredSessions(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sess1, _ := mgr.CreateSession(ctx, "user-1", "media-1", "device-prune", "family-1")
	sess2, _ := mgr.CreateSession(ctx, "user-2", "media-2", "device-prune", "family-2")

	// Simulate session 1 expiration.
	mr.Del("stream:session:" + sess1.ID)

	sessions, err := mgr.GetDeviceSessions(ctx, "device-prune")
	if err != nil {
		t.Fatalf("GetDeviceSessions error: %v", err)
	}

	if len(sessions) != 1 {
		t.Errorf("expected 1 device session after pruning, got %d", len(sessions))
	}
	if len(sessions) > 0 && sessions[0].ID != sess2.ID {
		t.Errorf("surviving session should be %q, got %q", sess2.ID, sessions[0].ID)
	}

	// Stale reference should be pruned from device set.
	deviceMembers, _ := mr.Members("stream:device:device-prune")
	if contains(deviceMembers, sess1.ID) {
		t.Error("expired session should have been pruned from device set")
	}
}

func TestGetActiveSessions_EmptyFamily_ReturnsEmpty(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sessions, err := mgr.GetActiveSessions(ctx, "nonexistent-family")
	if err != nil {
		t.Fatalf("GetActiveSessions error: %v", err)
	}

	if len(sessions) != 0 {
		t.Errorf("expected 0 sessions for nonexistent family, got %d", len(sessions))
	}
}

func TestGetDeviceSessions_EmptyDevice_ReturnsEmpty(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	sessions, err := mgr.GetDeviceSessions(ctx, "nonexistent-device")
	if err != nil {
		t.Fatalf("GetDeviceSessions error: %v", err)
	}

	if len(sessions) != 0 {
		t.Errorf("expected 0 sessions for nonexistent device, got %d", len(sessions))
	}
}

// ---------------------------------------------------------------------------
// GetFamilyStreamCount / GetDeviceStreamCount
// ---------------------------------------------------------------------------

func TestGetFamilyStreamCount(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-count")
	mgr.CreateSession(ctx, "user-2", "media-2", "device-2", "family-count")

	count, err := mgr.GetFamilyStreamCount(ctx, "family-count")
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if count != 2 {
		t.Errorf("expected 2, got %d", count)
	}
}

func TestGetDeviceStreamCount(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	mgr.CreateSession(ctx, "user-1", "media-1", "device-count", "family-1")
	mgr.CreateSession(ctx, "user-2", "media-2", "device-count", "family-2")

	count, err := mgr.GetDeviceStreamCount(ctx, "device-count")
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if count != 2 {
		t.Errorf("expected 2, got %d", count)
	}
}

// ---------------------------------------------------------------------------
// Session fields validation
// ---------------------------------------------------------------------------

func TestCreateSession_GeneratesUniqueIDs(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	ids := make(map[string]bool)
	for i := 0; i < 20; i++ {
		sess, err := mgr.CreateSession(ctx, "user-1", "media-1",
			fmt.Sprintf("device-%d", i), fmt.Sprintf("family-%d", i))
		if err != nil {
			t.Fatalf("session %d error: %v", i, err)
		}
		if ids[sess.ID] {
			t.Errorf("duplicate session ID %q on iteration %d", sess.ID, i)
		}
		ids[sess.ID] = true
	}
}

func TestCreateSession_SetsTimestamps(t *testing.T) {
	ttl := 10 * time.Minute
	mgr, mr := newTestSessionManager(t, ttl)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()
	before := time.Now().UTC()

	sess, err := mgr.CreateSession(ctx, "user-1", "media-1", "device-1", "family-1")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	after := time.Now().UTC()

	// CreatedAt should be between before and after.
	if sess.CreatedAt.Before(before.Add(-1*time.Second)) || sess.CreatedAt.After(after.Add(1*time.Second)) {
		t.Errorf("CreatedAt %v not between %v and %v", sess.CreatedAt, before, after)
	}

	// ExpiresAt should be CreatedAt + TTL.
	expectedExpiry := sess.CreatedAt.Add(ttl)
	diff := sess.ExpiresAt.Sub(expectedExpiry)
	if diff < -1*time.Second || diff > 1*time.Second {
		t.Errorf("ExpiresAt %v not close to expected %v", sess.ExpiresAt, expectedExpiry)
	}
}

// ---------------------------------------------------------------------------
// Ping
// ---------------------------------------------------------------------------

func TestPing_Succeeds(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mr.Close()
	defer mgr.Close()

	ctx := context.Background()

	err := mgr.Ping(ctx)
	if err != nil {
		t.Errorf("Ping should succeed on healthy Redis, got: %v", err)
	}
}

func TestPing_FailsWhenRedisDown(t *testing.T) {
	mgr, mr := newTestSessionManager(t, 5*time.Minute)
	defer mgr.Close()

	// Close miniredis to simulate Redis going down.
	mr.Close()

	ctx := context.Background()

	err := mgr.Ping(ctx)
	if err == nil {
		t.Error("Ping should fail when Redis is down, got nil error")
	}
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
