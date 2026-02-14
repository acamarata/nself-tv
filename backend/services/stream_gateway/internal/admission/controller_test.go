package admission

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/sirupsen/logrus"
)

// ---------------------------------------------------------------------------
// Mock implementations for testing
// ---------------------------------------------------------------------------

// mockSessionProvider implements SessionProvider for testing.
type mockSessionProvider struct {
	familyCounts   map[string]int
	deviceCounts   map[string]int
	familyCountErr error
	deviceCountErr error
	createErr      error
	endErr         error
	createdSessions []*StreamSession
	endedSessions   []string
	sessionCounter  int
}

func newMockSessionProvider() *mockSessionProvider {
	return &mockSessionProvider{
		familyCounts: make(map[string]int),
		deviceCounts: make(map[string]int),
	}
}

func (m *mockSessionProvider) GetFamilyStreamCount(_ context.Context, familyID string) (int, error) {
	if m.familyCountErr != nil {
		return 0, m.familyCountErr
	}
	return m.familyCounts[familyID], nil
}

func (m *mockSessionProvider) GetDeviceStreamCount(_ context.Context, deviceID string) (int, error) {
	if m.deviceCountErr != nil {
		return 0, m.deviceCountErr
	}
	return m.deviceCounts[deviceID], nil
}

func (m *mockSessionProvider) CreateSession(_ context.Context, userID, mediaID, deviceID, familyID string) (*StreamSession, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	m.sessionCounter++
	sess := &StreamSession{
		ID:        fmt.Sprintf("session-%d", m.sessionCounter),
		UserID:    userID,
		MediaID:   mediaID,
		DeviceID:  deviceID,
		FamilyID:  familyID,
		CreatedAt: time.Now().UTC(),
		ExpiresAt: time.Now().UTC().Add(8 * time.Hour),
	}
	m.createdSessions = append(m.createdSessions, sess)
	return sess, nil
}

func (m *mockSessionProvider) EndSession(_ context.Context, sessionID string) error {
	if m.endErr != nil {
		return m.endErr
	}
	m.endedSessions = append(m.endedSessions, sessionID)
	return nil
}

// mockTokenProvider implements TokenProvider for testing.
type mockTokenProvider struct {
	generateErr error
	tokenStr    string
	expiresAt   time.Time
}

func newMockTokenProvider() *mockTokenProvider {
	return &mockTokenProvider{
		tokenStr:  "mock-playback-token",
		expiresAt: time.Now().UTC().Add(4 * time.Hour),
	}
}

func (m *mockTokenProvider) GeneratePlaybackToken(sess *StreamSession) (string, time.Time, error) {
	if m.generateErr != nil {
		return "", time.Time{}, m.generateErr
	}
	return m.tokenStr, m.expiresAt, nil
}

// newTestController creates a Controller with mock dependencies and a sqlmock DB.
func newTestController(t *testing.T, maxFamily, maxDevice int) (*Controller, sqlmock.Sqlmock, *mockSessionProvider, *mockTokenProvider) {
	t.Helper()

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	sessions := newMockSessionProvider()
	tokens := newMockTokenProvider()

	ctrl := NewController(db, sessions, tokens, log, maxFamily, maxDevice, 8*time.Hour)

	return ctrl, mock, sessions, tokens
}

// ---------------------------------------------------------------------------
// User active check
// ---------------------------------------------------------------------------

