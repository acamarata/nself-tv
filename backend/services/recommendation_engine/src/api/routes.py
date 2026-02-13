"""FastAPI routes for the recommendation engine API.

All endpoints are mounted under ``/api/v1`` by the main application.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.models.hybrid import HybridRecommender

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["recommendations"])

# The recommender instance is injected by the main app at startup.
_recommender: Optional[HybridRecommender] = None


def set_recommender(recommender: HybridRecommender) -> None:
    """Inject the shared ``HybridRecommender`` instance into the router."""
    global _recommender
    _recommender = recommender


def _get_recommender() -> HybridRecommender:
    """Return the active recommender, raising 503 if not available."""
    if _recommender is None:
        raise HTTPException(
            status_code=503,
            detail="Recommendation engine not initialized",
        )
    return _recommender


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class RecommendationItem(BaseModel):
    media_id: str
    score: float
    reason: str


class RecommendationsResponse(BaseModel):
    user_id: str
    recommendations: List[RecommendationItem]
    count: int
    model_ready: bool


class SimilarItemsResponse(BaseModel):
    media_id: str
    similar: List[RecommendationItem]
    count: int


class RebuildResponse(BaseModel):
    status: str
    details: Dict[str, Any]


class StatusResponse(BaseModel):
    ready: bool
    collaborative: Dict[str, Any]
    content_based: Dict[str, Any]
    weights: Dict[str, float]
    last_rebuild: Optional[float]
    rebuild_duration_seconds: Optional[float]


class HealthResponse(BaseModel):
    status: str
    service: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/recommendations/{user_id}",
    response_model=RecommendationsResponse,
    summary="Get personalized recommendations",
    description=(
        "Returns a ranked list of media recommendations for the given user. "
        "Uses hybrid collaborative + content-based filtering. "
        "New users receive popularity-based fallback recommendations."
    ),
)
async def get_recommendations(
    user_id: str,
    limit: int = Query(default=20, ge=1, le=100, description="Max items to return"),
) -> RecommendationsResponse:
    rec = _get_recommender()
    try:
        results = rec.get_recommendations(user_id, limit=limit)
    except Exception:
        logger.exception("Failed to generate recommendations for user %s", user_id)
        raise HTTPException(
            status_code=500,
            detail="Internal error generating recommendations",
        )

    return RecommendationsResponse(
        user_id=user_id,
        recommendations=[RecommendationItem(**r) for r in results],
        count=len(results),
        model_ready=rec.is_ready,
    )


@router.get(
    "/similar/{media_id}",
    response_model=SimilarItemsResponse,
    summary="Get similar items",
    description=(
        "Returns media items similar to the given item based on content "
        "metadata (genres, type, rating)."
    ),
)
async def get_similar_items(
    media_id: str,
    limit: int = Query(default=10, ge=1, le=50, description="Max items to return"),
) -> SimilarItemsResponse:
    rec = _get_recommender()
    try:
        results = rec.get_similar_items(media_id, limit=limit)
    except Exception:
        logger.exception("Failed to find similar items for media %s", media_id)
        raise HTTPException(
            status_code=500,
            detail="Internal error finding similar items",
        )

    return SimilarItemsResponse(
        media_id=media_id,
        similar=[RecommendationItem(**r) for r in results],
        count=len(results),
    )


@router.post(
    "/rebuild",
    response_model=RebuildResponse,
    summary="Trigger model rebuild",
    description=(
        "Reloads interaction and metadata from the database and retrains "
        "all recommendation models. This is an expensive operation."
    ),
)
async def rebuild_models() -> RebuildResponse:
    rec = _get_recommender()
    try:
        details = rec.rebuild_models()
    except Exception:
        logger.exception("Model rebuild failed")
        raise HTTPException(
            status_code=500,
            detail="Model rebuild failed",
        )

    return RebuildResponse(status="ok", details=details)


@router.get(
    "/status",
    response_model=StatusResponse,
    summary="Model status",
    description="Returns diagnostic information about the recommendation models.",
)
async def get_status() -> StatusResponse:
    rec = _get_recommender()
    return StatusResponse(**rec.get_status())
