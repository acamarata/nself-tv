package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the stream gateway service.
type Config struct {
	Port        string
	DatabaseURL string
	RedisURL    string
	LogLevel    string

	// JWT signing secret for playback tokens.
	JWTSecret string
	// Duration before playback tokens expire.
	TokenExpiry time.Duration

	// Maximum concurrent streams per family.
	MaxFamilyStreams int
	// Maximum concurrent streams per device.
	MaxDeviceStreams int
	// Session TTL (heartbeat extends this).
	SessionTTL time.Duration
	// Admin API key for protected endpoints.
	AdminKey string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "5003"),
		DatabaseURL:      getEnv("DATABASE_URL", buildDatabaseURL()),
		RedisURL:         getEnv("REDIS_URL", "redis://localhost:6379/0"),
		LogLevel:         getEnv("LOG_LEVEL", "info"),
		JWTSecret:        requireEnv("JWT_SECRET"),
		TokenExpiry:      getEnvDuration("TOKEN_EXPIRY", 4*time.Hour),
		MaxFamilyStreams: getEnvInt("MAX_FAMILY_STREAMS", 10),
		MaxDeviceStreams: getEnvInt("MAX_DEVICE_STREAMS", 2),
		SessionTTL:       getEnvDuration("SESSION_TTL", 5*time.Minute),
		AdminKey:         getEnv("ADMIN_KEY", ""),
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

// requireEnv reads a required environment variable or panics with a clear message.
func requireEnv(key string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	panic(fmt.Sprintf("required environment variable %s is not set", key))
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

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
	}
	return fallback
}
