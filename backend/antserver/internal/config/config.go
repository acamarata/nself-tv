// Package config provides environment-based configuration for AntServer.
package config

import (
	"os"
	"strconv"
)

// Config holds all AntServer configuration values loaded from environment variables.
type Config struct {
	// Port is the HTTP listen port for the API server.
	Port int

	// RedisURL is the connection string for Redis (used for coordination and caching).
	RedisURL string

	// MinIOEndpoint is the S3-compatible object storage endpoint.
	MinIOEndpoint string

	// MinIOAccessKey is the access key for MinIO authentication.
	MinIOAccessKey string

	// MinIOSecretKey is the secret key for MinIO authentication.
	MinIOSecretKey string

	// MinioBucket is the default bucket for recording storage.
	MinioBucket string

	// HasuraEndpoint is the Hasura GraphQL API endpoint.
	HasuraEndpoint string

	// HasuraAdminSecret is the admin secret for Hasura API access.
	HasuraAdminSecret string

	// LogLevel controls the verbosity of structured logging.
	LogLevel string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:              getEnvInt("PORT", 8090),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379"),
		MinIOEndpoint:     getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey:    getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey:    getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioBucket:       getEnv("MINIO_BUCKET", "recordings"),
		HasuraEndpoint:    getEnv("HASURA_ENDPOINT", "http://localhost:8080/v1/graphql"),
		HasuraAdminSecret: getEnv("HASURA_ADMIN_SECRET", ""),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(val); err == nil {
			return n
		}
	}
	return fallback
}
