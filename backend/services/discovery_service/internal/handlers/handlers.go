package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"discovery_service/internal/cache"
	"discovery_service/internal/continue_watching"
	"discovery_service/internal/popular"
	"discovery_service/internal/recent"
	"discovery_service/internal/trending"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Handler holds dependencies for all HTTP handlers.
type Handler struct {
	DB                  *sql.DB
	Cache               *cache.RedisCache
	Log                 *logrus.Logger
	TrendingWindowHours int
	DefaultLimit        int
}

// NewHandler creates a new Handler with the given dependencies.
func NewHandler(db *sql.DB, redisCache *cache.RedisCache, log *logrus.Logger, trendingWindow, defaultLimit int) *Handler {
	return &Handler{
		DB:                  db,
		Cache:               redisCache,
		Log:                 log,
		TrendingWindowHours: trendingWindow,
		DefaultLimit:        defaultLimit,
	}
}

// RegisterRoutes sets up all HTTP routes on the given Gin engine.
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	r.GET("/health", h.Health)

	api := r.Group("/api/v1")
	{
		api.GET("/trending", h.GetTrending)
		api.GET("/popular", h.GetPopular)
		api.GET("/recent", h.GetRecentlyAdded)
		api.GET("/continue/:userId", h.GetContinueWatching)
	}
}

// Health returns the service health status including dependency checks.
func (h *Handler) Health(c *gin.Context) {
	status := "healthy"
	details := gin.H{}

	// Check database.
	if err := h.DB.Ping(); err != nil {
		status = "degraded"
		details["database"] = fmt.Sprintf("unhealthy: %v", err)
	} else {
		details["database"] = "healthy"
	}

	// Check Redis.
	if err := h.Cache.Ping(c.Request.Context()); err != nil {
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
		"service":   "discovery_service",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"details":   details,
	})
}

// GetTrending returns trending media items. Results are cached for 15 minutes.
func (h *Handler) GetTrending(c *gin.Context) {
	windowHours := h.TrendingWindowHours
	if wh := c.Query("window"); wh != "" {
		if parsed, err := strconv.Atoi(wh); err == nil && parsed > 0 && parsed <= 168 {
			windowHours = parsed
		}
	}

	cacheKey := fmt.Sprintf("%s:%d", cache.PrefixTrending, windowHours)

	var items []trending.TrendingItem
	err := h.Cache.GetOrSet(c.Request.Context(), cacheKey, &items, cache.TTLTrending, func() (interface{}, error) {
		return trending.CalculateTrending(h.DB, windowHours)
	})
	if err != nil {
		h.Log.WithError(err).Error("failed to get trending items")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to retrieve trending items",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":         items,
		"count":        len(items),
		"windowHours":  windowHours,
		"cachedUntil":  time.Now().UTC().Add(cache.TTLTrending).Format(time.RFC3339),
	})
}

// GetPopular returns popular media items. Results are cached for 1 hour.
func (h *Handler) GetPopular(c *gin.Context) {
	limit := h.DefaultLimit
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	cacheKey := fmt.Sprintf("%s:%d", cache.PrefixPopular, limit)

	var items []popular.PopularItem
	err := h.Cache.GetOrSet(c.Request.Context(), cacheKey, &items, cache.TTLPopular, func() (interface{}, error) {
		return popular.GetPopular(h.DB, limit)
	})
	if err != nil {
		h.Log.WithError(err).Error("failed to get popular items")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to retrieve popular items",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  items,
		"count": len(items),
		"limit": limit,
	})
}

// GetRecentlyAdded returns recently added media items. Results are cached for 30 minutes.
func (h *Handler) GetRecentlyAdded(c *gin.Context) {
	limit := h.DefaultLimit
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	cacheKey := fmt.Sprintf("%s:%d", cache.PrefixRecent, limit)

	var items []recent.MediaItem
	err := h.Cache.GetOrSet(c.Request.Context(), cacheKey, &items, cache.TTLRecent, func() (interface{}, error) {
		return recent.GetRecentlyAdded(h.DB, limit)
	})
	if err != nil {
		h.Log.WithError(err).Error("failed to get recently added items")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to retrieve recently added items",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  items,
		"count": len(items),
		"limit": limit,
	})
}

// GetContinueWatching returns in-progress items for a specific user.
// Optionally accepts a profileId query parameter. Results are cached for 5 minutes.
func (h *Handler) GetContinueWatching(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "userId parameter is required",
		})
		return
	}

	profileID := c.Query("profileId")

	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	cacheKey := fmt.Sprintf("%s:%s:%s:%d", cache.PrefixContinue, userID, profileID, limit)

	var items []continue_watching.ProgressItem
	err := h.Cache.GetOrSet(c.Request.Context(), cacheKey, &items, cache.TTLContinue, func() (interface{}, error) {
		return continue_watching.GetContinueWatching(h.DB, userID, profileID, limit)
	})
	if err != nil {
		h.Log.WithError(err).Error("failed to get continue watching items")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to retrieve continue watching items",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      items,
		"count":     len(items),
		"userId":    userID,
		"profileId": profileID,
	})
}
