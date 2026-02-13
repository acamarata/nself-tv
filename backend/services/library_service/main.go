package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"

	"library_service/internal/config"
	"library_service/internal/handlers"
	"library_service/internal/pipeline"
	"library_service/internal/scanner"
	"library_service/internal/search"
)

func main() {
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetOutput(os.Stdout)

	cfg := config.LoadConfig()

	// Set Gin mode.
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize PostgreSQL connection.
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		logger.WithError(err).Fatal("Failed to open database connection")
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		logger.WithError(err).Warn("Database not reachable at startup; will retry on requests")
	} else {
		logger.Info("Database connection established")
	}

	// Initialize Redis client.
	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		logger.WithError(err).Warn("Redis not reachable at startup; will retry on requests")
	} else {
		logger.Info("Redis connection established")
	}
	defer rdb.Close()

	// Initialize MeiliSearch client.
	meili := search.NewMeiliClient(cfg)
	if err := meili.Setup(); err != nil {
		logger.WithError(err).Warn("MeiliSearch setup failed; search features may be degraded")
	} else {
		logger.Info("MeiliSearch index configured")
	}

	// Initialize scanner.
	sc := scanner.NewScanner()

	// Initialize ingest pipeline.
	pipe := pipeline.NewIngestPipeline(db, rdb, meili, logger)

	// Initialize handlers.
	h := handlers.NewHandlers(db, sc, meili, pipe, logger)

	// Setup Gin router.
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(requestLogger(logger))

	// Health endpoint (no auth, no prefix).
	r.GET("/health", h.HealthHandler)

	// API v1 routes.
	v1 := r.Group("/api/v1")
	{
		v1.POST("/scan", h.ScanHandler)
		v1.GET("/stats", h.StatsHandler)
		v1.POST("/ingest", h.IngestHandler)
		v1.GET("/ingest/:ingestId/status", h.IngestStatusHandler)
		v1.GET("/media", h.MediaListHandler)
		v1.GET("/media/:id", h.MediaDetailHandler)
	}

	// Root and info endpoints for backward compatibility.
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": "library_service",
			"project": "nself-tv",
			"version": "1.0.0",
			"endpoints": []string{
				"GET  /health",
				"POST /api/v1/scan",
				"GET  /api/v1/stats",
				"POST /api/v1/ingest",
				"GET  /api/v1/ingest/:ingestId/status",
				"GET  /api/v1/media",
				"GET  /api/v1/media/:id",
			},
		})
	})

	r.GET("/api/info", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service":   "library_service",
			"project":   "nself-tv",
			"framework": "Gin",
			"runtime":   "Go",
		})
	})

	// Start server with graceful shutdown.
	srv := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.WithField("port", cfg.ServerPort).Info("library_service starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Fatal("Server failed to start")
		}
	}()

	// Wait for interrupt signal.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down library_service...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.WithError(err).Error("Server forced to shutdown")
	}

	logger.Info("library_service stopped")
}

// requestLogger is a Gin middleware that logs every HTTP request.
func requestLogger(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		logger.WithFields(logrus.Fields{
			"status":   c.Writer.Status(),
			"method":   c.Request.Method,
			"path":     path,
			"latency":  time.Since(start).String(),
			"client":   c.ClientIP(),
		}).Info("request")
	}
}
