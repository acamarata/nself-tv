package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"stream_gateway/internal/admission"
	"stream_gateway/internal/session"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Handler holds dependencies for all HTTP handlers.
type Handler struct {
	Admission  *admission.Controller
	SessionMgr *session.Manager
	Log        *logrus.Logger
}

// NewHandler creates a new Handler with the given dependencies.
func NewHandler(ctrl *admission.Controller, sessionMgr *session.Manager, log *logrus.Logger) *Handler {
	return &Handler{
		Admission:  ctrl,
		SessionMgr: sessionMgr,
		Log:        log,
	}
}

// RegisterRoutes sets up all HTTP routes on the given Gin engine.
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	r.GET("/health", h.Health)

	api := r.Group("/api/v1")
	{
		api.POST("/admit", h.Admit)
		api.POST("/heartbeat/:sessionId", h.Heartbeat)
		api.DELETE("/session/:sessionId", h.EndSession)
		api.GET("/sessions/:familyId", h.ListFamilySessions)
	}
}

// Health returns the service health status including dependency checks.
func (h *Handler) Health(c *gin.Context) {
	status := "healthy"
	details := gin.H{}

	// Check Redis via session manager.
	if err := h.SessionMgr.Ping(c.Request.Context()); err != nil {
		status = "degraded"
		details["redis"] = fmt.Sprintf("unhealthy: %v", err)
	} else {
		details["redis"] = "healthy"
	}

	statusCode := http.StatusOK
	if status != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, gin.H{
		"status":    status,
		"service":   "stream_gateway",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"details":   details,
	})
}

// Admit handles playback admission requests.
// POST /api/v1/admit
// Body: { userId, mediaId, deviceId, familyId, userRole?, contentRating?, profileContentRatingLimit? }
func (h *Handler) Admit(c *gin.Context) {
	var req admission.AdmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": fmt.Sprintf("Invalid request body: %v", err),
		})
		return
	}

	resp, err := h.Admission.AdmitSession(c.Request.Context(), req)
	if err != nil {
		h.handleAdmissionError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": resp,
	})
}

// Heartbeat records a client heartbeat to keep the session alive.
// POST /api/v1/heartbeat/:sessionId
func (h *Handler) Heartbeat(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "sessionId parameter is required",
		})
		return
	}

	if err := h.SessionMgr.RecordHeartbeat(c.Request.Context(), sessionID); err != nil {
		h.Log.WithError(err).WithField("session_id", sessionID).Warn("heartbeat failed")
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "session_not_found",
			"message": fmt.Sprintf("Session %s not found or expired", sessionID),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"sessionId": sessionID,
		"message":   "heartbeat recorded",
	})
}

// EndSession terminates a streaming session.
// DELETE /api/v1/session/:sessionId
func (h *Handler) EndSession(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "sessionId parameter is required",
		})
		return
	}

	if err := h.SessionMgr.EndSession(c.Request.Context(), sessionID); err != nil {
		h.Log.WithError(err).WithField("session_id", sessionID).Error("failed to end session")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to end session",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"sessionId": sessionID,
		"message":   "session ended",
	})
}

// ListFamilySessions returns all active streaming sessions for a family.
// GET /api/v1/sessions/:familyId
func (h *Handler) ListFamilySessions(c *gin.Context) {
	familyID := c.Param("familyId")
	if familyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "familyId parameter is required",
		})
		return
	}

	sessions, err := h.SessionMgr.GetActiveSessions(c.Request.Context(), familyID)
	if err != nil {
		h.Log.WithError(err).WithField("family_id", familyID).Error("failed to list sessions")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to retrieve active sessions",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     sessions,
		"count":    len(sessions),
		"familyId": familyID,
	})
}

// handleAdmissionError maps admission errors to appropriate HTTP status codes.
func (h *Handler) handleAdmissionError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, admission.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": err.Error(),
		})
	case errors.Is(err, admission.ErrPolicyViolation):
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "policy_violation",
			"message": err.Error(),
		})
	case errors.Is(err, admission.ErrConcurrencyLimit):
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":   "concurrency_limit",
			"message": err.Error(),
		})
	default:
		h.Log.WithError(err).Error("unexpected admission error")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "An unexpected error occurred",
		})
	}
}
