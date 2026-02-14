"""Hybrid recommender that merges collaborative and content-based signals.

The hybrid model is the primary entry-point for the recommendation API.
It orchestrates data loading, model building, caching, and score merging.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from src import cache as cache_module
from src.config import config
from src.database import (
    get_media_metadata,
    get_user_interactions,
    get_user_watch_history,
)
from src.models.collaborative import CollaborativeFilter
from src.models.content_based import ContentBasedFilter

logger = logging.getLogger(__name__)


class HybridRecommender:
    """Merges collaborative and content-based recommendations.

    Usage::

        rec = HybridRecommender()
        await rec.rebuild_models()       # initial build
        recs = rec.get_recommendations(user_id, limit=20)
    """

    def __init__(
        self,
        collaborative_weight: float = config.collaborative_weight,
        content_weight: float = config.content_weight,
    ) -> None:
        self.collaborative_weight = collaborative_weight
        self.content_weight = content_weight

        self._cf = CollaborativeFilter()
        self._cbf = ContentBasedFilter()

        self._last_rebuild: Optional[float] = None
        self._rebuild_duration: Optional[float] = None

    # ------------------------------------------------------------------
    # Model lifecycle
    # ------------------------------------------------------------------

    def rebuild_models(self) -> Dict[str, Any]:
        """Reload data from the database and retrain both sub-models.

        Returns a summary dict with build statistics.
        """
        start = time.monotonic()

        # 1. Load data from PostgreSQL.
        interactions = get_user_interactions(limit=config.max_interactions)
        media_items = get_media_metadata()

        # 2. Build collaborative model.
        self._cf.build_matrix(interactions)
        if self._cf._is_built:
            self._cf.compute_user_similarity()

        # 3. Build content-based model.
        self._cbf.build_feature_matrix(media_items)
        if self._cbf._is_built:
            self._cbf.compute_item_similarity()

        elapsed = time.monotonic() - start
        self._last_rebuild = time.time()
        self._rebuild_duration = elapsed

        summary = {
            "collaborative": {
                "users": self._cf.user_count,
                "items": self._cf.item_count,
                "ready": self._cf.is_ready,
            },
            "content_based": {
                "items": self._cbf.item_count,
                "features": self._cbf.feature_count,
                "ready": self._cbf.is_ready,
            },
            "interactions_loaded": len(interactions),
            "media_items_loaded": len(media_items),
            "build_time_seconds": round(elapsed, 3),
        }

        logger.info("Model rebuild complete in %.2fs: %s", elapsed, summary)
        return summary

    # ------------------------------------------------------------------
    # Recommendations
    # ------------------------------------------------------------------

    def get_recommendations(
        self,
        user_id: str,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Produce hybrid recommendations for *user_id*.

        1. Check Redis cache.
        2. Get collaborative predictions (weight ``collaborative_weight``).
        3. Get content-based predictions (weight ``content_weight``).
        4. Merge, deduplicate, sort by combined score.
        5. Cache the result.
        6. Return top-*limit* items.

        Cold-start behaviour:
            - New user with no interactions: fall back to content popularity.
            - No models built yet: return empty list.
        """
        # --- Cache lookup ---
        cache_key = f"recs:{user_id}"
        cached = cache_module.get_cached(cache_key)
        if cached is not None:
            logger.debug("Cache hit for user %s", user_id)
            return cached[:limit]

        # --- Collaborative predictions ---
        cf_results: List[Tuple[str, float]] = []
        if self._cf.is_ready:
            cf_results = self._cf.predict_for_user(user_id, n=limit * 3)

        # --- Content-based predictions ---
        cb_results: List[Tuple[str, float]] = []
        if self._cbf.is_ready:
            watch_history = get_user_watch_history(user_id)
            watched_ids = [entry.media_id for entry in watch_history]
            if watched_ids:
                cb_results = self._cbf.recommend_for_user(
                    user_id, watched_ids, n=limit * 3
                )

        # --- Merge ---
        merged = self._merge_scores(cf_results, cb_results)

        # --- Cold-start fallback: popularity ---
        if not merged:
            merged = self._popularity_fallback(user_id, limit)

        # Trim to limit.
        merged = merged[:limit]

        # --- Build response objects ---
        recommendations = self._format_results(merged)

        # --- Cache ---
        if recommendations:
            cache_module.set_cached(
                cache_key, recommendations, ttl=config.cache_ttl_seconds
            )

        return recommendations

    def get_similar_items(
        self,
        media_id: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Return items similar to *media_id* using content-based similarity.

        Falls back to an empty list if the content model is not ready or
        the item is unknown.
        """
        if not self._cbf.is_ready:
            return []

        similar = self._cbf.get_similar_items(media_id, n=limit)
        return [
            {
                "media_id": mid,
                "score": score,
                "reason": "similar_content",
            }
            for mid, score in similar
        ]

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _merge_scores(
        self,
        cf_results: List[Tuple[str, float]],
        cb_results: List[Tuple[str, float]],
    ) -> List[Tuple[str, float, str]]:
        """Merge collaborative and content-based scores.

        Each item's final score is::

            score = cf_weight * cf_score_normalized + cb_weight * cb_score_normalized

        Returns a list of ``(media_id, combined_score, reason)`` sorted
        descending by score.
        """
        # Normalize scores within each source to [0, 1].
        cf_normed = self._normalize(cf_results)
        cb_normed = self._normalize(cb_results)

        # Combine into a single dict.
        combined: Dict[str, Dict[str, float]] = {}

        for media_id, score in cf_normed:
            combined.setdefault(media_id, {"cf": 0.0, "cb": 0.0})
            combined[media_id]["cf"] = score

        for media_id, score in cb_normed:
            combined.setdefault(media_id, {"cf": 0.0, "cb": 0.0})
            combined[media_id]["cb"] = score

        # Compute weighted sum and determine dominant reason.
        results: List[Tuple[str, float, str]] = []
        for media_id, scores in combined.items():
            final = (
                self.collaborative_weight * scores["cf"]
                + self.content_weight * scores["cb"]
            )
            if scores["cf"] >= scores["cb"]:
                reason = "users_like_you"
            else:
                reason = "similar_to_watched"
            results.append((media_id, round(final, 4), reason))

        results.sort(key=lambda x: x[1], reverse=True)
        return results

    @staticmethod
    def _normalize(
        scores: List[Tuple[str, float]],
    ) -> List[Tuple[str, float]]:
        """Min-max normalize a list of ``(id, score)`` tuples to [0, 1]."""
        if not scores:
            return []

        values = [s for _, s in scores]
        lo = min(values)
        hi = max(values)
        span = hi - lo

        if span == 0:
            # All scores identical: assign uniform 0.5.
            return [(mid, 0.5) for mid, _ in scores]

        return [(mid, (s - lo) / span) for mid, s in scores]

    def _popularity_fallback(
        self,
        user_id: str,
        limit: int,
    ) -> List[Tuple[str, float, str]]:
        """Cold-start fallback: recommend popular items.

        Uses the content-based model's metadata (community_rating) as a
        proxy for popularity.
        """
        if not self._cbf._item_metadata:
            return []

        # Get items the user has already watched.
        watch_history = get_user_watch_history(user_id)
        watched_ids = {entry.media_id for entry in watch_history}

        # Rank by community rating.
        rated_items: List[Tuple[str, float]] = []
        for mid, item in self._cbf._item_metadata.items():
            if mid in watched_ids:
                continue
            rating = item.community_rating if item.community_rating is not None else 0.0
            rated_items.append((mid, rating))

        rated_items.sort(key=lambda x: x[1], reverse=True)

        # Normalize ratings to 0-1 scale for consistency with hybrid scores.
        if rated_items:
            max_rating = rated_items[0][1] if rated_items[0][1] > 0 else 1.0
            return [
                (mid, round(score / max_rating, 4), "popular")
                for mid, score in rated_items[:limit]
            ]
        return []

    @staticmethod
    def _format_results(
        merged: List[Tuple[str, float, str]],
    ) -> List[Dict[str, Any]]:
        """Convert internal tuples to API-friendly dicts."""
        return [
            {
                "media_id": media_id,
                "score": score,
                "reason": reason,
            }
            for media_id, score, reason in merged
        ]

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    @property
    def is_ready(self) -> bool:
        """At least one sub-model must be ready."""
        return self._cf.is_ready or self._cbf.is_ready

    def get_status(self) -> Dict[str, Any]:
        """Return diagnostic information about the recommender state."""
        return {
            "ready": self.is_ready,
            "collaborative": {
                "ready": self._cf.is_ready,
                "users": self._cf.user_count,
                "items": self._cf.item_count,
            },
            "content_based": {
                "ready": self._cbf.is_ready,
                "items": self._cbf.item_count,
                "features": self._cbf.feature_count,
            },
            "weights": {
                "collaborative": self.collaborative_weight,
                "content_based": self.content_weight,
            },
            "last_rebuild": self._last_rebuild,
            "rebuild_duration_seconds": self._rebuild_duration,
        }
