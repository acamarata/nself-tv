package tests

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"stream_gateway/internal/admission"
	"stream_gateway/internal/session"
	"stream_gateway/internal/token"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/sirupsen/logrus"
)

// newTestDeps creates a full set of test dependencies:
// a sqlmock DB, a session.Manager backed by miniredis, a token.Generator, and a logger.
// Caller must defer mr.Close() and db.Close().
func newTestDeps(t *testing.T) (*sql.DB, sqlmock.Sqlmock, *session.Manager, *token.Generator, *miniredis.Miniredis, *logrus.Logger) {
	t.Helper()

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}

	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel) // Suppress noise in tests.

	sessionMgr, err := session.NewManager(
		fmt.Sprintf("redis://%s/0", mr.Addr()),
		5*time.Minute,
		log,
	)
	if err != nil {
		t.Fatalf("failed to create session manager: %v", err)
	}

	tokenGen := token.NewGenerator("test-secret-key-for-unit-tests", 4*time.Hour)

	return db, mock, sessionMgr, tokenGen, mr, log
}

// ---------------------------------------------------------------------------
// Tests for isRatingAllowed (via AdmitSession content rating checks)
// ---------------------------------------------------------------------------

func TestAdmitSession_UserActive_Allowed(t *testing.T) {
	db, mock, sessionMgr, tokenGen, mr, log := newTestDeps(t)
	defer db.Close()
	defer mr.Close()
	defer sessionMgr.Close()

	ctrl := admission.NewController(db, sessionMgr, tokenGen, log, 10, 2)
	ctx := context.Background()

	// User exists and is NOT disabled.
	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := admission.AdmitRequest{
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
	db, mock, sessionMgr, tokenGen, mr, log := newTestDeps(t)
	defer db.Close()
	defer mr.Close()
	defer sessionMgr.Close()

	ctrl := admission.NewController(db, sessionMgr, tokenGen, log, 10, 2)
	ctx := context.Background()

	// User exists but IS disabled.
	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-disabled").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(true))

	req := admission.AdmitRequest{
		UserID:   "user-disabled",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error for disabled user, got nil")
	}
	if !errors.Is(err, admission.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled sqlmock expectations: %v", err)
	}
}

func TestAdmitSession_UserNotFound_Denied(t *testing.T) {
	db, mock, sessionMgr, tokenGen, mr, log := newTestDeps(t)
	defer db.Close()
	defer mr.Close()
	defer sessionMgr.Close()

	ctrl := admission.NewController(db, sessionMgr, tokenGen, log, 10, 2)
	ctx := context.Background()

	// User does NOT exist (sql.ErrNoRows).
	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("ghost-user").
		WillReturnError(sql.ErrNoRows)

	req := admission.AdmitRequest{
		UserID:   "ghost-user",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error for non-existent user, got nil")
	}
	if !errors.Is(err, admission.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got: %v", err)
	}
}

func TestAdmitSession_DBError_ReturnsError(t *testing.T) {
	db, mock, sessionMgr, tokenGen, mr, log := newTestDeps(t)
	defer db.Close()
	defer mr.Close()
	defer sessionMgr.Close()

	ctrl := admission.NewController(db, sessionMgr, tokenGen, log, 10, 2)
	ctx := context.Background()

	// Simulate a database connection error.
	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnError(fmt.Errorf("connection refused"))

	req := admission.AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-1",
		FamilyID: "family-1",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected error on database failure, got nil")
	}
	// Should NOT be ErrUnauthorized; it should be a wrapped DB error.
	if errors.Is(err, admission.ErrUnauthorized) {
		t.Error("database errors should not be mapped to ErrUnauthorized")
	}
}

// ---------------------------------------------------------------------------
// Content rating policy enforcement
// ---------------------------------------------------------------------------

