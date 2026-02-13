// Package handlers provides REST API handlers for the AntServer API.
package handlers

import (
	"net/http"
	"time"

	"antserver/internal/coordinator"
	"antserver/internal/recorder"
	"antserver/internal/scheduler"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// Handler holds references to the core service components.
type Handler struct {
	Scheduler   *scheduler.Scheduler
	Coordinator *coordinator.Coordinator
	Recorder    *recorder.Recorder
}

// New creates a new Handler with the provided service components.
func New(sched *scheduler.Scheduler, coord *coordinator.Coordinator, rec *recorder.Recorder) *Handler {
	return &Handler{
		Scheduler:   sched,
		Coordinator: coord,
		Recorder:    rec,
	}
}

// RegisterRoutes wires all API routes onto the given Gin router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	// Event routes
	rg.POST("/events", h.CreateEvent)
	rg.GET("/events", h.ListEvents)
	rg.GET("/events/:id", h.GetEvent)
	rg.PUT("/events/:id/start", h.StartEvent)
	rg.PUT("/events/:id/stop", h.StopEvent)

	// Recording routes
	rg.GET("/recordings", h.ListRecordings)
	rg.GET("/recordings/:id", h.GetRecording)

	// Device command route
	rg.POST("/devices/:id/command", h.SendDeviceCommand)
}

// --- Request/Response types ---

// CreateEventRequest is the JSON body for creating a new event.
type CreateEventRequest struct {
	Channel   string                 `json:"channel" binding:"required"`
	StartTime string                 `json:"start_time" binding:"required"`
	EndTime   string                 `json:"end_time,omitempty"`
	Metadata  scheduler.EventMetadata `json:"metadata,omitempty"`
}

// DeviceCommandRequest is the JSON body for sending a command to a device.
type DeviceCommandRequest struct {
	Command string                 `json:"command" binding:"required"`
	Params  map[string]interface{} `json:"params,omitempty"`
}

// ErrorResponse is the standard error response format.
type ErrorResponse struct {
	Error string `json:"error"`
}

// --- Event handlers ---

// CreateEvent handles POST /api/v1/events.
func (h *Handler) CreateEvent(c *gin.Context) {
	var req CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid start_time format, expected RFC3339"})
		return
	}

	var endTime time.Time
	if req.EndTime != "" {
		endTime, err = time.Parse(time.RFC3339, req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid end_time format, expected RFC3339"})
			return
		}
	}

	evt := h.Scheduler.CreateEvent(req.Channel, startTime, endTime, req.Metadata)

	// Transition to scheduled state.
	if err := h.Scheduler.Transition(evt.ID, scheduler.StateScheduled); err != nil {
		log.WithError(err).Error("failed to transition event to scheduled")
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to schedule event"})
		return
	}

	// Re-fetch to get updated state.
	evt, _ = h.Scheduler.GetEvent(evt.ID)
	c.JSON(http.StatusCreated, evt)
}

// ListEvents handles GET /api/v1/events.
func (h *Handler) ListEvents(c *gin.Context) {
	events := h.Scheduler.ListEvents()
	c.JSON(http.StatusOK, events)
}

// GetEvent handles GET /api/v1/events/:id.
func (h *Handler) GetEvent(c *gin.Context) {
	id := c.Param("id")
	evt, err := h.Scheduler.GetEvent(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, evt)
}

// StartEvent handles PUT /api/v1/events/:id/start.
// Transitions the event through active -> recording and starts a recording session.
func (h *Handler) StartEvent(c *gin.Context) {
	id := c.Param("id")

	// Transition to active.
	if err := h.Scheduler.Transition(id, scheduler.StateActive); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Transition to recording.
	if err := h.Scheduler.Transition(id, scheduler.StateRecording); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Start the recording.
	evt, _ := h.Scheduler.GetEvent(id)
	streamURL := "srt://" + evt.Channel + ":9000"
	rec := h.Recorder.StartRecording(id, streamURL)

	c.JSON(http.StatusOK, gin.H{
		"event":     evt,
		"recording": rec,
	})
}

// StopEvent handles PUT /api/v1/events/:id/stop.
// Transitions the event to finalizing and then complete.
func (h *Handler) StopEvent(c *gin.Context) {
	id := c.Param("id")

	evt, err := h.Scheduler.GetEvent(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	// Only recording events can be stopped.
	if evt.State != scheduler.StateRecording {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "event is not recording"})
		return
	}

	// Transition to finalizing.
	if err := h.Scheduler.Transition(id, scheduler.StateFinalizing); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Transition to complete.
	if err := h.Scheduler.Transition(id, scheduler.StateComplete); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	evt, _ = h.Scheduler.GetEvent(id)
	c.JSON(http.StatusOK, evt)
}

// --- Recording handlers ---

// ListRecordings handles GET /api/v1/recordings.
func (h *Handler) ListRecordings(c *gin.Context) {
	recordings := h.Recorder.ListRecordings()
	c.JSON(http.StatusOK, recordings)
}

// GetRecording handles GET /api/v1/recordings/:id.
func (h *Handler) GetRecording(c *gin.Context) {
	id := c.Param("id")
	status, err := h.Recorder.GetRecordingStatus(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// --- Device handlers ---

// SendDeviceCommand handles POST /api/v1/devices/:id/command.
func (h *Handler) SendDeviceCommand(c *gin.Context) {
	deviceID := c.Param("id")

	var req DeviceCommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Verify the device exists.
	dev, err := h.Coordinator.GetDevice(deviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	log.WithFields(log.Fields{
		"device_id": deviceID,
		"command":   req.Command,
		"params":    req.Params,
	}).Info("device command received")

	c.JSON(http.StatusAccepted, gin.H{
		"device_id": dev.ID,
		"command":   req.Command,
		"status":    "accepted",
	})
}
