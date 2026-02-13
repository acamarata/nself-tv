package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"discovery_service/internal/cache"
	"discovery_service/internal/handlers"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func init() {
	gin.SetMode(gin.TestMode)
}

// testSetup creates a fully wired Handler with sqlmock and miniredis.
// Returns the Gin engine (routes registered), the sqlmock for setting DB expectations,
// the miniredis instance, and a cleanup function.
func testSetup(t *testing.T, opts ...func(*sqlmock.Sqlmock) error) (*gin.Engine, sqlmock.Sqlmock, *miniredis.Miniredis, func()) {
	t.Helper()

	// Convert our opts to sqlmock options format (func(*sqlmock) error).
	// For standard usage, pass sqlmock options directly to sqlmock.New.
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	mr, err := miniredis.Run()
	require.NoError(t, err)

	log := logrus.New()
	log.SetLevel(logrus.DebugLevel)

	rc, err := cache.NewRedisCache("redis://"+mr.Addr(), log)
	require.NoError(t, err)

	h := handlers.NewHandler(db, rc, log, 24, 50)

	router := gin.New()
	h.RegisterRoutes(router)

	cleanup := func() {
		rc.Close()
		mr.Close()
		db.Close()
	}

	return router, mock, mr, cleanup
}

// testSetupWithPingMonitor creates a test setup with sqlmock ping monitoring enabled.
// Required for testing health endpoint DB ping failures.
func testSetupWithPingMonitor(t *testing.T) (*gin.Engine, sqlmock.Sqlmock, *miniredis.Miniredis, func()) {
	t.Helper()

	db, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	require.NoError(t, err)

	mr, err := miniredis.Run()
	require.NoError(t, err)

	log := logrus.New()
	log.SetLevel(logrus.DebugLevel)

	rc, err := cache.NewRedisCache("redis://"+mr.Addr(), log)
	require.NoError(t, err)

	h := handlers.NewHandler(db, rc, log, 24, 50)

	router := gin.New()
	h.RegisterRoutes(router)

	cleanup := func() {
		rc.Close()
		mr.Close()
		db.Close()
	}

	return router, mock, mr, cleanup
}

// parseJSON unmarshals a response body into a generic map.
func parseJSON(t *testing.T, body []byte) map[string]interface{} {
	t.Helper()
	var result map[string]interface{}
	require.NoError(t, json.Unmarshal(body, &result))
	return result
}

// ---------------------------------------------------------------------------
// Health endpoint
// ---------------------------------------------------------------------------

func TestHealth_AllHealthy(t *testing.T) {
	router, mock, mr, cleanup := testSetupWithPingMonitor(t)
	defer cleanup()
	_ = mr // miniredis is running, so Redis is healthy

	mock.ExpectPing()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, "healthy", body["status"])
	assert.Equal(t, "discovery_service", body["service"])
	assert.Contains(t, body, "timestamp")
	assert.Contains(t, body, "details")

	details := body["details"].(map[string]interface{})
	assert.Equal(t, "healthy", details["database"])
	assert.Equal(t, "healthy", details["redis"])

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestHealth_DatabaseUnhealthy(t *testing.T) {
	router, mock, _, cleanup := testSetupWithPingMonitor(t)
	defer cleanup()

	// Simulate DB ping failure.
	mock.ExpectPing().WillReturnError(assert.AnError)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, "degraded", body["status"])

	details := body["details"].(map[string]interface{})
	assert.Contains(t, details["database"], "unhealthy")
	assert.Equal(t, "healthy", details["redis"])
}

func TestHealth_RedisUnhealthy(t *testing.T) {
	router, mock, mr, cleanup := testSetupWithPingMonitor(t)
	defer cleanup()

	mock.ExpectPing()

	// Stop miniredis to simulate Redis failure.
	mr.Close()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, "degraded", body["status"])

	details := body["details"].(map[string]interface{})
	assert.Equal(t, "healthy", details["database"])
	assert.Contains(t, details["redis"], "unhealthy")
}

// ---------------------------------------------------------------------------
// GET /api/v1/trending
// ---------------------------------------------------------------------------

