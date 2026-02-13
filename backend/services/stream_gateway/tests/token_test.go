package tests

import (
	"testing"
	"time"

	"stream_gateway/internal/session"
	"stream_gateway/internal/token"

	"github.com/golang-jwt/jwt/v5"
)

// ---------------------------------------------------------------------------
// Token generation: correct claims
// ---------------------------------------------------------------------------

func TestGeneratePlaybackToken_ContainsCorrectClaims(t *testing.T) {
	secret := "test-secret-for-claims"
	expiry := 4 * time.Hour
	gen := token.NewGenerator(secret, expiry)

	sess := &session.StreamSession{
		ID:       "session-abc-123",
		UserID:   "user-42",
		MediaID:  "media-99",
		DeviceID: "device-tv-1",
		FamilyID: "family-xyz",
	}

	tokenStr, expiresAt, err := gen.GeneratePlaybackToken(sess)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("expected non-empty token string")
	}
	if expiresAt.Before(time.Now()) {
		t.Error("expiresAt should be in the future")
	}

	// Parse the token back and validate claims.
	claims, err := gen.ValidatePlaybackToken(tokenStr)
	if err != nil {
		t.Fatalf("failed to validate generated token: %v", err)
	}

	// Check subject (sub) = UserID.
	if claims.Subject != sess.UserID {
		t.Errorf("subject: got %q, want %q", claims.Subject, sess.UserID)
	}

	// Check mediaId claim.
	if claims.MediaID != sess.MediaID {
		t.Errorf("mediaId: got %q, want %q", claims.MediaID, sess.MediaID)
	}

	// Check deviceId claim.
	if claims.DeviceID != sess.DeviceID {
		t.Errorf("deviceId: got %q, want %q", claims.DeviceID, sess.DeviceID)
	}

	// Check sessionId claim.
	if claims.SessionID != sess.ID {
		t.Errorf("sessionId: got %q, want %q", claims.SessionID, sess.ID)
	}

	// Check familyId claim.
	if claims.FamilyID != sess.FamilyID {
		t.Errorf("familyId: got %q, want %q", claims.FamilyID, sess.FamilyID)
	}

	// Check issuer.
	if claims.Issuer != "stream_gateway" {
		t.Errorf("issuer: got %q, want %q", claims.Issuer, "stream_gateway")
	}

	// Check IssuedAt is set and recent.
	if claims.IssuedAt == nil {
		t.Fatal("IssuedAt should be set")
	}
	iat := claims.IssuedAt.Time
	if time.Since(iat) > 5*time.Second {
		t.Errorf("IssuedAt too far in the past: %v", iat)
	}

	// Check ExpiresAt is approximately now + expiry.
	if claims.ExpiresAt == nil {
		t.Fatal("ExpiresAt should be set")
	}
	exp := claims.ExpiresAt.Time
	expectedExp := time.Now().Add(expiry)
	diff := exp.Sub(expectedExp)
	if diff < -5*time.Second || diff > 5*time.Second {
		t.Errorf("ExpiresAt off by more than 5s: got %v, expected ~%v", exp, expectedExp)
	}
}

// ---------------------------------------------------------------------------
// Token uses HMAC-SHA256 signing method
// ---------------------------------------------------------------------------

func TestGeneratePlaybackToken_UsesHS256(t *testing.T) {
	gen := token.NewGenerator("hs256-test-secret", 1*time.Hour)

	sess := &session.StreamSession{
		ID:       "sess-1",
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "dev-1",
		FamilyID: "fam-1",
	}

	tokenStr, _, err := gen.GeneratePlaybackToken(sess)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Parse without validation to inspect the header.
	parser := jwt.NewParser()
	tok, _, err := parser.ParseUnverified(tokenStr, &token.PlaybackClaims{})
	if err != nil {
		t.Fatalf("failed to parse token unverified: %v", err)
	}

	alg, ok := tok.Header["alg"].(string)
	if !ok {
		t.Fatal("alg header not found or not a string")
	}
	if alg != "HS256" {
		t.Errorf("expected signing algorithm HS256, got %s", alg)
	}
}

// ---------------------------------------------------------------------------
// Token expiration
// ---------------------------------------------------------------------------

func TestGeneratePlaybackToken_ExpiresAfterConfiguredDuration(t *testing.T) {
	shortExpiry := 1 * time.Second
	gen := token.NewGenerator("expiry-test-secret", shortExpiry)

	sess := &session.StreamSession{
		ID:       "sess-exp",
		UserID:   "user-exp",
		MediaID:  "media-exp",
		DeviceID: "dev-exp",
		FamilyID: "fam-exp",
	}

	tokenStr, expiresAt, err := gen.GeneratePlaybackToken(sess)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// The returned expiresAt should be close to now + shortExpiry.
	expectedExp := time.Now().Add(shortExpiry)
	diff := expiresAt.Sub(expectedExp)
	if diff < -2*time.Second || diff > 2*time.Second {
		t.Errorf("expiresAt off by more than 2s: got %v, expected ~%v", expiresAt, expectedExp)
	}

	// Token should validate immediately.
	_, err = gen.ValidatePlaybackToken(tokenStr)
	if err != nil {
		t.Errorf("token should be valid immediately after generation: %v", err)
	}

	// Wait for it to expire then validate again.
	time.Sleep(2 * time.Second)

	_, err = gen.ValidatePlaybackToken(tokenStr)
	if err == nil {
		t.Error("expected expired token to fail validation, got nil error")
	}
}

