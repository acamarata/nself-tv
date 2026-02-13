package token

import (
	"strings"
	"testing"
	"time"
)

// ---------------------------------------------------------------------------
// SignMediaURL: generates correct URL format
// ---------------------------------------------------------------------------

func TestSignMediaURL_CorrectFormat(t *testing.T) {
	signer := NewSigner("test-hmac-secret")

	url, err := signer.SignMediaURL("media-123", "session-abc", 4*time.Hour)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should start with /media/media-123/master.m3u8
	if !strings.HasPrefix(url, "/media/media-123/master.m3u8?") {
		t.Errorf("URL should start with /media/media-123/master.m3u8?, got: %s", url)
	}

	// Should contain token, exp, and session parameters.
	if !strings.Contains(url, "token=") {
		t.Error("URL should contain token parameter")
	}
	if !strings.Contains(url, "exp=") {
		t.Error("URL should contain exp parameter")
	}
	if !strings.Contains(url, "session=session-abc") {
		t.Error("URL should contain session parameter")
	}
}

func TestSignMediaURL_TokenIsHexEncoded(t *testing.T) {
	signer := NewSigner("test-hmac-secret")

	url, err := signer.SignMediaURL("media-123", "session-abc", 4*time.Hour)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Extract the token value.
	parts := strings.Split(url, "token=")
	if len(parts) < 2 {
		t.Fatal("could not extract token from URL")
	}
	tokenPart := strings.Split(parts[1], "&")[0]

	// Token should be a hex string (64 chars for SHA256).
	if len(tokenPart) != 64 {
		t.Errorf("expected 64-char hex token (SHA256), got %d chars: %s", len(tokenPart), tokenPart)
	}

	// Verify all chars are valid hex.
	for _, c := range tokenPart {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
			t.Errorf("token contains non-hex character: %c", c)
			break
		}
	}
}

// ---------------------------------------------------------------------------
// SignMediaURL: validation of inputs
// ---------------------------------------------------------------------------

func TestSignMediaURL_EmptyMediaID_Error(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.SignMediaURL("", "session-abc", 4*time.Hour)
	if err == nil {
		t.Error("expected error for empty mediaID, got nil")
	}
}

func TestSignMediaURL_EmptySessionID_Error(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.SignMediaURL("media-123", "", 4*time.Hour)
	if err == nil {
		t.Error("expected error for empty sessionID, got nil")
	}
}

func TestSignMediaURL_NegativeDuration_Error(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.SignMediaURL("media-123", "session-abc", -1*time.Hour)
	if err == nil {
		t.Error("expected error for negative duration, got nil")
	}
}

func TestSignMediaURL_ZeroDuration_Error(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.SignMediaURL("media-123", "session-abc", 0)
	if err == nil {
		t.Error("expected error for zero duration, got nil")
	}
}

// ---------------------------------------------------------------------------
// ValidateSignedURL: roundtrip (sign then validate)
// ---------------------------------------------------------------------------

func TestValidateSignedURL_Roundtrip(t *testing.T) {
	signer := NewSigner("test-hmac-secret-roundtrip")

	url, err := signer.SignMediaURL("media-456", "session-xyz", 4*time.Hour)
	if err != nil {
		t.Fatalf("SignMediaURL error: %v", err)
	}

	sessionID, err := signer.ValidateSignedURL(url)
	if err != nil {
		t.Fatalf("ValidateSignedURL error: %v", err)
	}

	if sessionID != "session-xyz" {
		t.Errorf("expected sessionID %q, got %q", "session-xyz", sessionID)
	}
}

func TestValidateSignedURL_MultipleDifferentMedia(t *testing.T) {
	signer := NewSigner("test-secret")

	mediaIDs := []string{"media-1", "media-2", "media-3"}
	for _, mediaID := range mediaIDs {
		url, err := signer.SignMediaURL(mediaID, "session-1", 4*time.Hour)
		if err != nil {
			t.Fatalf("SignMediaURL(%s) error: %v", mediaID, err)
		}

		sessionID, err := signer.ValidateSignedURL(url)
		if err != nil {
			t.Fatalf("ValidateSignedURL for %s error: %v", mediaID, err)
		}
		if sessionID != "session-1" {
			t.Errorf("expected sessionID session-1, got %q", sessionID)
		}
	}
}

// ---------------------------------------------------------------------------
// ValidateSignedURL: expired URL
// ---------------------------------------------------------------------------