func TestGetTrending_Success(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("m-001", "Movie 1", "movie", "https://img.example.com/1.jpg", 0.85, 100, 8.5, 75.0).
		AddRow("m-002", "Movie 2", "movie", nil, 0.60, 50, 7.0, 55.0)

	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/trending", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(2), body["count"])
	assert.Equal(t, float64(24), body["windowHours"])
	assert.Contains(t, body, "cachedUntil")

	data := body["data"].([]interface{})
	require.Len(t, data, 2)

	first := data[0].(map[string]interface{})
	assert.Equal(t, "m-001", first["id"])
	assert.Equal(t, "Movie 1", first["title"])

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetTrending_CustomWindow(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("m-001", "Movie", "movie", nil, 0.5, 10, 5.0, 50.0)

	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/trending?window=48", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(48), body["windowHours"])
}

func TestGetTrending_InvalidWindow(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}
	rows := sqlmock.NewRows(columns)

	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnRows(rows)

	// "abc" is not a valid integer; should fall back to default 24.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/trending?window=abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(24), body["windowHours"], "invalid window should fall back to default")
}

func TestGetTrending_WindowOutOfRange(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}
	rows := sqlmock.NewRows(columns)

	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnRows(rows)

	// 200 exceeds the max of 168; should fall back to default 24.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/trending?window=200", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(24), body["windowHours"], "window > 168 should fall back to default")
}

func TestGetTrending_DBError(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnError(assert.AnError)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/trending", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, "internal_error", body["error"])
	assert.Contains(t, body["message"], "Failed to retrieve trending items")
}

func TestGetTrending_EmptyResult(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}
	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnRows(sqlmock.NewRows(columns))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/trending", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(0), body["count"])
}

// ---------------------------------------------------------------------------
// GET /api/v1/popular
// ---------------------------------------------------------------------------

func TestGetPopular_Success(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"view_count", "community_rating",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("m-001", "Popular Movie", "movie", "https://img.example.com/p1.jpg", 500, 9.2).
		AddRow("s-001", "Popular Series", "series", nil, 300, 8.8)

	mock.ExpectQuery("SELECT").
		WithArgs(50). // default limit
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/popular", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(2), body["count"])
	assert.Equal(t, float64(50), body["limit"])

	data := body["data"].([]interface{})
	require.Len(t, data, 2)

	first := data[0].(map[string]interface{})
	assert.Equal(t, "m-001", first["id"])
	assert.Equal(t, "Popular Movie", first["title"])
	assert.Equal(t, float64(1), first["rank"])
}

func TestGetPopular_CustomLimit(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"view_count", "community_rating",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("m-001", "Movie", "movie", nil, 100, 7.0)

	mock.ExpectQuery("SELECT").
		WithArgs(10). // custom limit
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/popular?limit=10", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(10), body["limit"])
}

func TestGetPopular_InvalidLimit(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"view_count", "community_rating",
	}
	rows := sqlmock.NewRows(columns)

	// Invalid limit falls back to default (50).
	mock.ExpectQuery("SELECT").
		WithArgs(50).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/popular?limit=notanumber", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetPopular_LimitExceedsMax(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"view_count", "community_rating",
	}
	rows := sqlmock.NewRows(columns)

	// Limit 300 exceeds max of 200, falls back to default (50).
	mock.ExpectQuery("SELECT").
		WithArgs(50).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/popular?limit=300", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetPopular_DBError(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	mock.ExpectQuery("SELECT").
		WithArgs(50).
		WillReturnError(assert.AnError)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/popular", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, "internal_error", body["error"])
	assert.Contains(t, body["message"], "Failed to retrieve popular items")
}

// ---------------------------------------------------------------------------
// GET /api/v1/recent
// ---------------------------------------------------------------------------

func TestGetRecentlyAdded_Success(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	addedAt1 := time.Date(2026, 2, 1, 10, 0, 0, 0, time.UTC)
	addedAt2 := time.Date(2026, 1, 28, 8, 0, 0, 0, time.UTC)

	columns := []string{
		"id", "title", "type", "poster_url",
		"overview", "added_at", "release_year", "duration",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("m-001", "New Movie", "movie", "https://img.example.com/new.jpg",
			"A great movie", addedAt1, 2026, 7200).
		AddRow("s-001", "New Series", "series", nil,
			nil, addedAt2, nil, nil)

	mock.ExpectQuery("SELECT").
		WithArgs(50).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/recent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(2), body["count"])
	assert.Equal(t, float64(50), body["limit"])

	data := body["data"].([]interface{})
	require.Len(t, data, 2)

	first := data[0].(map[string]interface{})
	assert.Equal(t, "m-001", first["id"])
	assert.Equal(t, "New Movie", first["title"])
	assert.Equal(t, "A great movie", first["overview"])
	assert.Equal(t, float64(2026), first["releaseYear"])
	assert.Equal(t, float64(7200), first["duration"])
}