func TestAdmitSession_UserActive_Allowed(t *testing.T) {
	ctrl, mock, _, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	resp, err := ctrl.AdmitSession(ctx, req)
	if err != nil {
		t.Fatalf("expected admission to succeed, got error: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
	if resp.Token == "" {
		t.Error("expected non-empty token")
	}
	if resp.SessionID == "" {
		t.Error("expected non-empty session ID")
	}
	if resp.ExpiresAt.Before(time.Now()) {
		t.Error("expected ExpiresAt to be in the future")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled sqlmock expectations: %v", err)
	}
}

func TestAdmitSession_UserNotActive_Denied(t *testing.T) {
	ctrl, mock, _, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-disabled").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(true))

	req := AdmitRequest{
		UserID:   "user-disabled",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error for disabled user, got nil")
	}
	if !errors.Is(err, ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got: %v", err)
	}
}

func TestAdmitSession_UserNotFound_Denied(t *testing.T) {
	ctrl, mock, _, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("ghost-user").
		WillReturnError(sql.ErrNoRows)

	req := AdmitRequest{
		UserID:   "ghost-user",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error for non-existent user, got nil")
	}
	if !errors.Is(err, ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got: %v", err)
	}
}

func TestAdmitSession_DBError_ReturnsError(t *testing.T) {
	ctrl, mock, _, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnError(fmt.Errorf("connection refused"))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error on database failure, got nil")
	}
	if errors.Is(err, ErrUnauthorized) {
		t.Error("database errors should not be mapped to ErrUnauthorized")
	}
}

// ---------------------------------------------------------------------------
// RBAC permission check
// ---------------------------------------------------------------------------

func TestAdmitSession_RestrictedRole_Denied(t *testing.T) {
	ctrl, mock, _, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
		UserRole: "restricted",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error for restricted role, got nil")
	}
	if !errors.Is(err, ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized for restricted role, got: %v", err)
	}
}

