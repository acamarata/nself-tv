package main

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

type HealthResponse struct {
	Status    string `json:"status"`
	Service   string `json:"service"`
	Timestamp string `json:"timestamp"`
}

type InfoResponse struct {
	Service  string `json:"service"`
	Project  string `json:"project"`
	Framework string `json:"framework"`
	Runtime  string `json:"runtime"`
	Domain   string `json:"domain"`
}

func main() {
	// Set Gin mode based on environment
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, HealthResponse{
			Status:    "healthy",
			Service:   "stream_gateway",
			Timestamp: time.Now().Format(time.RFC3339),
		})
	})

	// Info endpoint
	r.GET("/api/info", func(c *gin.Context) {
		c.JSON(http.StatusOK, InfoResponse{
			Service:   "stream_gateway",
			Project:   "nself-tv",
			Framework: "Gin",
			Runtime:  "Go",
			Domain:   "localhost",
		})
	})

	// Root endpoint
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message":   "Hello from stream_gateway!",
			"project":   "nself-tv",
			"framework": "Gin - High performance Go web framework",
			"features":  []string{"fast", "middleware support", "JSON validation"},
		})
	})

	// Catch all
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello from stream_gateway!",
			"path":    c.Request.URL.Path,
			"method":  c.Request.Method,
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	println("🚀 stream_gateway is running on http://localhost:" + port)
	println("📍 Health check: http://localhost:" + port + "/health")

	r.Run(":" + port)
}