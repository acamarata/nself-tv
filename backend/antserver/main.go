// AntServer is the cloud ingest and orchestration service for nself-tv.
// It manages event scheduling, tuner coordination, recording lifecycle,
// and stream ingest for live capture and DVR operations.
package main

import (
	"fmt"

	"antserver/internal/config"
	"antserver/internal/coordinator"
	"antserver/internal/handlers"
	"antserver/internal/recorder"
	"antserver/internal/scheduler"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

func main() {
	cfg := config.Load()

	// Configure structured logging.
	level, err := log.ParseLevel(cfg.LogLevel)
	if err != nil {
		level = log.InfoLevel
	}
	log.SetLevel(level)
	log.SetFormatter(&log.JSONFormatter{})

	log.WithFields(log.Fields{
		"port":           cfg.Port,
		"redis_url":      cfg.RedisURL,
		"minio_endpoint": cfg.MinIOEndpoint,
	}).Info("starting antserver")

	// Initialize core components.
	sched := scheduler.New()
	coord := coordinator.New()
	rec := recorder.New()

	// Build the Gin router.
	router := setupRouter(sched, coord, rec)

	// Start the HTTP server.
	addr := fmt.Sprintf(":%d", cfg.Port)
	log.WithField("addr", addr).Info("listening")
	if err := router.Run(addr); err != nil {
		log.WithError(err).Fatal("server failed")
	}
}

// setupRouter creates and configures the Gin engine with all routes.
func setupRouter(sched *scheduler.Scheduler, coord *coordinator.Coordinator, rec *recorder.Recorder) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(gin.Recovery())

	// Health check endpoint.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 routes.
	v1 := router.Group("/api/v1")
	h := handlers.New(sched, coord, rec)
	h.RegisterRoutes(v1)

	return router
}