func TestGetRecentlyAdded_CustomLimit(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"overview", "added_at", "release_year", "duration",
	}
	rows := sqlmock.NewRows(columns)

	mock.ExpectQuery("SELECT").
		WithArgs(5).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/recent?limit=5", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(5), body["limit"])
}

func TestGetRecentlyAdded_DBError(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	mock.ExpectQuery("SELECT").
		WithArgs(50).
		WillReturnError(assert.AnError)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/recent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, "internal_error", body["error"])
	assert.Contains(t, body["message"], "Failed to retrieve recently added items")
}

// ---------------------------------------------------------------------------
// GET /api/v1/continue/:userId
// ---------------------------------------------------------------------------

func TestGetContinueWatching_Success(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	lastWatched := time.Date(2026, 2, 10, 15, 0, 0, 0, time.UTC)

	columns := []string{
		"id", "media_id", "title", "type", "poster_url",
		"progress_percent", "progress_seconds", "total_seconds", "last_watched_at",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("wp-001", "m-001", "Movie In Progress", "movie", "https://img.example.com/ip.jpg",
			45.5, 3200, 7200, lastWatched)

	mock.ExpectQuery("SELECT").
		WithArgs("user-123", "", 20).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/continue/user-123", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(1), body["count"])
	assert.Equal(t, "user-123", body["userId"])
	assert.Equal(t, "", body["profileId"])

	data := body["data"].([]interface{})
	require.Len(t, data, 1)

	first := data[0].(map[string]interface{})
	assert.Equal(t, "wp-001", first["id"])
	assert.Equal(t, "m-001", first["mediaId"])
	assert.Equal(t, "Movie In Progress", first["title"])
	assert.Equal(t, 45.5, first["progressPercent"])
	assert.Equal(t, float64(3200), first["progressSeconds"])
	assert.Equal(t, float64(7200), first["totalSeconds"])
}

func TestGetContinueWatching_WithProfileID(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	lastWatched := time.Date(2026, 2, 9, 12, 0, 0, 0, time.UTC)

	columns := []string{
		"id", "media_id", "title", "type", "poster_url",
		"progress_percent", "progress_seconds", "total_seconds", "last_watched_at",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("wp-002", "m-002", "Another Movie", "movie", nil,
			30.0, 1800, 6000, lastWatched)

	mock.ExpectQuery("SELECT").
		WithArgs("user-456", "profile-abc", 20).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/continue/user-456?profileId=profile-abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, "user-456", body["userId"])
	assert.Equal(t, "profile-abc", body["profileId"])
}

func TestGetContinueWatching_CustomLimit(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "media_id", "title", "type", "poster_url",
		"progress_percent", "progress_seconds", "total_seconds", "last_watched_at",
	}
	rows := sqlmock.NewRows(columns)

	mock.ExpectQuery("SELECT").
		WithArgs("user-789", "", 5).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/continue/user-789?limit=5", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetContinueWatching_InvalidLimit(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "media_id", "title", "type", "poster_url",
		"progress_percent", "progress_seconds", "total_seconds", "last_watched_at",
	}
	rows := sqlmock.NewRows(columns)

	// Invalid limit falls back to default (20).
	mock.ExpectQuery("SELECT").
		WithArgs("user-100", "", 20).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/continue/user-100?limit=invalid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetContinueWatching_LimitExceedsMax(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "media_id", "title", "type", "poster_url",
		"progress_percent", "progress_seconds", "total_seconds", "last_watched_at",
	}
	rows := sqlmock.NewRows(columns)

	// Limit 150 exceeds max of 100, falls back to default (20).
	mock.ExpectQuery("SELECT").
		WithArgs("user-200", "", 20).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/continue/user-200?limit=150", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetContinueWatching_DBError(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	mock.ExpectQuery("SELECT").
		WithArgs("user-err", "", 20).
		WillReturnError(assert.AnError)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/continue/user-err", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, "internal_error", body["error"])
	assert.Contains(t, body["message"], "Failed to retrieve continue watching items")
}

