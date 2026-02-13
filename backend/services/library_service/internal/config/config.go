package config

import (
	"os"
	"strconv"
)

// Config holds all configuration for the library service.
type Config struct {
	ServerPort     string
	DatabaseURL    string
	RedisHost      string
	RedisPort      int
	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioUseSSL    bool
	MeiliSearchURL string
	MeiliSearchKey string
}

// LoadConfig reads configuration from environment variables with sensible defaults.
func LoadConfig() *Config {
	return &Config{
		ServerPort:     getEnv("PORT", "5001"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/nself_tv_db?sslmode=disable"),
		RedisHost:      getEnv("REDIS_HOST", "localhost"),
		RedisPort:      getEnvInt("REDIS_PORT", 6379),
		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioUseSSL:    getEnvBool("MINIO_USE_SSL", false),
		MeiliSearchURL: getEnv("MEILISEARCH_URL", "http://localhost:7700"),
		MeiliSearchKey: getEnv("MEILISEARCH_KEY", ""),
	}
}

// getEnv retrieves an environment variable or returns a default value.
func getEnv(key, defaultValue string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt retrieves an environment variable as an integer or returns a default.
func getEnvInt(key string, defaultValue int) int {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// getEnvBool retrieves an environment variable as a boolean or returns a default.
func getEnvBool(key string, defaultValue bool) bool {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}
