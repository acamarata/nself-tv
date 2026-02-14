package token

import (
	"fmt"
	"time"

	"stream_gateway/internal/admission"

	"github.com/golang-jwt/jwt/v5"
)

// PlaybackClaims defines the JWT claims embedded in a playback token.
type PlaybackClaims struct {
	jwt.RegisteredClaims
	MediaID   string `json:"mediaId"`
	DeviceID  string `json:"deviceId"`
	SessionID string `json:"sessionId"`
	FamilyID  string `json:"familyId"`
}

// Generator creates signed playback tokens.
// It implements admission.TokenProvider.
type Generator struct {
	secret    []byte
	expiresIn time.Duration
}

// Compile-time check that Generator implements TokenProvider.
var _ admission.TokenProvider = (*Generator)(nil)

// NewGenerator creates a token generator with the given HMAC secret and expiry duration.
func NewGenerator(secret string, expiresIn time.Duration) *Generator {
	return &Generator{
		secret:    []byte(secret),
		expiresIn: expiresIn,
	}
}

// GeneratePlaybackToken creates a signed JWT for the given stream session.
// Returns the token string, its expiration time, and any error.
func (g *Generator) GeneratePlaybackToken(sess *admission.StreamSession) (string, time.Time, error) {
	if sess == nil {
		return "", time.Time{}, fmt.Errorf("session is nil")
	}

	now := time.Now().UTC()
	expiresAt := now.Add(g.expiresIn)

	claims := PlaybackClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   sess.UserID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			Issuer:    "stream_gateway",
		},
		MediaID:   sess.MediaID,
		DeviceID:  sess.DeviceID,
		SessionID: sess.ID,
		FamilyID:  sess.FamilyID,
	}

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := tok.SignedString(g.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("signing playback token: %w", err)
	}

	return signedToken, expiresAt, nil
}

// ValidatePlaybackToken parses and validates a playback token, returning its claims.
func (g *Generator) ValidatePlaybackToken(tokenString string) (*PlaybackClaims, error) {
	tok, err := jwt.ParseWithClaims(tokenString, &PlaybackClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return g.secret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("parsing playback token: %w", err)
	}

	claims, ok := tok.Claims.(*PlaybackClaims)
	if !ok || !tok.Valid {
		return nil, fmt.Errorf("invalid playback token")
	}

	return claims, nil
}

// Secret returns the raw HMAC secret bytes. Used by the URL signer.
func (g *Generator) Secret() []byte {
	return g.secret
}
