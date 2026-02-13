"""Configuration module for the recommendation engine.

Loads all settings from environment variables with sensible defaults
for local development.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    """Immutable application configuration loaded from environment variables."""

    # PostgreSQL
    database_url: str = field(default_factory=lambda: os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/nself_tv_db",
    ))
    db_pool_min: int = field(default_factory=lambda: int(os.getenv("DB_POOL_MIN", "2")))
    db_pool_max: int = field(default_factory=lambda: int(os.getenv("DB_POOL_MAX", "10")))

    # Redis
    redis_host: str = field(default_factory=lambda: os.getenv("REDIS_HOST", "localhost"))
    redis_port: int = field(default_factory=lambda: int(os.getenv("REDIS_PORT", "6379")))
    redis_password: Optional[str] = field(default_factory=lambda: os.getenv("REDIS_PASSWORD"))
    redis_db: int = field(default_factory=lambda: int(os.getenv("REDIS_DB", "0")))

    # Server
    server_port: int = field(default_factory=lambda: int(os.getenv("PORT", "5004")))
    environment: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    base_domain: str = field(default_factory=lambda: os.getenv("BASE_DOMAIN", "localhost"))
    cors_origin: Optional[str] = field(default_factory=lambda: os.getenv("CORS_ORIGIN"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "info"))

    # Recommendation tuning
    collaborative_weight: float = field(
        default_factory=lambda: float(os.getenv("COLLABORATIVE_WEIGHT", "0.6"))
    )
    content_weight: float = field(
        default_factory=lambda: float(os.getenv("CONTENT_WEIGHT", "0.4"))
    )
    cache_ttl_seconds: int = field(
        default_factory=lambda: int(os.getenv("CACHE_TTL_SECONDS", "3600"))
    )
    model_rebuild_interval_seconds: int = field(
        default_factory=lambda: int(os.getenv("MODEL_REBUILD_INTERVAL", "3600"))
    )
    max_interactions: int = field(
        default_factory=lambda: int(os.getenv("MAX_INTERACTIONS", "10000"))
    )

    @property
    def redis_url(self) -> str:
        """Build a Redis URL from individual components."""
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"


# Singleton instance used throughout the application.
config = Config()
