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

	"discovery_service/internal/cache"
	"discovery_service/internal/config"
	"discovery_service/internal/handlers"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"
)

func main() {
	log := logrus.New()
	log.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339,
	})

	cfg := config.Load()

	level, err := logrus.ParseLevel(cfg.LogLevel)
	if err != nil {
		level = logrus.InfoLevel
	}
	log.SetLevel(level)

	log.WithFields(logrus.Fields{
		"port":           cfg.Port,
		"trending_hours": cfg.TrendingWindowHours,
		"default_limit":  cfg.DefaultLimit,
	}).Info("starting discovery_service")

	// Connect to PostgreSQL.
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.WithError(err).Fatal("failed to open database connection")
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.WithError(err).Fatal("failed to ping database")
	}
	log.Info("database connection established")

	// Connect to Redis.
	redisCache, err := cache.NewRedisCache(cfg.RedisURL, log)
	if err != nil {
		log.WithError(err).Fatal("failed to connect to Redis")
	}
	defer redisCache.Close()
	log.Info("redis connection established")

	// Set Gin mode.
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Middleware: structured logging.
	router.Use(gin.Recovery())
	router.Use(requestLogger(log))

	// Register routes.
	h := handlers.NewHandler(db, redisCache, log, cfg.TrendingWindowHours, cfg.DefaultLimit)
	h.RegisterRoutes(router)

	// Start HTTP server with graceful shutdown.
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Run server in goroutine.
	go func() {
		log.WithField("addr", srv.Addr).Info("discovery_service listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.WithError(err).Fatal("server failed")
		}
	}()

	// Wait for interrupt signal for graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.WithField("signal", sig.String()).Info("shutting down discovery_service")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.WithError(err).Error("server forced to shutdown")
	}

	log.Info("discovery_service stopped")
}

// requestLogger returns a Gin middleware that logs each request.
func requestLogger(log *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		entry := log.WithFields(logrus.Fields{
			"status":   status,
			"method":   c.Request.Method,
			"path":     path,
			"query":    query,
			"latency":  fmt.Sprintf("%dms", latency.Milliseconds()),
			"ip":       c.ClientIP(),
			"ua":       c.Request.UserAgent(),
		})

		if status >= 500 {
			entry.Error("server error")
		} else if status >= 400 {
			entry.Warn("client error")
		} else {
			entry.Info("request")
		}
	}
}
