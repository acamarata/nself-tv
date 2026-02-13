package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
)

// Predefined TTL durations for different cache categories.
const (
	TTLTrending        = 15 * time.Minute
	TTLPopular         = 1 * time.Hour
	TTLRecent          = 30 * time.Minute
	TTLContinue        = 5 * time.Minute
	TTLRecommendations = 1 * time.Hour
)

// Cache key prefixes.
const (
	PrefixTrending = "discovery:trending"
	PrefixPopular  = "discovery:popular"
	PrefixRecent   = "discovery:recent"
	PrefixContinue = "discovery:continue"
)

// RedisCache wraps a Redis client with typed get/set operations and
// a cache-aside pattern for transparent caching of database queries.
type RedisCache struct {
	client *redis.Client
	log    *logrus.Logger
}

// NewRedisCache creates a new cache instance from a Redis URL.
// The URL format is: redis://<user>:<password>@<host>:<port>/<db>
func NewRedisCache(redisURL string, log *logrus.Logger) (*RedisCache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing redis URL: %w", err)
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return &RedisCache{
		client: client,
		log:    log,
	}, nil
}

// Get retrieves a cached value and unmarshals it into dest.
// Returns true if the key was found and successfully unmarshaled.
func (c *RedisCache) Get(ctx context.Context, key string, dest interface{}) bool {
	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if err != redis.Nil {
			c.log.WithError(err).WithField("key", key).Warn("cache get error")
		}
		return false
	}

	if err := json.Unmarshal(data, dest); err != nil {
		c.log.WithError(err).WithField("key", key).Warn("cache unmarshal error")
		return false
	}

	return true
}

// Set marshals value and stores it in Redis with the given TTL.
func (c *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshaling cache value: %w", err)
	}

	if err := c.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("setting cache key %s: %w", key, err)
	}

	return nil
}

// Delete removes a key from the cache.
func (c *RedisCache) Delete(ctx context.Context, key string) error {
	if err := c.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("deleting cache key %s: %w", key, err)
	}
	return nil
}

// InvalidatePrefix deletes all keys matching the given prefix pattern.
func (c *RedisCache) InvalidatePrefix(ctx context.Context, prefix string) error {
	iter := c.client.Scan(ctx, 0, prefix+":*", 100).Iterator()
	for iter.Next(ctx) {
		if err := c.client.Del(ctx, iter.Val()).Err(); err != nil {
			c.log.WithError(err).WithField("key", iter.Val()).Warn("failed to delete cache key")
		}
	}
	if err := iter.Err(); err != nil {
		return fmt.Errorf("scanning cache keys with prefix %s: %w", prefix, err)
	}
	return nil
}

// GetOrSet implements the cache-aside pattern. It attempts to read from cache
// first; on a miss, it calls the loader function, stores the result, and
// returns it. This is the primary method consumers should use.
func (c *RedisCache) GetOrSet(ctx context.Context, key string, dest interface{}, ttl time.Duration, loader func() (interface{}, error)) error {
	// Try cache first.
	if c.Get(ctx, key, dest) {
		c.log.WithField("key", key).Debug("cache hit")
		return nil
	}

	c.log.WithField("key", key).Debug("cache miss, loading from source")

	// Cache miss: load from source.
	result, err := loader()
	if err != nil {
		return err
	}

	// Store in cache (best-effort, don't fail the request).
	if setErr := c.Set(ctx, key, result, ttl); setErr != nil {
		c.log.WithError(setErr).WithField("key", key).Warn("failed to populate cache")
	}

	// Marshal and unmarshal to populate dest with the loaded data.
	// This ensures the caller gets data in the same format as a cache hit.
	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("marshaling loader result: %w", err)
	}
	if err := json.Unmarshal(data, dest); err != nil {
		return fmt.Errorf("unmarshaling loader result into dest: %w", err)
	}

	return nil
}

// Ping checks the Redis connection.
func (c *RedisCache) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

// Close closes the underlying Redis client.
func (c *RedisCache) Close() error {
	return c.client.Close()
}