func TestGetContinueWatching_EmptyResult(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "media_id", "title", "type", "poster_url",
		"progress_percent", "progress_seconds", "total_seconds", "last_watched_at",
	}
	mock.ExpectQuery("SELECT").
		WithArgs("user-empty", "", 20).
		WillReturnRows(sqlmock.NewRows(columns))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/continue/user-empty", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	body := parseJSON(t, w.Body.Bytes())
	assert.Equal(t, float64(0), body["count"])
}

// ---------------------------------------------------------------------------
// Route registration — unknown routes return 404
// ---------------------------------------------------------------------------

func TestUnknownRoute_Returns404(t *testing.T) {
	router, _, _, cleanup := testSetup(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/nonexistent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ---------------------------------------------------------------------------
// Caching behavior — second request served from cache (no DB call)
// ---------------------------------------------------------------------------

func TestGetTrending_CacheHitOnSecondRequest(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("m-cached", "Cached Movie", "movie", nil, 0.9, 200, 9.0, 90.0)

	// Only expect ONE query — the second request should hit cache.
	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnRows(rows)

	// First request — cache miss, hits DB.
	req1 := httptest.NewRequest(http.MethodGet, "/api/v1/trending", nil)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Second request — cache hit, no DB call.
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/trending", nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Verify both responses have the same data.
	body1 := parseJSON(t, w1.Body.Bytes())
	body2 := parseJSON(t, w2.Body.Bytes())
	assert.Equal(t, body1["count"], body2["count"])

	// The mock should have been called exactly once.
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetPopular_CacheHitOnSecondRequest(t *testing.T) {
	router, mock, _, cleanup := testSetup(t)
	defer cleanup()

	columns := []string{
		"id", "title", "type", "poster_url",
		"view_count", "community_rating",
	}
	rows := sqlmock.NewRows(columns).
		AddRow("m-pop", "Pop Movie", "movie", nil, 300, 8.0)

	mock.ExpectQuery("SELECT").
		WithArgs(50).
		WillReturnRows(rows)

	// First request.
	req1 := httptest.NewRequest(http.MethodGet, "/api/v1/popular", nil)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Second request — from cache.
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/popular", nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	assert.NoError(t, mock.ExpectationsWereMet())
}

// ---------------------------------------------------------------------------
// Content-Type verification — all endpoints return application/json
// ---------------------------------------------------------------------------

func TestAllEndpoints_ReturnJSON(t *testing.T) {
	router, mock, _, cleanup := testSetupWithPingMonitor(t)
	defer cleanup()

	// Setup minimal expectations for all endpoints.
	trendingCols := []string{"id", "title", "type", "poster_url", "score", "view_count", "avg_rating", "completion_rate"}
	popularCols := []string{"id", "title", "type", "poster_url", "view_count", "community_rating"}
	recentCols := []string{"id", "title", "type", "poster_url", "overview", "added_at", "release_year", "duration"}
	continueCols := []string{"id", "media_id", "title", "type", "poster_url", "progress_percent", "progress_seconds", "total_seconds", "last_watched_at"}

	mock.ExpectPing()
	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), 0.50, 0.30, 0.20).
		WillReturnRows(sqlmock.NewRows(trendingCols))
	mock.ExpectQuery("SELECT").WithArgs(50).WillReturnRows(sqlmock.NewRows(popularCols))
	mock.ExpectQuery("SELECT").WithArgs(50).WillReturnRows(sqlmock.NewRows(recentCols))
	mock.ExpectQuery("SELECT").WithArgs("u1", "", 20).WillReturnRows(sqlmock.NewRows(continueCols))

	endpoints := []string{
		"/health",
		"/api/v1/trending",
		"/api/v1/popular",
		"/api/v1/recent",
		"/api/v1/continue/u1",
	}

	for _, ep := range endpoints {
		t.Run(ep, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, ep, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json",
				"endpoint %s should return JSON content type", ep)
		})
	}
}

// ---------------------------------------------------------------------------
// Method not allowed
// ---------------------------------------------------------------------------

func TestEndpoints_MethodNotAllowed(t *testing.T) {
	router, _, _, cleanup := testSetup(t)
	defer cleanup()

	endpoints := []string{
		"/health",
		"/api/v1/trending",
		"/api/v1/popular",
		"/api/v1/recent",
		"/api/v1/continue/user-1",
	}

	for _, ep := range endpoints {
		t.Run("POST "+ep, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, ep, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Gin returns 404 for method mismatch by default (unless HandleMethodNotAllowed is set).
			assert.True(t, w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed,
				"POST to %s should return 404 or 405, got %d", ep, w.Code)
		})
	}
}