func TestValidateSignedURL_Expired(t *testing.T) {
	signer := NewSigner("test-secret-expired")

	// Sign with 1 second duration.
	signedURL, err := signer.SignMediaURL("media-123", "session-abc", 1*time.Second)
	if err != nil {
		t.Fatalf("SignMediaURL error: %v", err)
	}

	// Wait for expiration (Unix timestamps are in seconds, need >1s).
	time.Sleep(2 * time.Second)

	_, err = signer.ValidateSignedURL(signedURL)
	if err == nil {
		t.Fatal("expected error for expired URL, got nil")
	}
	if !strings.Contains(err.Error(), "expired") {
		t.Errorf("expected 'expired' in error message, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// ValidateSignedURL: tampered URL
// ---------------------------------------------------------------------------

func TestValidateSignedURL_TamperedToken(t *testing.T) {
	signer := NewSigner("test-secret-tamper")

	url, err := signer.SignMediaURL("media-123", "session-abc", 4*time.Hour)
	if err != nil {
		t.Fatalf("SignMediaURL error: %v", err)
	}

	// Replace the token with garbage.
	tampered := strings.Replace(url, "token=", "token=0000000000000000000000000000000000000000000000000000000000000000", 1)
	// Remove the original token value by reconstructing.
	parts := strings.SplitN(url, "?", 2)
	if len(parts) != 2 {
		t.Fatal("expected URL with query string")
	}
	// Just use a clearly wrong token.
	tampered = parts[0] + "?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&" + strings.SplitN(parts[1], "&", 2)[1]

	_, err = signer.ValidateSignedURL(tampered)
	if err == nil {
		t.Error("expected error for tampered token, got nil")
	}
}

func TestValidateSignedURL_TamperedSessionID(t *testing.T) {
	signer := NewSigner("test-secret-tamper-session")

	url, err := signer.SignMediaURL("media-123", "session-abc", 4*time.Hour)
	if err != nil {
		t.Fatalf("SignMediaURL error: %v", err)
	}

	// Replace session parameter.
	tampered := strings.Replace(url, "session=session-abc", "session=session-evil", 1)

	_, err = signer.ValidateSignedURL(tampered)
	if err == nil {
		t.Error("expected error for tampered session ID, got nil")
	}
}

func TestValidateSignedURL_TamperedMediaID(t *testing.T) {
	signer := NewSigner("test-secret-tamper-media")

	url, err := signer.SignMediaURL("media-123", "session-abc", 4*time.Hour)
	if err != nil {
		t.Fatalf("SignMediaURL error: %v", err)
	}

	// Replace media ID in the path.
	tampered := strings.Replace(url, "media-123", "media-evil", 1)

	_, err = signer.ValidateSignedURL(tampered)
	if err == nil {
		t.Error("expected error for tampered media ID, got nil")
	}
}

// ---------------------------------------------------------------------------
// ValidateSignedURL: wrong secret
// ---------------------------------------------------------------------------

func TestValidateSignedURL_WrongSecret(t *testing.T) {
	signerA := NewSigner("secret-A")
	signerB := NewSigner("secret-B")

	url, err := signerA.SignMediaURL("media-123", "session-abc", 4*time.Hour)
	if err != nil {
		t.Fatalf("SignMediaURL error: %v", err)
	}

	_, err = signerB.ValidateSignedURL(url)
	if err == nil {
		t.Error("expected error when validating with wrong secret, got nil")
	}
}

// ---------------------------------------------------------------------------
// ValidateSignedURL: missing parameters
// ---------------------------------------------------------------------------

func TestValidateSignedURL_MissingToken(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.ValidateSignedURL("/media/media-123/master.m3u8?exp=9999999999&session=sess-1")
	if err == nil {
		t.Error("expected error for missing token, got nil")
	}
}

func TestValidateSignedURL_MissingExp(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.ValidateSignedURL("/media/media-123/master.m3u8?token=abc&session=sess-1")
	if err == nil {
		t.Error("expected error for missing exp, got nil")
	}
}

func TestValidateSignedURL_MissingSession(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.ValidateSignedURL("/media/media-123/master.m3u8?token=abc&exp=9999999999")
	if err == nil {
		t.Error("expected error for missing session, got nil")
	}
}

// ---------------------------------------------------------------------------
// ValidateSignedURL: invalid path
// ---------------------------------------------------------------------------

func TestValidateSignedURL_InvalidPath(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.ValidateSignedURL("/invalid/path?token=abc&exp=9999999999&session=sess-1")
	if err == nil {
		t.Error("expected error for invalid path, got nil")
	}
}

func TestValidateSignedURL_InvalidURL(t *testing.T) {
	signer := NewSigner("test-secret")

	_, err := signer.ValidateSignedURL("://invalid")
	if err == nil {
		t.Error("expected error for invalid URL, got nil")
	}
}

// ---------------------------------------------------------------------------
// Deterministic signatures
// ---------------------------------------------------------------------------

func TestSign_Deterministic(t *testing.T) {
	signer := NewSigner("deterministic-secret")

	sig1 := signer.sign("same-payload")
	sig2 := signer.sign("same-payload")

	if sig1 != sig2 {
		t.Errorf("HMAC signature should be deterministic: %q != %q", sig1, sig2)
	}
}

func TestSign_DifferentPayloads_DifferentSignatures(t *testing.T) {
	signer := NewSigner("deterministic-secret")

	sig1 := signer.sign("payload-1")
	sig2 := signer.sign("payload-2")

	if sig1 == sig2 {
		t.Error("different payloads should produce different signatures")
	}
}

// ---------------------------------------------------------------------------
// extractMediaID
// ---------------------------------------------------------------------------

func TestExtractMediaID_ValidPath(t *testing.T) {
	tests := []struct {
		path     string
		expected string
	}{
		{"/media/abc123/master.m3u8", "abc123"},
		{"/media/my-movie/master.m3u8", "my-movie"},
		{"/media/uuid-with-dashes/master.m3u8", "uuid-with-dashes"},
		{"media/simple/master.m3u8", "simple"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got, err := extractMediaID(tt.path)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, got)
			}
		})
	}
}

func TestExtractMediaID_InvalidPath(t *testing.T) {
	tests := []string{
		"/invalid/abc123/master.m3u8",
		"/other/path",
		"/",
		"",
		"/media//master.m3u8", // Empty media ID.
	}

	for _, path := range tests {
		t.Run(path, func(t *testing.T) {
			_, err := extractMediaID(path)
			if err == nil {
				t.Errorf("expected error for path %q, got nil", path)
			}
		})
	}
}
