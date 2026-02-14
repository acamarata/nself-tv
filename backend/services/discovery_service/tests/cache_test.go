package tests

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"discovery_service/internal/cache"

	"github.com/alicebob/miniredis/v2"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// newTestCache creates a RedisCache backed by an in-memory miniredis instance.
func newTestCache(t *testing.T) (*cache.RedisCache, *miniredis.Miniredis) {
	t.Helper()
	mr, err := miniredis.Run()
	require.NoError(t, err)

	log := logrus.New()
	log.SetLevel(logrus.DebugLevel)

	rc, err := cache.NewRedisCache("redis://"+mr.Addr(), log)
	require.NoError(t, err)

	return rc, mr
}

// sampleItem is a simple struct for testing serialization.
type sampleItem struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Score float64 `json:"score"`
}

// ---------------------------------------------------------------------------
// NewRedisCache — valid and invalid URLs
// ---------------------------------------------------------------------------

func TestNewRedisCache_ValidURL(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	log := logrus.New()
	rc, err := cache.NewRedisCache("redis://"+mr.Addr(), log)
	require.NoError(t, err)
	assert.NotNil(t, rc)
	rc.Close()
}

func TestNewRedisCache_InvalidURL(t *testing.T) {
	log := logrus.New()
	rc, err := cache.NewRedisCache("not-a-valid-url", log)
	assert.Nil(t, rc)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "parsing redis URL")
}

func TestNewRedisCache_UnreachableServer(t *testing.T) {
	log := logrus.New()
	// Connect to a port nothing is listening on.
	rc, err := cache.NewRedisCache("redis://127.0.0.1:1", log)
	assert.Nil(t, rc)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "redis ping failed")
}

// ---------------------------------------------------------------------------
// Ping
// ---------------------------------------------------------------------------

func TestPing_Healthy(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	err := rc.Ping(context.Background())
	assert.NoError(t, err)
}

// ---------------------------------------------------------------------------
// Get — cache miss (key does not exist)
// ---------------------------------------------------------------------------

func TestGet_CacheMiss(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	var dest sampleItem
	hit := rc.Get(context.Background(), "nonexistent:key", &dest)
	assert.False(t, hit, "nonexistent key should be a cache miss")
}

// ---------------------------------------------------------------------------
// Set + Get — round-trip
// ---------------------------------------------------------------------------

func TestSetAndGet_RoundTrip(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()
	original := sampleItem{ID: "item-1", Name: "Test Item", Score: 9.5}

	err := rc.Set(ctx, "test:item", original, 10*time.Minute)
	require.NoError(t, err)

	var retrieved sampleItem
	hit := rc.Get(ctx, "test:item", &retrieved)
	assert.True(t, hit, "key should exist after Set")
	assert.Equal(t, original, retrieved)
}

// ---------------------------------------------------------------------------
// Set — TTL is respected (key expires)
// ---------------------------------------------------------------------------

func TestSet_TTLExpiry(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()
	err := rc.Set(ctx, "ephemeral:key", sampleItem{ID: "e1"}, 5*time.Second)
	require.NoError(t, err)

	// Key exists before expiry.
	var dest sampleItem
	assert.True(t, rc.Get(ctx, "ephemeral:key", &dest))

	// Fast-forward miniredis past the TTL.
	mr.FastForward(6 * time.Second)

	assert.False(t, rc.Get(ctx, "ephemeral:key", &dest), "key should have expired")
}

// ---------------------------------------------------------------------------
// Get — unmarshal error (corrupted data in Redis)
// ---------------------------------------------------------------------------

