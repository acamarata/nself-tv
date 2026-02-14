package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all configuration for the discovery service.
type Config struct {
	Port        string
	DatabaseURL string
	RedisURL    string
	LogLevel    string

	// Trending calculation window in hours.
	TrendingWindowHours int
	// Default limit for list queries.
	DefaultLimit int
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:                getEnv("PORT", "5002"),
		DatabaseURL:         getEnv("DATABASE_URL", buildDatabaseURL()),
		RedisURL:            getEnv("REDIS_URL", "redis://localhost:6379/0"),
		LogLevel:            getEnv("LOG_LEVEL", "info"),
		TrendingWindowHours: getEnvInt("TRENDING_WINDOW_HOURS", 24),
		DefaultLimit:        getEnvInt("DEFAULT_LIMIT", 50),
	}
}

// buildDatabaseURL constructs a PostgreSQL connection string from individual env vars.
func buildDatabaseURL() string {
	host := getEnv("POSTGRES_HOST", "localhost")
	port := getEnv("POSTGRES_PORT", "5432")
	user := getEnv("POSTGRES_USER", "postgres")
	password := getEnv("POSTGRES_PASSWORD", "postgres")
	dbName := getEnv("POSTGRES_DB", "nself_tv_db")
	sslMode := getEnv("POSTGRES_SSLMODE", "disable")

	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		user, password, host, port, dbName, sslMode)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return fallback
}
