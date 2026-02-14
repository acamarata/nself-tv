package session

import (
	"context"
	"sync"
	"testing"
	"time"

	"stream_gateway/internal/admission"
)

// ---------------------------------------------------------------------------
// RegisterSession and GetFamilyStreamCount
// ---------------------------------------------------------------------------

func TestConcurrencyTracker_RegisterSession_IncrementsFamily(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	sess := &admission.StreamSession{
		ID:        "sess-1",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}

	err := ct.RegisterSession(ctx, sess)
	if err != nil {
		t.Fatalf("RegisterSession error: %v", err)
	}

	count, err := ct.GetFamilyStreamCount(ctx, "family-1")
	if err != nil {
		t.Fatalf("GetFamilyStreamCount error: %v", err)
	}
	if count != 1 {
		t.Errorf("expected family stream count 1, got %d", count)
	}
}

func TestConcurrencyTracker_RegisterSession_IncrementsDevice(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	sess := &admission.StreamSession{
		ID:        "sess-1",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}

	err := ct.RegisterSession(ctx, sess)
	if err != nil {
		t.Fatalf("RegisterSession error: %v", err)
	}

	count, err := ct.GetDeviceStreamCount(ctx, "device-1")
	if err != nil {
		t.Fatalf("GetDeviceStreamCount error: %v", err)
	}
	if count != 1 {
		t.Errorf("expected device stream count 1, got %d", count)
	}
}

func TestConcurrencyTracker_MultipleSessions_SameFamily(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		sess := &admission.StreamSession{
			ID:        "sess-" + string(rune('a'+i)),
			UserID:    "user-1",
			MediaID:   "media-1",
			DeviceID:  "device-" + string(rune('a'+i)),
			FamilyID:  "family-shared",
			CreatedAt: time.Now(),
			ExpiresAt: time.Now().Add(8 * time.Hour),
		}
		if err := ct.RegisterSession(ctx, sess); err != nil {
			t.Fatalf("RegisterSession %d error: %v", i, err)
		}
	}

	count, err := ct.GetFamilyStreamCount(ctx, "family-shared")
	if err != nil {
		t.Fatalf("GetFamilyStreamCount error: %v", err)
	}
	if count != 5 {
		t.Errorf("expected family stream count 5, got %d", count)
	}
}

func TestConcurrencyTracker_MultipleSessions_SameDevice(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		sess := &admission.StreamSession{
			ID:        "sess-" + string(rune('a'+i)),
			UserID:    "user-1",
			MediaID:   "media-" + string(rune('a'+i)),
			DeviceID:  "device-shared",
			FamilyID:  "family-" + string(rune('a'+i)),
			CreatedAt: time.Now(),
			ExpiresAt: time.Now().Add(8 * time.Hour),
		}
		if err := ct.RegisterSession(ctx, sess); err != nil {
			t.Fatalf("RegisterSession %d error: %v", i, err)
		}
	}

	count, err := ct.GetDeviceStreamCount(ctx, "device-shared")
	if err != nil {
		t.Fatalf("GetDeviceStreamCount error: %v", err)
	}
	if count != 3 {
		t.Errorf("expected device stream count 3, got %d", count)
	}
}

