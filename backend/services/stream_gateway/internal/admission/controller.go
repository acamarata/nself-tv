package admission

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"stream_gateway/internal/session"
	"stream_gateway/internal/token"

	"github.com/sirupsen/logrus"
)

// Sentinel errors returned by AdmitSession for callers to map to HTTP status codes.
var (
	ErrUnauthorized     = errors.New("unauthorized")
	ErrPolicyViolation  = errors.New("policy_violation")
	ErrConcurrencyLimit = errors.New("concurrency_limit")
)

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
}

// Controller handles playback admission decisions.
type Controller struct {
	DB              *sql.DB
	SessionMgr      *session.Manager
	TokenGen        *token.Generator
	Log             *logrus.Logger
	MaxFamilyStreams int
	MaxDeviceStreams int
}

// NewController creates a new admission controller.
func NewController(
	db *sql.DB,
	sessionMgr *session.Manager,
	tokenGen *token.Generator,
	log *logrus.Logger,
	maxFamily, maxDevice int,
) *Controller {
	return &Controller{
		DB:              db,
		SessionMgr:      sessionMgr,
		TokenGen:        tokenGen,
		Log:             log,
		MaxFamilyStreams: maxFamily,
		MaxDeviceStreams: maxDevice,
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
//  1. User exists and is active
//  2. Content rating is within the profile's allowed limit
//  3. Family concurrent stream limit is not exceeded
//  4. Device concurrent stream limit is not exceeded
//
// On success, it creates a session and returns a signed playback token.
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

	// Step 2: Check content rating policy.
	if req.ContentRating != "" && req.ProfileContentRatingLimit != "" {
		if !ctrl.isRatingAllowed(req.ContentRating, req.ProfileContentRatingLimit) {
			log.WithFields(logrus.Fields{
				"content_rating": req.ContentRating,
				"limit":          req.ProfileContentRatingLimit,
			}).Warn("admission denied: content rating exceeds profile limit")
			return nil, fmt.Errorf("%w: content rating %s exceeds profile limit %s",
				ErrPolicyViolation, req.ContentRating, req.ProfileContentRatingLimit)
		}
	}

	// Step 3: Check family concurrent stream limit.
	familySessions, err := ctrl.SessionMgr.GetActiveSessions(ctx, req.FamilyID)
	if err != nil {
		log.WithError(err).Error("failed to get family sessions")
		return nil, fmt.Errorf("checking family sessions: %w", err)
	}
	if len(familySessions) >= ctrl.MaxFamilyStreams {
		log.WithField("active_streams", len(familySessions)).Warn("admission denied: family stream limit reached")
		return nil, fmt.Errorf("%w: family has %d active streams (max %d)",
			ErrConcurrencyLimit, len(familySessions), ctrl.MaxFamilyStreams)
	}

	// Step 4: Check device concurrent stream limit.
	deviceSessions, err := ctrl.SessionMgr.GetDeviceSessions(ctx, req.DeviceID)
	if err != nil {
		log.WithError(err).Error("failed to get device sessions")
		return nil, fmt.Errorf("checking device sessions: %w", err)
	}
	if len(deviceSessions) >= ctrl.MaxDeviceStreams {
		log.WithField("active_streams", len(deviceSessions)).Warn("admission denied: device stream limit reached")
		return nil, fmt.Errorf("%w: device has %d active streams (max %d)",
			ErrConcurrencyLimit, len(deviceSessions), ctrl.MaxDeviceStreams)
	}

	// Step 5: All checks passed. Create session.
	sess, err := ctrl.SessionMgr.CreateSession(ctx, req.UserID, req.MediaID, req.DeviceID, req.FamilyID)
	if err != nil {
		log.WithError(err).Error("failed to create session")
		return nil, fmt.Errorf("creating session: %w", err)
	}

	// Step 6: Generate playback token.
	playbackToken, expiresAt, err := ctrl.TokenGen.GeneratePlaybackToken(sess)
	if err != nil {
		log.WithError(err).Error("failed to generate playback token")
		// Best-effort cleanup of the session we just created.
		_ = ctrl.SessionMgr.EndSession(ctx, sess.ID)
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