func TestGet_UnmarshalError(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	// Manually set a key with invalid JSON.
	mr.Set("bad:json", "this-is-not-json{{{")

	var dest sampleItem
	hit := rc.Get(context.Background(), "bad:json", &dest)
	assert.False(t, hit, "corrupted data should return a cache miss (unmarshal fails)")
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

func TestDelete_ExistingKey(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()
	rc.Set(ctx, "to:delete", sampleItem{ID: "d1"}, 10*time.Minute)

	err := rc.Delete(ctx, "to:delete")
	require.NoError(t, err)

	var dest sampleItem
	assert.False(t, rc.Get(ctx, "to:delete", &dest), "key should be gone after Delete")
}

func TestDelete_NonexistentKey(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	// Deleting a key that does not exist should not error.
	err := rc.Delete(context.Background(), "does:not:exist")
	assert.NoError(t, err)
}

// ---------------------------------------------------------------------------
// InvalidatePrefix
// ---------------------------------------------------------------------------

func TestInvalidatePrefix(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()

	// Set multiple keys with same prefix and one with a different prefix.
	rc.Set(ctx, "discovery:trending:24", sampleItem{ID: "t1"}, 10*time.Minute)
	rc.Set(ctx, "discovery:trending:48", sampleItem{ID: "t2"}, 10*time.Minute)
	rc.Set(ctx, "discovery:popular:50", sampleItem{ID: "p1"}, 10*time.Minute)

	err := rc.InvalidatePrefix(ctx, "discovery:trending")
	require.NoError(t, err)

	var dest sampleItem
	assert.False(t, rc.Get(ctx, "discovery:trending:24", &dest), "trending:24 should be invalidated")
	assert.False(t, rc.Get(ctx, "discovery:trending:48", &dest), "trending:48 should be invalidated")
	assert.True(t, rc.Get(ctx, "discovery:popular:50", &dest), "popular:50 should remain")
}

// ---------------------------------------------------------------------------
// GetOrSet — cache miss -> loader called -> result cached
// ---------------------------------------------------------------------------

func TestGetOrSet_CacheMiss_LoaderCalled(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()
	loaderCalls := 0

	var dest []sampleItem
	err := rc.GetOrSet(ctx, "test:getorset", &dest, 15*time.Minute, func() (interface{}, error) {
		loaderCalls++
		return []sampleItem{
			{ID: "a", Name: "Alpha", Score: 1.0},
			{ID: "b", Name: "Bravo", Score: 2.0},
		}, nil
	})

	require.NoError(t, err)
	assert.Equal(t, 1, loaderCalls, "loader should be called exactly once on miss")
	require.Len(t, dest, 2)
	assert.Equal(t, "a", dest[0].ID)
	assert.Equal(t, "b", dest[1].ID)

	// Verify the data was cached in Redis.
	raw, err := mr.Get("test:getorset")
	require.NoError(t, err)
	var fromRedis []sampleItem
	require.NoError(t, json.Unmarshal([]byte(raw), &fromRedis))
	assert.Len(t, fromRedis, 2)
}

// ---------------------------------------------------------------------------
// GetOrSet — cache hit -> loader NOT called
// ---------------------------------------------------------------------------

func TestGetOrSet_CacheHit_LoaderNotCalled(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()

	// Pre-populate the cache.
	preloaded := []sampleItem{{ID: "cached", Name: "Cached Item", Score: 10.0}}
	rc.Set(ctx, "test:hit", preloaded, 15*time.Minute)

	loaderCalls := 0
	var dest []sampleItem
	err := rc.GetOrSet(ctx, "test:hit", &dest, 15*time.Minute, func() (interface{}, error) {
		loaderCalls++
		return []sampleItem{{ID: "fresh", Name: "Fresh Item", Score: 99.0}}, nil
	})

	require.NoError(t, err)
	assert.Equal(t, 0, loaderCalls, "loader should NOT be called on cache hit")
	require.Len(t, dest, 1)
	assert.Equal(t, "cached", dest[0].ID, "should return cached data, not fresh data")
}

// ---------------------------------------------------------------------------
// GetOrSet — loader returns error -> error propagated, no caching
// ---------------------------------------------------------------------------

func TestGetOrSet_LoaderError(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()

	var dest []sampleItem
	err := rc.GetOrSet(ctx, "test:loadererror", &dest, 15*time.Minute, func() (interface{}, error) {
		return nil, assert.AnError
	})

	require.Error(t, err)
	assert.ErrorIs(t, err, assert.AnError)

	// Key should not exist in Redis after loader error.
	assert.False(t, mr.Exists("test:loadererror"), "cache should not be populated on loader error")
}

// ---------------------------------------------------------------------------
// GetOrSet — cache expires, loader re-invoked
// ---------------------------------------------------------------------------

func TestGetOrSet_CacheExpired_LoaderReinvoked(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()
	callCount := 0

	fetch := func() (interface{}, error) {
		callCount++
		return []sampleItem{{ID: "v" + string(rune('0'+callCount))}}, nil
	}

	// First call: cache miss -> loader called.
	var dest1 []sampleItem
	err := rc.GetOrSet(ctx, "test:expiry", &dest1, 5*time.Second, fetch)
	require.NoError(t, err)
	assert.Equal(t, 1, callCount)

	// Second call: cache hit -> loader NOT called.
	var dest2 []sampleItem
	err = rc.GetOrSet(ctx, "test:expiry", &dest2, 5*time.Second, fetch)
	require.NoError(t, err)
	assert.Equal(t, 1, callCount)

	// Fast-forward past TTL.
	mr.FastForward(6 * time.Second)

	// Third call: cache expired -> loader called again.
	var dest3 []sampleItem
	err = rc.GetOrSet(ctx, "test:expiry", &dest3, 5*time.Second, fetch)
	require.NoError(t, err)
	assert.Equal(t, 2, callCount, "loader should be called again after cache expiry")
}

// ---------------------------------------------------------------------------
// TTL constants verification
// ---------------------------------------------------------------------------

func TestTTLConstants(t *testing.T) {
	assert.Equal(t, 15*time.Minute, cache.TTLTrending, "trending TTL should be 15 minutes")
	assert.Equal(t, 1*time.Hour, cache.TTLPopular, "popular TTL should be 1 hour")
	assert.Equal(t, 30*time.Minute, cache.TTLRecent, "recent TTL should be 30 minutes")
	assert.Equal(t, 5*time.Minute, cache.TTLContinue, "continue watching TTL should be 5 minutes")
	assert.Equal(t, 1*time.Hour, cache.TTLRecommendations, "recommendations TTL should be 1 hour")
}

// ---------------------------------------------------------------------------
// Prefix constants verification
// ---------------------------------------------------------------------------

func TestPrefixConstants(t *testing.T) {
	assert.Equal(t, "discovery:trending", cache.PrefixTrending)
	assert.Equal(t, "discovery:popular", cache.PrefixPopular)
	assert.Equal(t, "discovery:recent", cache.PrefixRecent)
	assert.Equal(t, "discovery:continue", cache.PrefixContinue)
}

// ---------------------------------------------------------------------------
// Set + Get — complex nested struct
// ---------------------------------------------------------------------------

func TestSetAndGet_ComplexStruct(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()
	defer rc.Close()

	ctx := context.Background()

	type nested struct {
		Items []sampleItem `json:"items"`
		Total int          `json:"total"`
	}

	original := nested{
		Items: []sampleItem{
			{ID: "1", Name: "One", Score: 1.1},
			{ID: "2", Name: "Two", Score: 2.2},
		},
		Total: 2,
	}

	err := rc.Set(ctx, "test:nested", original, 10*time.Minute)
	require.NoError(t, err)

	var retrieved nested
	hit := rc.Get(ctx, "test:nested", &retrieved)
	assert.True(t, hit)
	assert.Equal(t, original, retrieved)
}

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

func TestClose(t *testing.T) {
	rc, mr := newTestCache(t)
	defer mr.Close()

	err := rc.Close()
	assert.NoError(t, err)
}