func TestConcurrencyTracker_NilSession_NoError(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	err := ct.RegisterSession(ctx, nil)
	if err != nil {
		t.Errorf("expected no error for nil session, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// UnregisterSession
// ---------------------------------------------------------------------------

func TestConcurrencyTracker_UnregisterSession_DecrementsCounts(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	sess := &admission.StreamSession{
		ID:        "sess-1",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}

	_ = ct.RegisterSession(ctx, sess)

	err := ct.UnregisterSession(ctx, "sess-1")
	if err != nil {
		t.Fatalf("UnregisterSession error: %v", err)
	}

	familyCount, _ := ct.GetFamilyStreamCount(ctx, "family-1")
	if familyCount != 0 {
		t.Errorf("expected family count 0 after unregister, got %d", familyCount)
	}

	deviceCount, _ := ct.GetDeviceStreamCount(ctx, "device-1")
	if deviceCount != 0 {
		t.Errorf("expected device count 0 after unregister, got %d", deviceCount)
	}
}

func TestConcurrencyTracker_UnregisterSession_OnlyAffectsTarget(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	sess1 := &admission.StreamSession{
		ID:        "sess-1",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-shared",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}
	sess2 := &admission.StreamSession{
		ID:        "sess-2",
		UserID:    "user-2",
		MediaID:   "media-2",
		DeviceID:  "device-1",
		FamilyID:  "family-shared",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}

	_ = ct.RegisterSession(ctx, sess1)
	_ = ct.RegisterSession(ctx, sess2)

	_ = ct.UnregisterSession(ctx, "sess-1")

	familyCount, _ := ct.GetFamilyStreamCount(ctx, "family-shared")
	if familyCount != 1 {
		t.Errorf("expected family count 1 after partial unregister, got %d", familyCount)
	}

	deviceCount, _ := ct.GetDeviceStreamCount(ctx, "device-1")
	if deviceCount != 1 {
		t.Errorf("expected device count 1 after partial unregister, got %d", deviceCount)
	}
}

func TestConcurrencyTracker_UnregisterSession_NonexistentNoError(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	err := ct.UnregisterSession(ctx, "nonexistent-session")
	if err != nil {
		t.Errorf("expected no error for nonexistent session, got: %v", err)
	}
}

func TestConcurrencyTracker_UnregisterSession_DoubleUnregisterNoError(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	sess := &admission.StreamSession{
		ID:        "sess-1",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}
	_ = ct.RegisterSession(ctx, sess)
	_ = ct.UnregisterSession(ctx, "sess-1")

	err := ct.UnregisterSession(ctx, "sess-1")
	if err != nil {
		t.Errorf("double unregister should not error, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Counts for nonexistent families/devices
// ---------------------------------------------------------------------------

func TestConcurrencyTracker_CountNonexistentFamily_ReturnsZero(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	count, err := ct.GetFamilyStreamCount(ctx, "nonexistent-family")
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if count != 0 {
		t.Errorf("expected 0, got %d", count)
	}
}

func TestConcurrencyTracker_CountNonexistentDevice_ReturnsZero(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	count, err := ct.GetDeviceStreamCount(ctx, "nonexistent-device")
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if count != 0 {
		t.Errorf("expected 0, got %d", count)
	}
}

// ---------------------------------------------------------------------------
// CleanupExpired
// ---------------------------------------------------------------------------

func TestConcurrencyTracker_CleanupExpired_RemovesExpiredSessions(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	// Create a session that is already expired.
	sess := &admission.StreamSession{
		ID:        "sess-expired",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now().Add(-9 * time.Hour),
		ExpiresAt: time.Now().Add(-1 * time.Hour), // Already expired.
	}

	_ = ct.RegisterSession(ctx, sess)

	// Verify it was registered.
	count, _ := ct.GetFamilyStreamCount(ctx, "family-1")
	if count != 1 {
		t.Fatalf("expected count 1 before cleanup, got %d", count)
	}

	// Run cleanup.
	err := ct.CleanupExpired(ctx)
	if err != nil {
		t.Fatalf("CleanupExpired error: %v", err)
	}

	// Should be removed.
	count, _ = ct.GetFamilyStreamCount(ctx, "family-1")
	if count != 0 {
		t.Errorf("expected count 0 after cleanup, got %d", count)
	}
}

func TestConcurrencyTracker_CleanupExpired_RemovesStaleSessions(t *testing.T) {
	// Use a very short heartbeat timeout for testing.
	ct := NewConcurrencyTracker(1 * time.Millisecond)
	ctx := context.Background()

	sess := &admission.StreamSession{
		ID:        "sess-stale",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour), // Not expired by time.
	}

	_ = ct.RegisterSession(ctx, sess)

	// Wait for the heartbeat timeout to pass.
	time.Sleep(5 * time.Millisecond)

	err := ct.CleanupExpired(ctx)
	if err != nil {
		t.Fatalf("CleanupExpired error: %v", err)
	}

	count, _ := ct.GetFamilyStreamCount(ctx, "family-1")
	if count != 0 {
		t.Errorf("expected count 0 after stale cleanup, got %d", count)
	}
}

func TestConcurrencyTracker_CleanupExpired_KeepsActiveSessions(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	// Active session (not expired, recent heartbeat).
	sessActive := &admission.StreamSession{
		ID:        "sess-active",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}
	// Expired session.
	sessExpired := &admission.StreamSession{
		ID:        "sess-expired",
		UserID:    "user-2",
		MediaID:   "media-2",
		DeviceID:  "device-2",
		FamilyID:  "family-1",
		CreatedAt: time.Now().Add(-9 * time.Hour),
		ExpiresAt: time.Now().Add(-1 * time.Hour),
	}

	_ = ct.RegisterSession(ctx, sessActive)
	_ = ct.RegisterSession(ctx, sessExpired)

	err := ct.CleanupExpired(ctx)
	if err != nil {
		t.Fatalf("CleanupExpired error: %v", err)
	}

	count, _ := ct.GetFamilyStreamCount(ctx, "family-1")
	if count != 1 {
		t.Errorf("expected 1 active session remaining, got %d", count)
	}
}

func TestConcurrencyTracker_CleanupExpired_EmptyTracker_NoError(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	err := ct.CleanupExpired(ctx)
	if err != nil {
		t.Errorf("cleanup on empty tracker should not error, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// RecordHeartbeat
// ---------------------------------------------------------------------------

func TestConcurrencyTracker_RecordHeartbeat_UpdatesLastSeen(t *testing.T) {
	// Use a very short timeout so we can test that heartbeat prevents cleanup.
	ct := NewConcurrencyTracker(50 * time.Millisecond)
	ctx := context.Background()

	sess := &admission.StreamSession{
		ID:        "sess-hb",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}

	_ = ct.RegisterSession(ctx, sess)

	// Wait a bit, then heartbeat.
	time.Sleep(30 * time.Millisecond)
	_ = ct.RecordHeartbeat(ctx, "sess-hb")

	// Wait until original timeout would have expired.
	time.Sleep(30 * time.Millisecond)

	// Heartbeat should have prevented cleanup.
	err := ct.CleanupExpired(ctx)
	if err != nil {
		t.Fatalf("CleanupExpired error: %v", err)
	}

	count, _ := ct.GetFamilyStreamCount(ctx, "family-1")
	if count != 1 {
		t.Errorf("session should still be active after heartbeat, got count %d", count)
	}
}

func TestConcurrencyTracker_RecordHeartbeat_NonexistentNoError(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	err := ct.RecordHeartbeat(ctx, "nonexistent-session")
	if err != nil {
		t.Errorf("heartbeat for nonexistent session should not error, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// GetAllSessions
// ---------------------------------------------------------------------------

func TestConcurrencyTracker_GetAllSessions(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	sess1 := &admission.StreamSession{
		ID:        "sess-1",
		UserID:    "user-1",
		MediaID:   "media-1",
		DeviceID:  "device-1",
		FamilyID:  "family-1",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}
	sess2 := &admission.StreamSession{
		ID:        "sess-2",
		UserID:    "user-2",
		MediaID:   "media-2",
		DeviceID:  "device-2",
		FamilyID:  "family-2",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(8 * time.Hour),
	}

	_ = ct.RegisterSession(ctx, sess1)
	_ = ct.RegisterSession(ctx, sess2)

	all := ct.GetAllSessions(ctx)
	if len(all) != 2 {
		t.Errorf("expected 2 sessions, got %d", len(all))
	}

	ids := make(map[string]bool)
	for _, s := range all {
		ids[s.ID] = true
	}
	if !ids["sess-1"] || !ids["sess-2"] {
		t.Error("expected both sessions to be returned")
	}
}

func TestConcurrencyTracker_GetAllSessions_Empty(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	all := ct.GetAllSessions(ctx)
	if len(all) != 0 {
		t.Errorf("expected 0 sessions, got %d", len(all))
	}
}

// ---------------------------------------------------------------------------
// Thread safety (concurrent access)
// ---------------------------------------------------------------------------

func TestConcurrencyTracker_ThreadSafety(t *testing.T) {
	ct := NewConcurrencyTracker(5 * time.Minute)
	ctx := context.Background()

	var wg sync.WaitGroup
	numGoroutines := 100

	// Concurrently register sessions.
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			sess := &admission.StreamSession{
				ID:        "sess-" + string(rune(i)),
				UserID:    "user-1",
				MediaID:   "media-1",
				DeviceID:  "device-1",
				FamilyID:  "family-1",
				CreatedAt: time.Now(),
				ExpiresAt: time.Now().Add(8 * time.Hour),
			}
			_ = ct.RegisterSession(ctx, sess)
		}(i)
	}

	// Concurrently read counts.
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = ct.GetFamilyStreamCount(ctx, "family-1")
			_, _ = ct.GetDeviceStreamCount(ctx, "device-1")
		}()
	}

	// Concurrently heartbeat.
	for i := 0; i < numGoroutines/2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_ = ct.RecordHeartbeat(ctx, "sess-"+string(rune(i)))
		}(i)
	}

	wg.Wait()

	// If we get here without a data race (under -race), the test passes.
	// The exact count depends on goroutine scheduling but should not panic.
	count, err := ct.GetFamilyStreamCount(ctx, "family-1")
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if count == 0 {
		t.Error("expected some sessions to be registered")
	}
}

// ---------------------------------------------------------------------------
// Default heartbeat timeout
// ---------------------------------------------------------------------------

func TestConcurrencyTracker_DefaultHeartbeatTimeout(t *testing.T) {
	ct := NewConcurrencyTracker(0) // Should default to 5 minutes.
	if ct.heartbeatTimeout != 5*time.Minute {
		t.Errorf("expected default heartbeat timeout of 5m, got %v", ct.heartbeatTimeout)
	}
}
