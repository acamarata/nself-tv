package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"antserver/internal/coordinator"
	"antserver/internal/handlers"
	"antserver/internal/recorder"
	"antserver/internal/scheduler"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestRouter() (*gin.Engine, *scheduler.Scheduler, *coordinator.Coordinator, *recorder.Recorder) {
	gin.SetMode(gin.TestMode)

	sched := scheduler.New()
	coord := coordinator.New()
	rec := recorder.New()

	router := gin.New()
	v1 := router.Group("/api/v1")
	h := handlers.New(sched, coord, rec)
	h.RegisterRoutes(v1)

	return router, sched, coord, rec
}

// --- Health/Smoke Tests ---

func TestRouterSetup(t *testing.T) {
	router, _, _, _ := setupTestRouter()
	assert.NotNil(t, router)
}

// --- Create Event Tests ---

func TestCreateEvent_Success(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	body := map[string]interface{}{
		"channel":    "ESPN",
		"start_time": time.Now().Add(1 * time.Hour).Format(time.RFC3339),
		"end_time":   time.Now().Add(4 * time.Hour).Format(time.RFC3339),
		"metadata": map[string]interface{}{
			"league": "NFL",
			"title":  "Super Bowl",
		},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/events", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp scheduler.Event
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.ID)
	assert.Equal(t, "ESPN", resp.Channel)
	assert.Equal(t, scheduler.StateScheduled, resp.State)
	assert.Equal(t, "NFL", resp.Metadata.League)
}

func TestCreateEvent_MissingChannel(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	body := map[string]interface{}{
		"start_time": time.Now().Add(1 * time.Hour).Format(time.RFC3339),
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/events", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateEvent_InvalidStartTime(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	body := map[string]interface{}{
		"channel":    "ESPN",
		"start_time": "not-a-time",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/events", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateEvent_InvalidEndTime(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	body := map[string]interface{}{
		"channel":    "ESPN",
		"start_time": time.Now().Add(1 * time.Hour).Format(time.RFC3339),
		"end_time":   "not-a-time",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/events", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateEvent_InvalidJSON(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest("POST", "/api/v1/events", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// --- List Events Tests ---

func TestListEvents_Empty(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest("GET", "/api/v1/events", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp []interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Empty(t, resp)
}

func TestListEvents_WithEvents(t *testing.T) {
	router, sched, _, _ := setupTestRouter()

	sched.CreateEvent("ESPN", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})
	sched.CreateEvent("FOX", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

	req := httptest.NewRequest("GET", "/api/v1/events", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp []interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Len(t, resp, 2)
}

// --- Get Event Tests ---

func TestGetEvent_Success(t *testing.T) {
	router, sched, _, _ := setupTestRouter()

	evt := sched.CreateEvent("ESPN", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{
		Title: "Test Game",
	})

	req := httptest.NewRequest("GET", "/api/v1/events/"+evt.ID, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp scheduler.Event
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, evt.ID, resp.ID)
	assert.Equal(t, "ESPN", resp.Channel)
}

func TestGetEvent_NotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest("GET", "/api/v1/events/nonexistent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// --- Start Event Tests ---

func TestStartEvent_Success(t *testing.T) {
	router, sched, _, _ := setupTestRouter()

	evt := sched.CreateEvent("ESPN", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})
	require.NoError(t, sched.Transition(evt.ID, scheduler.StateScheduled))

	req := httptest.NewRequest("PUT", "/api/v1/events/"+evt.ID+"/start", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Contains(t, resp, "event")
	assert.Contains(t, resp, "recording")
}

func TestStartEvent_InvalidState(t *testing.T) {
	router, sched, _, _ := setupTestRouter()

	// Event is in pending state (not scheduled), so transitioning to active should fail.
	evt := sched.CreateEvent("ESPN", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})

	req := httptest.NewRequest("PUT", "/api/v1/events/"+evt.ID+"/start", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestStartEvent_NotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest("PUT", "/api/v1/events/nonexistent/start", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// --- Stop Event Tests ---

func TestStopEvent_Success(t *testing.T) {
	router, sched, _, _ := setupTestRouter()

	evt := sched.CreateEvent("ESPN", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})
	require.NoError(t, sched.Transition(evt.ID, scheduler.StateScheduled))
	require.NoError(t, sched.Transition(evt.ID, scheduler.StateActive))
	require.NoError(t, sched.Transition(evt.ID, scheduler.StateRecording))

	req := httptest.NewRequest("PUT", "/api/v1/events/"+evt.ID+"/stop", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp scheduler.Event
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, scheduler.StateComplete, resp.State)
}

func TestStopEvent_NotRecording(t *testing.T) {
	router, sched, _, _ := setupTestRouter()

	evt := sched.CreateEvent("ESPN", time.Now(), time.Now().Add(time.Hour), scheduler.EventMetadata{})
	require.NoError(t, sched.Transition(evt.ID, scheduler.StateScheduled))

	req := httptest.NewRequest("PUT", "/api/v1/events/"+evt.ID+"/stop", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestStopEvent_NotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest("PUT", "/api/v1/events/nonexistent/stop", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// --- List Recordings Tests ---

func TestListRecordings_Empty(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest("GET", "/api/v1/recordings", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp []interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Empty(t, resp)
}

func TestListRecordings_WithRecordings(t *testing.T) {
	router, _, _, rec := setupTestRouter()

	rec.StartRecording("event-001", "srt://192.168.1.100:9000")
	rec.StartRecording("event-002", "srt://192.168.1.101:9000")

	req := httptest.NewRequest("GET", "/api/v1/recordings", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp []interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Len(t, resp, 2)
}

// --- Get Recording Tests ---

func TestGetRecording_Success(t *testing.T) {
	router, _, _, rec := setupTestRouter()

	recording := rec.StartRecording("event-001", "srt://192.168.1.100:9000")

	req := httptest.NewRequest("GET", "/api/v1/recordings/"+recording.ID, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetRecording_NotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest("GET", "/api/v1/recordings/nonexistent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// --- Device Command Tests ---

func TestSendDeviceCommand_Success(t *testing.T) {
	router, _, coord, _ := setupTestRouter()

	_, err := coord.RegisterDevice("antbox-001", "Living Room", 4)
	require.NoError(t, err)

	body := map[string]interface{}{
		"command": "tune",
		"params": map[string]interface{}{
			"channel": "ESPN",
			"tuner":   0,
		},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/devices/antbox-001/command", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusAccepted, w.Code)

	var resp map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "antbox-001", resp["device_id"])
	assert.Equal(t, "tune", resp["command"])
	assert.Equal(t, "accepted", resp["status"])
}

func TestSendDeviceCommand_DeviceNotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	body := map[string]interface{}{
		"command": "tune",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/devices/nonexistent/command", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestSendDeviceCommand_MissingCommand(t *testing.T) {
	router, _, coord, _ := setupTestRouter()

	_, err := coord.RegisterDevice("antbox-001", "Living Room", 4)
	require.NoError(t, err)

	body := map[string]interface{}{
		"params": map[string]interface{}{},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/devices/antbox-001/command", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSendDeviceCommand_InvalidJSON(t *testing.T) {
	router, _, coord, _ := setupTestRouter()

	_, err := coord.RegisterDevice("antbox-001", "Living Room", 4)
	require.NoError(t, err)

	req := httptest.NewRequest("POST", "/api/v1/devices/antbox-001/command", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
