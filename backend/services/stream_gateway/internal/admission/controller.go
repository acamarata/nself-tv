package admission

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/sirupsen/logrus"
)

// Sentinel errors returned by AdmitSession for callers to map to HTTP status codes.
var (
	ErrUnauthorized     = errors.New("unauthorized: invalid or missing token")
	ErrPolicyDenied     = errors.New("policy denied: content rating exceeds profile limit")
	ErrConcurrencyLimit = errors.New("concurrency limit: maximum streams reached")
	ErrDeviceLimit      = errors.New("device limit: maximum devices streaming")

	// ErrPolicyViolation is kept as an alias for backward compatibility.
	ErrPolicyViolation = ErrPolicyDenied
)

// SessionProvider abstracts the session management operations needed by the
// admission controller. This enables testing with mock implementations.
type SessionProvider interface {
	GetFamilyStreamCount(ctx context.Context, familyID string) (int, error)
	GetDeviceStreamCount(ctx context.Context, deviceID string) (int, error)
	CreateSession(ctx context.Context, userID, mediaID, deviceID, familyID string) (*StreamSession, error)
	EndSession(ctx context.Context, sessionID string) error
}

// TokenProvider abstracts the token generation operations needed by the
// admission controller.
type TokenProvider interface {
	GeneratePlaybackToken(sess *StreamSession) (string, time.Time, error)
}