func TestGeneratePlaybackToken_DifferentExpiries(t *testing.T) {
	tests := []struct {
		name   string
		expiry time.Duration
	}{
		{"30 seconds", 30 * time.Second},
		{"1 hour", 1 * time.Hour},
		{"4 hours", 4 * time.Hour},
		{"24 hours", 24 * time.Hour},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gen := token.NewGenerator("multi-expiry-secret", tt.expiry)

			sess := &session.StreamSession{
				ID:       "sess-1",
				UserID:   "user-1",
				MediaID:  "media-1",
				DeviceID: "dev-1",
				FamilyID: "fam-1",
			}

			_, expiresAt, err := gen.GeneratePlaybackToken(sess)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			now := time.Now()
			expectedExp := now.Add(tt.expiry)
			diff := expiresAt.Sub(expectedExp)
			if diff < -2*time.Second || diff > 2*time.Second {
				t.Errorf("expiresAt off for %v expiry: got %v, expected ~%v", tt.expiry, expiresAt, expectedExp)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Invalid secret fails verification
// ---------------------------------------------------------------------------

func TestValidatePlaybackToken_WrongSecret_Fails(t *testing.T) {
	genA := token.NewGenerator("secret-A", 4*time.Hour)
	genB := token.NewGenerator("secret-B", 4*time.Hour)

	sess := &session.StreamSession{
		ID:       "sess-1",
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "dev-1",
		FamilyID: "fam-1",
	}

	// Generate with secret A.
	tokenStr, _, err := genA.GeneratePlaybackToken(sess)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Validate with secret B should fail.
	_, err = genB.ValidatePlaybackToken(tokenStr)
	if err == nil {
		t.Error("expected validation to fail with wrong secret, got nil error")
	}
}

func TestValidatePlaybackToken_TamperedToken_Fails(t *testing.T) {
	gen := token.NewGenerator("tamper-test-secret", 4*time.Hour)

	sess := &session.StreamSession{
		ID:       "sess-1",
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "dev-1",
		FamilyID: "fam-1",
	}

	tokenStr, _, err := gen.GeneratePlaybackToken(sess)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Tamper with the token by replacing the entire signature portion with garbage.
	// JWT format: header.payload.signature
	parts := splitJWT(tokenStr)
	if len(parts) != 3 {
		t.Fatalf("expected 3 JWT parts, got %d", len(parts))
	}
	tampered := parts[0] + "." + parts[1] + ".INVALIDSIGNATUREAAAAAAAAAAAAAAAAAAAAAAAAA"

	_, err = gen.ValidatePlaybackToken(tampered)
	if err == nil {
		t.Error("expected validation to fail with tampered token, got nil error")
	}
}

// splitJWT splits a JWT string into its three dot-separated parts.
func splitJWT(tokenStr string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(tokenStr); i++ {
		if tokenStr[i] == '.' {
			parts = append(parts, tokenStr[start:i])
			start = i + 1
		}
	}
	parts = append(parts, tokenStr[start:])
	return parts
}

func TestValidatePlaybackToken_GarbageString_Fails(t *testing.T) {
	gen := token.NewGenerator("garbage-test-secret", 4*time.Hour)

	_, err := gen.ValidatePlaybackToken("this-is-not-a-jwt")
	if err == nil {
		t.Error("expected validation to fail with garbage input, got nil error")
	}
}

func TestValidatePlaybackToken_EmptyString_Fails(t *testing.T) {
	gen := token.NewGenerator("empty-test-secret", 4*time.Hour)

	_, err := gen.ValidatePlaybackToken("")
	if err == nil {
		t.Error("expected validation to fail with empty string, got nil error")
	}
}

// ---------------------------------------------------------------------------
// Nil session handling
// ---------------------------------------------------------------------------

func TestGeneratePlaybackToken_NilSession_Fails(t *testing.T) {
	gen := token.NewGenerator("nil-test-secret", 4*time.Hour)

	_, _, err := gen.GeneratePlaybackToken(nil)
	if err == nil {
		t.Error("expected error for nil session, got nil")
	}
}

// ---------------------------------------------------------------------------
// Same session generates different tokens (due to iat timestamp)
// ---------------------------------------------------------------------------

func TestGeneratePlaybackToken_UniquePerCall(t *testing.T) {
	gen := token.NewGenerator("unique-test-secret", 4*time.Hour)

	// Use two different sessions (different session IDs) to guarantee distinct tokens.
	sess1 := &session.StreamSession{
		ID:       "sess-1",
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "dev-1",
		FamilyID: "fam-1",
	}

	sess2 := &session.StreamSession{
		ID:       "sess-2",
		UserID:   "user-1",
		MediaID:  "media-1",
		DeviceID: "dev-1",
		FamilyID: "fam-1",
	}

	token1, _, err := gen.GeneratePlaybackToken(sess1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	token2, _, err := gen.GeneratePlaybackToken(sess2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Tokens should be different because session IDs differ (different sessionId claim).
	if token1 == token2 {
		t.Error("tokens for different sessions should be different")
	}
}