func TestAdmitSession_AllowedRoles(t *testing.T) {
	roles := []string{"owner", "admin", "helper", "viewer", "user", ""}

	for _, role := range roles {
		t.Run(fmt.Sprintf("role_%s", role), func(t *testing.T) {
			ctrl, mock, _, _ := newTestController(t, 5, 2)
			ctx := context.Background()

			mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
				WithArgs("user-1").
				WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

			req := AdmitRequest{
				UserID:   "user-1",
				MediaID:  "media-1",
				DeviceID: "device-1",
				FamilyID: fmt.Sprintf("family-role-%s", role),
				UserRole: role,
			}

			resp, err := ctrl.AdmitSession(ctx, req)
			if err != nil {
				t.Fatalf("expected admission to succeed for role %q, got error: %v", role, err)
			}
			if resp == nil {
				t.Fatalf("expected non-nil response for role %q", role)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Content rating policy enforcement
// ---------------------------------------------------------------------------

func TestAdmitSession_ContentRating(t *testing.T) {
	tests := []struct {
		name            string
		contentRating   string
		profileLimit    string
		shouldBeAllowed bool
	}{
		{"G content with PG-13 limit", "G", "PG-13", true},
		{"PG content with PG-13 limit", "PG", "PG-13", true},
		{"PG-13 content with PG-13 limit (exact match)", "PG-13", "PG-13", true},
		{"R content with PG-13 limit (exceeds)", "R", "PG-13", false},
		{"NC-17 content with PG limit (exceeds)", "NC-17", "PG", false},
		{"TV-Y content with TV-14 limit", "TV-Y", "TV-14", true},
		{"TV-MA content with TV-PG limit (exceeds)", "TV-MA", "TV-PG", false},
		{"TV-14 content with TV-14 limit (exact)", "TV-14", "TV-14", true},
		{"Unknown content rating (fail open)", "UNKNOWN", "PG-13", true},
		{"Unknown profile limit (fail open)", "R", "UNKNOWN", true},
		{"Both unknown (fail open)", "FOO", "BAR", true},
		{"Empty content rating (skip check)", "", "PG-13", true},
		{"Empty profile limit (skip check)", "R", "", true},
		{"Both empty (skip check)", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl, mock, _, _ := newTestController(t, 5, 2)
			ctx := context.Background()

			mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
				WithArgs("user-1").
				WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

			req := AdmitRequest{
				UserID:                    "user-1",
				MediaID:                   "media-1",
				DeviceID:                  "device-1",
				FamilyID:                  fmt.Sprintf("family-rating-%s-%s", tt.contentRating, tt.profileLimit),
				ContentRating:             tt.contentRating,
				ProfileContentRatingLimit: tt.profileLimit,
			}

			resp, err := ctrl.AdmitSession(ctx, req)

			if tt.shouldBeAllowed {
				if err != nil {
					t.Errorf("expected admission to succeed, got error: %v", err)
				}
				if resp == nil {
					t.Error("expected non-nil response for allowed request")
				}
			} else {
				if err == nil {
					t.Fatal("expected admission to be denied, got nil error")
				}
				if !errors.Is(err, ErrPolicyDenied) {
					t.Errorf("expected ErrPolicyDenied, got: %v", err)
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Family concurrency limit (5 streams max by default)
// ---------------------------------------------------------------------------

func TestAdmitSession_FamilyConcurrencyLimit(t *testing.T) {
	maxFamily := 5
	ctrl, mock, sessions, _ := newTestController(t, maxFamily, 2)
	ctx := context.Background()

	// Set family to be at the limit.
	sessions.familyCounts["family-full"] = maxFamily

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-overflow").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-overflow",
		MediaID:  "media-overflow",
		DeviceID: "device-overflow",
		FamilyID: "family-full",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected concurrency limit error, got nil")
	}
	if !errors.Is(err, ErrConcurrencyLimit) {
		t.Errorf("expected ErrConcurrencyLimit, got: %v", err)
	}
}

func TestAdmitSession_FamilyUnderLimit_Allowed(t *testing.T) {
	ctrl, mock, sessions, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	sessions.familyCounts["family-ok"] = 4 // Under limit of 5.

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-ok",
	}

	resp, err := ctrl.AdmitSession(ctx, req)
	if err != nil {
		t.Fatalf("expected admission to succeed, got: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
}

// ---------------------------------------------------------------------------
// Device concurrency limit (2 streams max by default)
// ---------------------------------------------------------------------------

func TestAdmitSession_DeviceConcurrencyLimit(t *testing.T) {
	maxDevice := 2
	ctrl, mock, sessions, _ := newTestController(t, 5, maxDevice)
	ctx := context.Background()

	// Set device to be at the limit.
	sessions.deviceCounts["device-full"] = maxDevice

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-overflow").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-overflow",
		MediaID:  "media-overflow",
		DeviceID: "device-full",
		FamilyID: "family-ok",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected device limit error, got nil")
	}
	if !errors.Is(err, ErrDeviceLimit) {
		t.Errorf("expected ErrDeviceLimit, got: %v", err)
	}
}

func TestAdmitSession_DeviceUnderLimit_Allowed(t *testing.T) {
	ctrl, mock, sessions, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	sessions.deviceCounts["device-ok"] = 1 // Under limit of 2.

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-ok",
		FamilyID: "family-1",
	}

	resp, err := ctrl.AdmitSession(ctx, req)
	if err != nil {
		t.Fatalf("expected admission to succeed, got: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
}

// ---------------------------------------------------------------------------
// Session creation failure
// ---------------------------------------------------------------------------

func TestAdmitSession_CreateSessionError(t *testing.T) {
	ctrl, mock, sessions, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	sessions.createErr = fmt.Errorf("redis connection lost")

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error when session creation fails, got nil")
	}
}

// ---------------------------------------------------------------------------
// Token generation failure cleans up session
// ---------------------------------------------------------------------------

func TestAdmitSession_TokenGenerationError_CleansUpSession(t *testing.T) {
	ctrl, mock, sessions, tokens := newTestController(t, 5, 2)
	ctx := context.Background()

	tokens.generateErr = fmt.Errorf("signing key error")

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error when token generation fails, got nil")
	}

	// Verify the session was created then cleaned up.
	if len(sessions.createdSessions) != 1 {
		t.Errorf("expected 1 created session, got %d", len(sessions.createdSessions))
	}
	if len(sessions.endedSessions) != 1 {
		t.Errorf("expected 1 ended session (cleanup), got %d", len(sessions.endedSessions))
	}
}

// ---------------------------------------------------------------------------
// Sentinel error identity tests
// ---------------------------------------------------------------------------

func TestSentinelErrors_AreDistinct(t *testing.T) {
	if errors.Is(ErrUnauthorized, ErrPolicyDenied) {
		t.Error("ErrUnauthorized and ErrPolicyDenied should be distinct")
	}
	if errors.Is(ErrUnauthorized, ErrConcurrencyLimit) {
		t.Error("ErrUnauthorized and ErrConcurrencyLimit should be distinct")
	}
	if errors.Is(ErrUnauthorized, ErrDeviceLimit) {
		t.Error("ErrUnauthorized and ErrDeviceLimit should be distinct")
	}
	if errors.Is(ErrPolicyDenied, ErrConcurrencyLimit) {
		t.Error("ErrPolicyDenied and ErrConcurrencyLimit should be distinct")
	}
	if errors.Is(ErrConcurrencyLimit, ErrDeviceLimit) {
		t.Error("ErrConcurrencyLimit and ErrDeviceLimit should be distinct")
	}
}

func TestSentinelErrors_WrappedErrorsStillMatch(t *testing.T) {
	wrappedUnauth := fmt.Errorf("%w: user is not active", ErrUnauthorized)
	if !errors.Is(wrappedUnauth, ErrUnauthorized) {
		t.Error("wrapped ErrUnauthorized should still be identifiable with errors.Is")
	}

	wrappedPolicy := fmt.Errorf("%w: content rating R exceeds limit PG", ErrPolicyDenied)
	if !errors.Is(wrappedPolicy, ErrPolicyDenied) {
		t.Error("wrapped ErrPolicyDenied should still be identifiable with errors.Is")
	}

	wrappedLimit := fmt.Errorf("%w: family has 5 active streams", ErrConcurrencyLimit)
	if !errors.Is(wrappedLimit, ErrConcurrencyLimit) {
		t.Error("wrapped ErrConcurrencyLimit should still be identifiable with errors.Is")
	}

	wrappedDevice := fmt.Errorf("%w: device has 2 active streams", ErrDeviceLimit)
	if !errors.Is(wrappedDevice, ErrDeviceLimit) {
		t.Error("wrapped ErrDeviceLimit should still be identifiable with errors.Is")
	}
}

// ---------------------------------------------------------------------------
// Family stream count error
// ---------------------------------------------------------------------------

func TestAdmitSession_FamilyCountError(t *testing.T) {
	ctrl, mock, sessions, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	sessions.familyCountErr = fmt.Errorf("redis timeout")

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error when family count fails, got nil")
	}
	if errors.Is(err, ErrConcurrencyLimit) {
		t.Error("family count error should not be mapped to ErrConcurrencyLimit")
	}
}

// ---------------------------------------------------------------------------
// Device stream count error
// ---------------------------------------------------------------------------

func TestAdmitSession_DeviceCountError(t *testing.T) {
	ctrl, mock, sessions, _ := newTestController(t, 5, 2)
	ctx := context.Background()

	sessions.deviceCountErr = fmt.Errorf("redis timeout")

	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error when device count fails, got nil")
	}
	if errors.Is(err, ErrDeviceLimit) {
		t.Error("device count error should not be mapped to ErrDeviceLimit")
	}
}

// ---------------------------------------------------------------------------
// hasPlaybackPermission unit tests
// ---------------------------------------------------------------------------

func TestHasPlaybackPermission(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)
	ctrl := &Controller{Log: log}

	tests := []struct {
		role     string
		expected bool
	}{
		{"owner", true},
		{"admin", true},
		{"helper", true},
		{"viewer", true},
		{"user", true},
		{"", true},
		{"restricted", false},
		{"custom-role", true}, // Unknown roles default to allowed.
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("role_%s", tt.role), func(t *testing.T) {
			got := ctrl.hasPlaybackPermission(tt.role)
			if got != tt.expected {
				t.Errorf("hasPlaybackPermission(%q) = %v, want %v", tt.role, got, tt.expected)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// isRatingAllowed unit tests
// ---------------------------------------------------------------------------

func TestIsRatingAllowed(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)
	ctrl := &Controller{Log: log}

	tests := []struct {
		contentRating string
		profileLimit  string
		expected      bool
	}{
		{"G", "G", true},
		{"G", "PG-13", true},
		{"R", "PG-13", false},
		{"NC-17", "R", false},
		{"TV-Y", "TV-MA", true},
		{"TV-MA", "TV-PG", false},
		{"UNKNOWN", "PG-13", true},
		{"R", "UNKNOWN", true},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("%s_vs_%s", tt.contentRating, tt.profileLimit), func(t *testing.T) {
			got := ctrl.isRatingAllowed(tt.contentRating, tt.profileLimit)
			if got != tt.expected {
				t.Errorf("isRatingAllowed(%q, %q) = %v, want %v",
					tt.contentRating, tt.profileLimit, got, tt.expected)
			}
		})
	}
}