// StreamSession represents an active playback session. This is the canonical
// type used across admission and session packages. The session package re-exports
// or embeds this as needed.
type StreamSession struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	MediaID   string    `json:"mediaId"`
	DeviceID  string    `json:"deviceId"`
	FamilyID  string    `json:"familyId"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// AdmitRequest contains all information needed to evaluate a playback request.
type AdmitRequest struct {
	UserID                    string `json:"userId" binding:"required"`
	MediaID                   string `json:"mediaId" binding:"required"`
	DeviceID                  string `json:"deviceId" binding:"required"`
	FamilyID                  string `json:"familyId" binding:"required"`
	UserRole                  string `json:"userRole"`
	ContentRating             string `json:"contentRating"`
	ProfileContentRatingLimit string `json:"profileContentRatingLimit"`
}

// AdmitResponse is returned on successful admission.
type AdmitResponse struct {
	Token     string    `json:"token"`
	SessionID string    `json:"sessionId"`
	ExpiresAt time.Time `json:"expiresAt"`
	MediaURL  string    `json:"mediaUrl,omitempty"`
}

// Controller handles playback admission decisions.
type Controller struct {
	DB              *sql.DB
	Sessions        SessionProvider
	Tokens          TokenProvider
	Log             *logrus.Logger
	MaxFamilyStreams int
	MaxDeviceStreams int
	SessionTTL      time.Duration
}

// NewController creates a new admission controller.
func NewController(
	db *sql.DB,
	sessions SessionProvider,
	tokens TokenProvider,
	log *logrus.Logger,
	maxFamily, maxDevice int,
	sessionTTL time.Duration,
) *Controller {
	return &Controller{
		DB:              db,
		Sessions:        sessions,
		Tokens:          tokens,
		Log:             log,
		MaxFamilyStreams: maxFamily,
		MaxDeviceStreams: maxDevice,
		SessionTTL:      sessionTTL,
	}
}

// contentRatingLevel maps content rating strings to numeric severity levels.
// Higher number = more restrictive content.
var contentRatingLevel = map[string]int{
	"G":     1,
	"PG":    2,
	"PG-13": 3,
	"R":     4,
	"NC-17": 5,
	"TV-Y":  1,
	"TV-Y7": 2,
	"TV-G":  1,
	"TV-PG": 2,
	"TV-14": 3,
	"TV-MA": 4,
	"NR":    5,
}

// AdmitSession evaluates whether a playback session should be permitted.
// It performs the following checks in order:
//  1. User exists and is active (authenticated session verification)
//  2. RBAC permission check (user role must have playback permission)
//  3. Content rating policy check (parental rating vs profile age limit)
//  4. Family concurrent stream limit (max 5 streams by default)
//  5. Device concurrent stream limit (max 2 streams by default)
//
// On success, it creates a session with 8-hour expiry and returns a signed playback token.
func (ctrl *Controller) AdmitSession(ctx context.Context, req AdmitRequest) (*AdmitResponse, error) {
	log := ctrl.Log.WithFields(logrus.Fields{
		"user_id":   req.UserID,
		"media_id":  req.MediaID,
		"device_id": req.DeviceID,
		"family_id": req.FamilyID,
	})

	// Step 1: Validate user exists and is active.
	active, err := ctrl.isUserActive(ctx, req.UserID)
	if err != nil {
		log.WithError(err).Error("failed to check user status")
		return nil, fmt.Errorf("checking user status: %w", err)
	}
	if !active {
		log.Warn("admission denied: user not active")
		return nil, fmt.Errorf("%w: user is not active or does not exist", ErrUnauthorized)
	}

	// Step 2: RBAC permission check.
	if !ctrl.hasPlaybackPermission(req.UserRole) {
		log.WithField("role", req.UserRole).Warn("admission denied: insufficient permissions")
		return nil, fmt.Errorf("%w: role %q does not have playback permission", ErrUnauthorized, req.UserRole)
	}

	// Step 3: Check content rating policy.
	if req.ContentRating != "" && req.ProfileContentRatingLimit != "" {
		if !ctrl.isRatingAllowed(req.ContentRating, req.ProfileContentRatingLimit) {
			log.WithFields(logrus.Fields{
				"content_rating": req.ContentRating,
				"limit":          req.ProfileContentRatingLimit,
			}).Warn("admission denied: content rating exceeds profile limit")
			return nil, fmt.Errorf("%w: content rating %s exceeds profile limit %s",
				ErrPolicyDenied, req.ContentRating, req.ProfileContentRatingLimit)
		}
	}

	// Step 4: Check family concurrent stream limit.
	familyCount, err := ctrl.Sessions.GetFamilyStreamCount(ctx, req.FamilyID)
	if err != nil {
		log.WithError(err).Error("failed to get family stream count")
		return nil, fmt.Errorf("checking family sessions: %w", err)
	}
	if familyCount >= ctrl.MaxFamilyStreams {
		log.WithField("active_streams", familyCount).Warn("admission denied: family stream limit reached")
		return nil, fmt.Errorf("%w: family has %d active streams (max %d)",
			ErrConcurrencyLimit, familyCount, ctrl.MaxFamilyStreams)
	}

	// Step 5: Check device concurrent stream limit.
	deviceCount, err := ctrl.Sessions.GetDeviceStreamCount(ctx, req.DeviceID)
	if err != nil {
		log.WithError(err).Error("failed to get device stream count")
		return nil, fmt.Errorf("checking device sessions: %w", err)
	}
	if deviceCount >= ctrl.MaxDeviceStreams {
		log.WithField("active_streams", deviceCount).Warn("admission denied: device stream limit reached")
		return nil, fmt.Errorf("%w: device has %d active streams (max %d)",
			ErrDeviceLimit, deviceCount, ctrl.MaxDeviceStreams)
	}

	// Step 6: All checks passed. Create session.
	sess, err := ctrl.Sessions.CreateSession(ctx, req.UserID, req.MediaID, req.DeviceID, req.FamilyID)
	if err != nil {
		log.WithError(err).Error("failed to create session")
		return nil, fmt.Errorf("creating session: %w", err)
	}

	// Step 7: Generate playback token.
	playbackToken, expiresAt, err := ctrl.Tokens.GeneratePlaybackToken(sess)
	if err != nil {
		log.WithError(err).Error("failed to generate playback token")
		// Best-effort cleanup of the session we just created.
		_ = ctrl.Sessions.EndSession(ctx, sess.ID)
		return nil, fmt.Errorf("generating playback token: %w", err)
	}

	log.WithField("session_id", sess.ID).Info("admission granted")

	return &AdmitResponse{
		Token:     playbackToken,
		SessionID: sess.ID,
		ExpiresAt: expiresAt,
	}, nil
}

// isUserActive checks if a user exists and has an active status.
func (ctrl *Controller) isUserActive(ctx context.Context, userID string) (bool, error) {
	var disabled bool
	err := ctrl.DB.QueryRowContext(ctx,
		`SELECT disabled FROM auth.users WHERE id = $1`, userID,
	).Scan(&disabled)

	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("querying user %s: %w", userID, err)
	}

	return !disabled, nil
}

// isRatingAllowed checks if the content's rating is at or below the profile's limit.
func (ctrl *Controller) isRatingAllowed(contentRating, profileLimit string) bool {
	contentLevel, contentOK := contentRatingLevel[contentRating]
	limitLevel, limitOK := contentRatingLevel[profileLimit]

	// If either rating is unknown, allow by default (fail open for unknown ratings).
	if !contentOK || !limitOK {
		return true
	}

	return contentLevel <= limitLevel
}

// hasPlaybackPermission checks if the given role has permission to play content.
// All standard roles except "restricted" have playback permission.
// Empty role defaults to "viewer" which has permission.
func (ctrl *Controller) hasPlaybackPermission(role string) bool {
	switch role {
	case "restricted":
		return false
	case "owner", "admin", "helper", "viewer", "user", "":
		return true
	default:
		// Unknown roles default to allowed (fail open).
		return true
	}
}
