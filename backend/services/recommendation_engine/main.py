"""Recommendation engine entry-point.

Configures the FastAPI application, background model-rebuild task, and
lifecycle hooks (startup / shutdown).
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.api.routes import router as recommendation_router, set_recommender
from src.cache import close_client as close_redis
from src.config import config
from src.database import check_health as db_healthy, close_pool as close_db
from src.cache import check_health as redis_healthy
from src.models.hybrid import HybridRecommender

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, config.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("recommendation_engine")

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------

recommender = HybridRecommender()
_rebuild_task: asyncio.Task | None = None
_start_time: float = time.time()


# ---------------------------------------------------------------------------
# Background tasks
# ---------------------------------------------------------------------------

async def _periodic_rebuild() -> None:
    """Rebuild models on a fixed interval in the background."""
    interval = config.model_rebuild_interval_seconds
    while True:
        try:
            logger.info("Starting periodic model rebuild")
            # Run the CPU-bound rebuild in a thread so we don't block the
            # event loop.
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, recommender.rebuild_models)
            logger.info("Periodic model rebuild complete")
        except Exception:
            logger.exception("Periodic model rebuild failed; will retry next cycle")
        await asyncio.sleep(interval)


# ---------------------------------------------------------------------------
# Lifespan (startup + shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler: startup and shutdown hooks."""
    global _rebuild_task

    # --- Startup ---
    logger.info("Recommendation engine starting on port %d", config.server_port)

    # Wire the recommender into the API routes.
    set_recommender(recommender)

    # Initial model build (run in executor so startup isn't blocked).
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, recommender.rebuild_models)
        logger.info("Initial model build complete")
    except Exception:
        logger.exception(
            "Initial model build failed; engine will run with empty models "
            "until the next periodic rebuild"
        )

    # Launch background rebuild loop.
    _rebuild_task = asyncio.create_task(_periodic_rebuild())

    yield

    # --- Shutdown ---
    logger.info("Recommendation engine shutting down")
    if _rebuild_task is not None:
        _rebuild_task.cancel()
        try:
            await _rebuild_task
        except asyncio.CancelledError:
            pass

    close_redis()
    close_db()
    logger.info("Cleanup complete")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="nself-tv Recommendation Engine",
    description=(
        "ML-based content recommendation service using hybrid "
        "collaborative + content-based filtering."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

def _get_cors_origins() -> list[str]:
    """Compute allowed CORS origins from environment."""
    if config.cors_origin:
        return [o.strip() for o in config.cors_origin.split(",")]

    env = config.environment
    base = config.base_domain

    if env == "production":
        return [f"https://{base}", f"https://*.{base}"]
    elif env == "staging":
        return [f"https://{base}", f"https://*.{base}", "http://localhost:3000"]
    else:
        return [
            "http://localhost:3000",
            "http://localhost:3001",
            f"http://*.local.{base}",
        ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(recommendation_router)


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    uptime_seconds: float
    dependencies: Dict[str, str]


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Top-level health endpoint checked by Docker HEALTHCHECK."""
    db_ok = False
    redis_ok = False
    try:
        db_ok = db_healthy()
    except Exception:
        pass
    try:
        redis_ok = redis_healthy()
    except Exception:
        pass

    overall = "healthy" if db_ok else "degraded"

    return HealthResponse(
        status=overall,
        service="recommendation_engine",
        timestamp=datetime.now(timezone.utc).isoformat(),
        uptime_seconds=round(time.time() - _start_time, 1),
        dependencies={
            "postgresql": "up" if db_ok else "down",
            "redis": "up" if redis_ok else "down",
        },
    )


@app.get("/", tags=["root"])
async def root() -> Dict[str, Any]:
    """Service identification endpoint."""
    return {
        "service": "recommendation_engine",
        "project": "nself-tv",
        "version": "1.0.0",
        "docs": "/docs",
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = config.server_port
    logger.info("Starting uvicorn on port %d", port)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=(config.environment == "development"),
        log_level=config.log_level,
    )
