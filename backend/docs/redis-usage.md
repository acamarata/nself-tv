# Redis Usage — nself-tv

Redis serves three primary functions in nself-tv: job queues (BullMQ), caching, and session management.

## Connection

All services connect to Redis using environment variables:

```
REDIS_HOST=redis    (Docker service name)
REDIS_PORT=6379     (default Redis port)
```

## Namespace Convention

All keys use namespaced prefixes to avoid collisions:

| Prefix | Purpose | Service |
|--------|---------|---------|
| `bull:video:*` | Video processing job queues | video_processor |
| `bull:image:*` | Image processing job queues | thumbnail_generator |
| `cache:trending` | Trending content cache | discovery_service |
| `cache:popular` | Popular content cache | discovery_service |
| `cache:recent` | Recently added cache | discovery_service |
| `cache:recommendations:{userId}` | User recommendations | recommendation_engine |
| `cache:search:{hash}` | Search result cache | library_service |
| `session:{sessionId}` | Stream playback sessions | stream_gateway |
| `ingest:{ingestId}` | VOD ingest pipeline state | library_service |

## Job Queues (BullMQ)

### Video Processing Queues

| Queue | Consumer | Concurrency | Retry |
|-------|----------|-------------|-------|
| `video:transcode` | video_processor | 2 | 3 attempts, exponential backoff |
| `video:trickplay` | video_processor | 2 | 3 attempts, exponential backoff |
| `video:subtitle` | video_processor | 4 | 3 attempts, exponential backoff |

### Image Processing Queues

| Queue | Consumer | Concurrency | Retry |
|-------|----------|-------------|-------|
| `image:poster` | thumbnail_generator | 4 | 3 attempts, exponential backoff |
| `image:sprite` | thumbnail_generator | 2 | 3 attempts, exponential backoff |
| `image:optimize` | thumbnail_generator | 4 | 3 attempts, exponential backoff |

### Default Job Options

```javascript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 86400, count: 1000 },  // keep 24h or 1000 jobs
  removeOnFail: { age: 604800 }                     // keep failed 7 days
}
```

## Caching

### Cache-Aside Pattern

All caching uses cache-aside (lazy loading):
1. Check cache first
2. On miss: query database, store in cache with TTL
3. On hit: return cached value

### TTL Configuration

| Key Pattern | TTL | Rationale |
|-------------|-----|-----------|
| `cache:trending` | 15 min | Refreshed frequently for freshness |
| `cache:popular` | 1 hour | Changes slowly over time |
| `cache:recent` | 5 min | Should reflect new additions quickly |
| `cache:recommendations:{userId}` | 1 hour | Expensive to compute, stable |
| `cache:search:{hash}` | 10 min | Balance between freshness and performance |

## Session Management

### Stream Sessions

Stream gateway stores active playback sessions in Redis:

```
Key:    session:{sessionId}
Value:  JSON { userId, mediaId, deviceId, familyId, startedAt, lastHeartbeat }
TTL:    300 seconds (5 minutes, refreshed by heartbeat)
```

### Concurrent Stream Tracking

```
Key:    family_streams:{familyId}
Type:   SET of sessionIds
Key:    device_streams:{deviceId}
Type:   SET of sessionIds
```

Limits enforced:
- Family: max 10 concurrent streams
- Device: max 2 concurrent streams

## Monitoring

### Useful Redis Commands

```bash
# Queue depth
redis-cli LLEN bull:video:transcode:wait

# Active jobs
redis-cli LLEN bull:video:transcode:active

# Failed jobs
redis-cli LLEN bull:video:transcode:failed

# All cache keys
redis-cli KEYS cache:*

# Active sessions
redis-cli KEYS session:*

# Memory usage
redis-cli INFO memory
```

### Prometheus Metrics

Redis Exporter (part of monitoring stack) exports metrics to Prometheus:
- `redis_connected_clients`
- `redis_used_memory_bytes`
- `redis_commands_processed_total`
- `redis_keyspace_hits_total` / `redis_keyspace_misses_total`
