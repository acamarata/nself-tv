package token

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Signer creates and validates HMAC-SHA256 signed media URLs.
type Signer struct {
	secret []byte
}

// NewSigner creates a URL signer with the given HMAC secret.
func NewSigner(secret string) *Signer {
	return &Signer{
		secret: []byte(secret),
	}
}

// SignMediaURL generates a signed URL for accessing media content.
// The returned URL has the format:
//
//	/media/{mediaID}/master.m3u8?token={hex_signature}&exp={unix_timestamp}&session={sessionID}
//
// The signature covers mediaID + sessionID + expiration timestamp to prevent
// tampering with any of these values.
func (s *Signer) SignMediaURL(mediaID, sessionID string, duration time.Duration) (string, error) {
	if mediaID == "" {
		return "", fmt.Errorf("mediaID is required")
	}
	if sessionID == "" {
		return "", fmt.Errorf("sessionID is required")
	}
	if duration <= 0 {
		return "", fmt.Errorf("duration must be positive")
	}

	exp := time.Now().Add(duration).Unix()
	expStr := strconv.FormatInt(exp, 10)

	// Create the signature payload: mediaID:sessionID:expiration
	payload := mediaID + ":" + sessionID + ":" + expStr
	signature := s.sign(payload)

	signedURL := fmt.Sprintf("/media/%s/master.m3u8?token=%s&exp=%s&session=%s",
		url.PathEscape(mediaID),
		signature,
		expStr,
		url.QueryEscape(sessionID),
	)

	return signedURL, nil
}

// ValidateSignedURL parses a signed media URL and validates its HMAC signature
// and expiration. Returns the sessionID if valid.
func (s *Signer) ValidateSignedURL(rawURL string) (string, error) {
	// Parse the URL to extract query parameters.
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}

	query := parsed.Query()
	tokenHex := query.Get("token")
	expStr := query.Get("exp")
	sessionID := query.Get("session")

	if tokenHex == "" {
		return "", fmt.Errorf("missing token parameter")
	}
	if expStr == "" {
		return "", fmt.Errorf("missing exp parameter")
	}
	if sessionID == "" {
		return "", fmt.Errorf("missing session parameter")
	}

	// Extract mediaID from the path: /media/{mediaID}/master.m3u8
	mediaID, err := extractMediaID(parsed.Path)
	if err != nil {
		return "", fmt.Errorf("invalid media URL path: %w", err)
	}

	// Check expiration.
	exp, err := strconv.ParseInt(expStr, 10, 64)
	if err != nil {
		return "", fmt.Errorf("invalid expiration timestamp: %w", err)
	}
	if time.Now().Unix() > exp {
		return "", fmt.Errorf("signed URL has expired")
	}

	// Reconstruct the payload and verify the signature.
	payload := mediaID + ":" + sessionID + ":" + expStr
	expectedSignature := s.sign(payload)

	if !hmac.Equal([]byte(tokenHex), []byte(expectedSignature)) {
		return "", fmt.Errorf("invalid signature")
	}

	return sessionID, nil
}

// sign computes the HMAC-SHA256 of the payload and returns it as a hex string.
func (s *Signer) sign(payload string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

// extractMediaID extracts the mediaID from a URL path of the form
// /media/{mediaID}/master.m3u8. The mediaID is URL-decoded.
func extractMediaID(path string) (string, error) {
	// Normalize by trimming leading slash.
	path = strings.TrimPrefix(path, "/")

	// Expected format: media/{mediaID}/master.m3u8
	parts := strings.SplitN(path, "/", 3)
	if len(parts) < 2 || parts[0] != "media" {
		return "", fmt.Errorf("path does not match /media/{mediaID}/... pattern")
	}

	mediaID, err := url.PathUnescape(parts[1])
	if err != nil {
		return "", fmt.Errorf("failed to decode mediaID: %w", err)
	}

	if mediaID == "" {
		return "", fmt.Errorf("empty mediaID in path")
	}

	return mediaID, nil
}
