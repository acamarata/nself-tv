"""PostgreSQL database access layer for the recommendation engine.

Provides a connection pool and typed query functions that return the data
structures consumed by the ML models.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Generator, List, Optional, Tuple

import psycopg2
import psycopg2.pool
import psycopg2.extras

from src.config import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data transfer objects
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Interaction:
    """A single user-media interaction record."""
    user_id: str
    media_id: str
    interaction_type: str
    rating: Optional[float]


@dataclass(frozen=True)
class MediaItem:
    """Metadata for a media item used in content-based filtering."""
    id: str
    title: str
    genres: str          # Comma-separated genre names
    community_rating: Optional[float]
    media_type: str      # "movie", "series", "episode", etc.


@dataclass(frozen=True)
class WatchHistoryEntry:
    """A watch-progress record for a single user."""
    media_id: str
    progress: float      # 0.0 .. 1.0
    last_watched: str    # ISO-8601 timestamp


# ---------------------------------------------------------------------------
# Connection pool
# ---------------------------------------------------------------------------

_pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    """Lazily create and return the connection pool singleton."""
    global _pool
    if _pool is None or _pool.closed:
        logger.info("Creating PostgreSQL connection pool (min=%d, max=%d)", config.db_pool_min, config.db_pool_max)
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=config.db_pool_min,
            maxconn=config.db_pool_max,
            dsn=config.database_url,
        )
    return _pool


@contextmanager
def get_connection() -> Generator:
    """Yield a connection from the pool and return it on exit.

    Usage::

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
    """
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)


def close_pool() -> None:
    """Shut down the connection pool (called on app shutdown)."""
    global _pool
    if _pool is not None and not _pool.closed:
        _pool.closeall()
        _pool = None
        logger.info("PostgreSQL connection pool closed")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def check_health() -> bool:
    """Return ``True`` if we can execute a trivial query against the database."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                return cur.fetchone() is not None
    except Exception:
        logger.exception("Database health check failed")
        return False


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_user_interactions(limit: int = 10_000) -> List[Interaction]:
    """Fetch user-media interaction rows.

    The query targets the ``public.user_interactions`` table with columns:
    ``user_id``, ``media_id``, ``interaction_type``, ``rating``.

    Interactions are ordered newest-first so the limit retains the most
    recent activity.
    """
    query = """
        SELECT user_id::text,
               media_id::text,
               interaction_type,
               rating
        FROM public.user_interactions
        ORDER BY created_at DESC
        LIMIT %s
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (limit,))
                rows = cur.fetchall()
                return [
                    Interaction(
                        user_id=row[0],
                        media_id=row[1],
                        interaction_type=row[2],
                        rating=float(row[3]) if row[3] is not None else None,
                    )
                    for row in rows
                ]
    except Exception:
        logger.exception("Failed to fetch user interactions")
        return []


def get_media_metadata() -> List[MediaItem]:
    """Fetch all media items with the fields needed for content-based filtering.

    The query targets ``public.media_items`` with columns:
    ``id``, ``title``, ``genres`` (text/jsonb), ``community_rating``, ``type``.
    """
    query = """
        SELECT id::text,
               title,
               COALESCE(genres, ''),
               community_rating,
               COALESCE(type, 'unknown')
        FROM public.media_items
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                rows = cur.fetchall()
                return [
                    MediaItem(
                        id=row[0],
                        title=row[1],
                        genres=row[2] if isinstance(row[2], str) else ",".join(row[2]),
                        community_rating=float(row[3]) if row[3] is not None else None,
                        media_type=row[4],
                    )
                    for row in rows
                ]
    except Exception:
        logger.exception("Failed to fetch media metadata")
        return []


def get_user_watch_history(user_id: str) -> List[WatchHistoryEntry]:
    """Fetch the watch-progress records for a single user.

    The query targets ``public.watch_progress`` with columns:
    ``media_id``, ``progress``, ``updated_at``.
    """
    query = """
        SELECT media_id::text,
               COALESCE(progress, 0),
               updated_at::text
        FROM public.watch_progress
        WHERE user_id = %s
        ORDER BY updated_at DESC
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (user_id,))
                rows = cur.fetchall()
                return [
                    WatchHistoryEntry(
                        media_id=row[0],
                        progress=float(row[1]),
                        last_watched=row[2],
                    )
                    for row in rows
                ]
    except Exception:
        logger.exception("Failed to fetch watch history for user %s", user_id)
        return []
