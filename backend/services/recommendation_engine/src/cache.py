"""Redis caching layer for the recommendation engine.

Provides a thin wrapper around ``redis.Redis`` with JSON serialization
for storing complex recommendation payloads.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import redis

from src.config import config

logger = logging.getLogger(__name__)

_client: Optional[redis.Redis] = None


def _get_client() -> redis.Redis:
    """Lazily create and return the Redis client singleton."""
    global _client
    if _client is None:
        _client = redis.Redis(
            host=config.redis_host,
            port=config.redis_port,
            password=config.redis_password,
            db=config.redis_db,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
    return _client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_cached(key: str) -> Optional[Any]:
    """Retrieve a cached value by *key*.

    Returns the deserialized Python object, or ``None`` on cache miss or
    connection failure.
    """
    try:
        client = _get_client()
        raw = client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except redis.RedisError:
        logger.warning("Redis GET failed for key=%s, treating as cache miss", key)
        return None
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to deserialize cached value for key=%s", key)
        return None


def set_cached(key: str, value: Any, ttl: int = config.cache_ttl_seconds) -> bool:
    """Store *value* under *key* with a TTL in seconds.

    *value* is JSON-serialized before storage.  Returns ``True`` on success.
    """
    try:
        client = _get_client()
        serialized = json.dumps(value)
        client.setex(key, ttl, serialized)
        return True
    except redis.RedisError:
        logger.warning("Redis SET failed for key=%s", key)
        return False
    except (TypeError, ValueError):
        logger.warning("Failed to serialize value for key=%s", key)
        return False


def delete_cached(key: str) -> bool:
    """Delete a key from the cache. Returns ``True`` on success."""
    try:
        client = _get_client()
        client.delete(key)
        return True
    except redis.RedisError:
        logger.warning("Redis DELETE failed for key=%s", key)
        return False


def invalidate_user_recommendations(user_id: str) -> bool:
    """Remove the cached recommendations for a specific user."""
    return delete_cached(f"recs:{user_id}")


def check_health() -> bool:
    """Return ``True`` if Redis responds to a PING."""
    try:
        return _get_client().ping()
    except redis.RedisError:
        logger.warning("Redis health check failed")
        return False


def close_client() -> None:
    """Shut down the Redis client (called on app shutdown)."""
    global _client
    if _client is not None:
        try:
            _client.close()
        except redis.RedisError:
            pass
        _client = None
        logger.info("Redis client closed")
