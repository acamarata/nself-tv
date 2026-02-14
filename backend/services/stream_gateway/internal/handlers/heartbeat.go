package handlers

import (
	"crypto/subtle"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// StreamHeartbeat records a client heartbeat to keep a streaming session alive.
// POST /api/stream/sessions/:id/heartbeat
func (h *Handler) StreamHeartbeat(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "session id parameter is required",
		})
		return
	}

	// Record heartbeat in the Redis-backed session manager.
	if err := h.SessionMgr.RecordHeartbeat(c.Request.Context(), sessionID); err != nil {
		h.Log.WithError(err).WithField("session_id", sessionID).Warn("heartbeat failed")
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "session_not_found",
			"message": "session not found or expired",
		})
		return
	}

	// Also record heartbeat in the concurrency tracker if available.
	if h.Tracker != nil {
		_ = h.Tracker.RecordHeartbeat(c.Request.Context(), sessionID)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"sessionId": sessionID,
		"message":   "heartbeat recorded",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// ListActiveSessions returns all active streaming sessions.
// GET /api/stream/sessions
// Admin-only: requires X-Admin-Key header.
func (h *Handler) ListActiveSessions(c *gin.Context) {
	// Validate admin authorization via HMAC-safe comparison.
	adminKey := c.GetHeader("X-Admin-Key")
	if adminKey == "" || h.AdminKey == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "admin authorization required",
		})
		return
	}

	if subtle.ConstantTimeCompare([]byte(adminKey), []byte(h.AdminKey)) != 1 {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "invalid admin key",
		})
		return
	}

	var sessions []sessionInfo

	// If we have an in-memory tracker, use it for the listing.
	if h.Tracker != nil {
		tracked := h.Tracker.GetAllSessions(c.Request.Context())
		for _, s := range tracked {
			sessions = append(sessions, sessionInfo{
				ID:        s.ID,
				UserID:    s.UserID,
				MediaID:   s.MediaID,
				DeviceID:  s.DeviceID,
				FamilyID:  s.FamilyID,
				CreatedAt: s.CreatedAt.Format(time.RFC3339),
				ExpiresAt: s.ExpiresAt.Format(time.RFC3339),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  sessions,
		"count": len(sessions),
	})
}

// sessionInfo is a JSON-serializable representation of a stream session for
// the admin listing endpoint.
type sessionInfo struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	MediaID   string `json:"mediaId"`
	DeviceID  string `json:"deviceId"`
	FamilyID  string `json:"familyId"`
	CreatedAt string `json:"createdAt"`
	ExpiresAt string `json:"expiresAt"`
}