func TestAdmitSession_ContentRating_Allowed(t *testing.T) {
	tests := []struct {
		name           string
		contentRating  string
		profileLimit   string
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
			db, mock, sessionMgr, tokenGen, mr, log := newTestDeps(t)
			defer db.Close()
			defer mr.Close()
			defer sessionMgr.Close()

			ctrl := admission.NewController(db, sessionMgr, tokenGen, log, 10, 2)
			ctx := context.Background()

			// User is always active for these tests.
			mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
				WithArgs("user-1").
				WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

			req := admission.AdmitRequest{
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
				if !errors.Is(err, admission.ErrPolicyViolation) {
					t.Errorf("expected ErrPolicyViolation, got: %v", err)
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Family concurrency limit (10 streams max)
// ---------------------------------------------------------------------------

func TestAdmitSession_FamilyConcurrencyLimit(t *testing.T) {
	db, mock, sessionMgr, tokenGen, mr, log := newTestDeps(t)
	defer db.Close()
	defer mr.Close()
	defer sessionMgr.Close()

	maxFamily := 10
	ctrl := admission.NewController(db, sessionMgr, tokenGen, log, maxFamily, 2)
	ctx := context.Background()

	familyID := "family-concurrency"

	// Create maxFamily sessions to fill the limit.
	for i := 0; i < maxFamily; i++ {
		// Each admission query checks user is active.
		mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
			WithArgs(fmt.Sprintf("user-%d", i)).
			WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

		req := admission.AdmitRequest{
			UserID:   fmt.Sprintf("user-%d", i),
			MediaID:  fmt.Sprintf("media-%d", i),
			DeviceID: fmt.Sprintf("device-fam-%d", i), // unique device per session
			FamilyID: familyID,
		}

		_, err := ctrl.AdmitSession(ctx, req)
		if err != nil {
			t.Fatalf("session %d should have succeeded, got error: %v", i, err)
		}
	}

	// The 11th session should be denied.
	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-overflow").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := admission.AdmitRequest{
		UserID:   "user-overflow",
		MediaID:  "media-overflow",
		DeviceID: "device-fam-overflow",
		FamilyID: familyID,
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected concurrency limit error, got nil")
	}
	if !errors.Is(err, admission.ErrConcurrencyLimit) {
		t.Errorf("expected ErrConcurrencyLimit, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Device concurrency limit (2 streams max)
// ---------------------------------------------------------------------------

func TestAdmitSession_DeviceConcurrencyLimit(t *testing.T) {
	db, mock, sessionMgr, tokenGen, mr, log := newTestDeps(t)
	defer db.Close()
	defer mr.Close()
	defer sessionMgr.Close()

	maxDevice := 2
	ctrl := admission.NewController(db, sessionMgr, tokenGen, log, 10, maxDevice)
	ctx := context.Background()

	deviceID := "device-concurrency"

	// Create maxDevice sessions on the same device.
	for i := 0; i < maxDevice; i++ {
		mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
			WithArgs(fmt.Sprintf("user-dev-%d", i)).
			WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

		req := admission.AdmitRequest{
			UserID:   fmt.Sprintf("user-dev-%d", i),
			MediaID:  fmt.Sprintf("media-%d", i),
			DeviceID: deviceID,
			FamilyID: fmt.Sprintf("family-dev-%d", i), // unique family per session to avoid family limit
		}

		_, err := ctrl.AdmitSession(ctx, req)
		if err != nil {
			t.Fatalf("session %d should have succeeded, got error: %v", i, err)
		}
	}

	// The 3rd session on same device should be denied.
	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-dev-overflow").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	req := admission.AdmitRequest{
		UserID:   "user-dev-overflow",
		MediaID:  "media-overflow",
		DeviceID: deviceID,
		FamilyID: "family-dev-overflow",
	}

	_, err := ctrl.AdmitSession(ctx, req)
	if err == nil {
		t.Fatal("expected device concurrency limit error, got nil")
	}
	if !errors.Is(err, admission.ErrConcurrencyLimit) {
		t.Errorf("expected ErrConcurrencyLimit, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Sentinel error identity tests
// ---------------------------------------------------------------------------

func TestSentinelErrors_AreDistinct(t *testing.T) {
	if errors.Is(admission.ErrUnauthorized, admission.ErrPolicyViolation) {
		t.Error("ErrUnauthorized and ErrPolicyViolation should be distinct")
	}
	if errors.Is(admission.ErrUnauthorized, admission.ErrConcurrencyLimit) {
		t.Error("ErrUnauthorized and ErrConcurrencyLimit should be distinct")
	}
	if errors.Is(admission.ErrPolicyViolation, admission.ErrConcurrencyLimit) {
		t.Error("ErrPolicyViolation and ErrConcurrencyLimit should be distinct")
	}
}

func TestSentinelErrors_WrappedErrorsStillMatch(t *testing.T) {
	wrappedUnauth := fmt.Errorf("%w: user is not active", admission.ErrUnauthorized)
	if !errors.Is(wrappedUnauth, admission.ErrUnauthorized) {
		t.Error("wrapped ErrUnauthorized should still be identifiable with errors.Is")
	}

	wrappedPolicy := fmt.Errorf("%w: content rating R exceeds limit PG", admission.ErrPolicyViolation)
	if !errors.Is(wrappedPolicy, admission.ErrPolicyViolation) {
		t.Error("wrapped ErrPolicyViolation should still be identifiable with errors.Is")
	}

	wrappedLimit := fmt.Errorf("%w: family has 10 active streams", admission.ErrConcurrencyLimit)
	if !errors.Is(wrappedLimit, admission.ErrConcurrencyLimit) {
		t.Error("wrapped ErrConcurrencyLimit should still be identifiable with errors.Is")
	}
}

// ---------------------------------------------------------------------------
// Admission succeeds even when session is released before re-check
// ---------------------------------------------------------------------------

func TestAdmitSession_AfterEndSession_AllowsNew(t *testing.T) {
	db, mock, sessionMgr, tokenGen, mr, log := newTestDeps(t)
	defer db.Close()
	defer mr.Close()
	defer sessionMgr.Close()

	// Device limit of 1 to make this clear.
	ctrl := admission.NewController(db, sessionMgr, tokenGen, log, 10, 1)
	ctx := context.Background()

	// First session admitted.
	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	resp1, err := ctrl.AdmitSession(ctx, admission.AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "device-single",
		FamilyID: "family-single",
	})
	if err != nil {
		t.Fatalf("first session should succeed: %v", err)
	}

	// End the first session.
	if err := sessionMgr.EndSession(ctx, resp1.SessionID); err != nil {
		t.Fatalf("failed to end session: %v", err)
	}

	// Second session on same device should now succeed.
	mock.ExpectQuery(`SELECT disabled FROM auth.users WHERE id = \$1`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"disabled"}).AddRow(false))

	resp2, err := ctrl.AdmitSession(ctx, admission.AdmitRequest{
		UserID:   "user-1",
		MediaID:  "media-2",
		DeviceID: "device-single",
		FamilyID: "family-single",
	})
	if err != nil {
		t.Fatalf("second session after end should succeed: %v", err)
	}
	if resp2.SessionID == resp1.SessionID {
		t.Error("new session should have a different ID")
	}
}
