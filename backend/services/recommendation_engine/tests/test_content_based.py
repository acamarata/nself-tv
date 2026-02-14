"""Tests for the content-based filtering model.

All tests use synthetic media metadata and do not require a live database
or Redis connection.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from src.database import MediaItem
from src.models.content_based import ContentBasedFilter


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_media_items() -> list[MediaItem]:
    """Create a diverse set of media items for testing.

    Groups:
        - Action group: m1, m2, m3  (action, adventure, sci-fi)
        - Drama group:  m4, m5      (drama, romance)
        - Comedy:       m6          (comedy)
        - Mixed:        m7          (action, drama — bridges groups)
    """
    return [
        MediaItem(id="m1", title="Action Movie 1", genres="action,adventure", community_rating=8.5, media_type="movie"),
        MediaItem(id="m2", title="Action Movie 2", genres="action,sci-fi", community_rating=7.2, media_type="movie"),
        MediaItem(id="m3", title="Action Series", genres="action,adventure,sci-fi", community_rating=9.0, media_type="series"),
        MediaItem(id="m4", title="Drama Film", genres="drama,romance", community_rating=6.5, media_type="movie"),
        MediaItem(id="m5", title="Romance Drama", genres="drama,romance,history", community_rating=7.8, media_type="movie"),
        MediaItem(id="m6", title="Comedy Show", genres="comedy", community_rating=5.5, media_type="series"),
        MediaItem(id="m7", title="Action Drama", genres="action,drama", community_rating=8.0, media_type="movie"),
    ]


@pytest.fixture
def media_items() -> list[MediaItem]:
    return _make_media_items()


@pytest.fixture
def built_model(media_items: list[MediaItem]) -> ContentBasedFilter:
    """Return a model with built feature matrix and computed similarity."""
    cbf = ContentBasedFilter()
    cbf.build_feature_matrix(media_items)
    cbf.compute_item_similarity()
    return cbf


# ---------------------------------------------------------------------------
# build_feature_matrix tests
# ---------------------------------------------------------------------------


class TestFeatureMatrix:
    def test_matrix_shape(self, media_items: list[MediaItem]) -> None:
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix(media_items)

        assert cbf._tfidf_matrix is not None
        assert cbf._tfidf_matrix.shape[0] == 7  # 7 items
        assert cbf._tfidf_matrix.shape[1] > 0   # at least 1 feature

    def test_item_count(self, media_items: list[MediaItem]) -> None:
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix(media_items)
        assert cbf.item_count == 7

    def test_feature_count_positive(self, media_items: list[MediaItem]) -> None:
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix(media_items)
        assert cbf.feature_count > 0

    def test_index_mappings(self, media_items: list[MediaItem]) -> None:
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix(media_items)

        for mid, idx in cbf._item_to_idx.items():
            assert cbf._idx_to_item[idx] == mid

        expected_ids = {m.id for m in media_items}
        assert set(cbf._item_to_idx.keys()) == expected_ids

    def test_empty_items(self) -> None:
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix([])
        assert not cbf.is_ready
        assert cbf.item_count == 0

    def test_single_item(self) -> None:
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix([
            MediaItem(id="m1", title="Solo", genres="action", community_rating=7.0, media_type="movie"),
        ])
        assert cbf._tfidf_matrix is not None
        assert cbf._tfidf_matrix.shape[0] == 1

    def test_metadata_stored(self, media_items: list[MediaItem]) -> None:
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix(media_items)
        assert "m1" in cbf._item_metadata
        assert cbf._item_metadata["m1"].title == "Action Movie 1"

    def test_item_with_no_genres(self) -> None:
        """Items with empty genres should still be indexed."""
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix([
            MediaItem(id="m1", title="No Genre", genres="", community_rating=None, media_type="unknown"),
            MediaItem(id="m2", title="Has Genre", genres="action", community_rating=8.0, media_type="movie"),
        ])
        assert cbf.item_count == 2

    def test_tfidf_nonzero(self, media_items: list[MediaItem]) -> None:
        """The TF-IDF matrix should have non-zero entries."""
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix(media_items)
        assert cbf._tfidf_matrix.nnz > 0


# ---------------------------------------------------------------------------
# compute_item_similarity tests
# ---------------------------------------------------------------------------


class TestItemSimilarity:
    def test_similarity_shape(self, built_model: ContentBasedFilter) -> None:
        assert built_model._similarity is not None
        n = built_model.item_count
        assert built_model._similarity.shape == (n, n)

    def test_diagonal_is_zero(self, built_model: ContentBasedFilter) -> None:
        diag = np.diag(built_model._similarity)
        assert np.allclose(diag, 0.0)

    def test_similarity_symmetric(self, built_model: ContentBasedFilter) -> None:
        sim = built_model._similarity
        assert np.allclose(sim, sim.T, atol=1e-5)

    def test_same_genre_items_more_similar(
        self, built_model: ContentBasedFilter
    ) -> None:
        """m1 (action,adventure) should be more similar to m2 (action,sci-fi)
        than to m4 (drama,romance)."""
        m1 = built_model._item_to_idx["m1"]
        m2 = built_model._item_to_idx["m2"]
        m4 = built_model._item_to_idx["m4"]

        sim_12 = built_model._similarity[m1, m2]
        sim_14 = built_model._similarity[m1, m4]

        assert sim_12 > sim_14, (
            f"m1-m2 similarity ({sim_12:.4f}) should exceed "
            f"m1-m4 similarity ({sim_14:.4f})"
        )

    def test_drama_items_cluster(self, built_model: ContentBasedFilter) -> None:
        """m4 (drama,romance) should be very similar to m5 (drama,romance,history)."""
        m4 = built_model._item_to_idx["m4"]
        m5 = built_model._item_to_idx["m5"]
        m1 = built_model._item_to_idx["m1"]

        sim_45 = built_model._similarity[m4, m5]
        sim_41 = built_model._similarity[m4, m1]

        assert sim_45 > sim_41

    def test_values_in_range(self, built_model: ContentBasedFilter) -> None:
        assert built_model._similarity.max() <= 1.0 + 1e-5
        assert built_model._similarity.min() >= -1e-5  # cosine sim of TF-IDF is non-negative

    def test_no_similarity_without_build(self) -> None:
        cbf = ContentBasedFilter()
        cbf.compute_item_similarity()
        assert cbf._similarity is None


# ---------------------------------------------------------------------------
# recommend_for_user tests
# ---------------------------------------------------------------------------


class TestRecommendForUser:
    def test_recommendations_exclude_watched(
        self, built_model: ContentBasedFilter
    ) -> None:
        """Recommended items should not include items already watched."""
        watched = ["m1", "m2"]
        recs = built_model.recommend_for_user("user1", watched, n=20)
        rec_ids = {mid for mid, _ in recs}

        assert "m1" not in rec_ids
        assert "m2" not in rec_ids

    def test_recommendations_sorted_descending(
        self, built_model: ContentBasedFilter
    ) -> None:
        recs = built_model.recommend_for_user("user1", ["m1"], n=20)
        if len(recs) > 1:
            scores = [s for _, s in recs]
            assert scores == sorted(scores, reverse=True)

    def test_recommendations_respect_limit(
        self, built_model: ContentBasedFilter
    ) -> None:
        recs = built_model.recommend_for_user("user1", ["m1", "m2"], n=2)
        assert len(recs) <= 2

    def test_action_watcher_gets_action_recs(
        self, built_model: ContentBasedFilter
    ) -> None:
        """User who watched action movies should get action recommendations."""
        watched = ["m1", "m2"]  # action movies
        recs = built_model.recommend_for_user("user1", watched, n=5)
        rec_ids = [mid for mid, _ in recs]

        # m3 (action,adventure,sci-fi) or m7 (action,drama) should rank high.
        assert "m3" in rec_ids or "m7" in rec_ids, (
            f"Expected m3 or m7 in top recs, got {rec_ids}"
        )

    def test_empty_watched_returns_empty(
        self, built_model: ContentBasedFilter
    ) -> None:
        recs = built_model.recommend_for_user("user1", [], n=10)
        assert recs == []

    def test_unknown_watched_items_ignored(
        self, built_model: ContentBasedFilter
    ) -> None:
        """Unknown item IDs in the watched list should be gracefully skipped."""
        recs = built_model.recommend_for_user(
            "user1", ["nonexistent_item_xyz"], n=10
        )
        assert recs == []

    def test_mixed_known_unknown(
        self, built_model: ContentBasedFilter
    ) -> None:
        """Mix of known and unknown watched items should still work."""
        recs = built_model.recommend_for_user(
            "user1", ["m1", "nonexistent"], n=5
        )
        # Should still get recs based on m1.
        assert len(recs) > 0

    def test_scores_are_positive(
        self, built_model: ContentBasedFilter
    ) -> None:
        recs = built_model.recommend_for_user("user1", ["m1"], n=20)
        for _, score in recs:
            assert score > 0
            assert not math.isinf(score)


# ---------------------------------------------------------------------------
# get_similar_items tests
# ---------------------------------------------------------------------------


class TestGetSimilarItems:
    def test_similar_items_for_action_movie(
        self, built_model: ContentBasedFilter
    ) -> None:
        similar = built_model.get_similar_items("m1", n=3)
        sim_ids = [mid for mid, _ in similar]

        # m2 (action,sci-fi) or m3 (action,adventure,sci-fi) should be top.
        assert "m2" in sim_ids or "m3" in sim_ids

    def test_does_not_include_self(
        self, built_model: ContentBasedFilter
    ) -> None:
        """The reference item should not appear in its own similar items."""
        similar = built_model.get_similar_items("m1", n=10)
        sim_ids = {mid for mid, _ in similar}
        assert "m1" not in sim_ids

    def test_sorted_descending(
        self, built_model: ContentBasedFilter
    ) -> None:
        similar = built_model.get_similar_items("m1", n=10)
        if len(similar) > 1:
            scores = [s for _, s in similar]
            assert scores == sorted(scores, reverse=True)

    def test_respects_limit(
        self, built_model: ContentBasedFilter
    ) -> None:
        similar = built_model.get_similar_items("m1", n=2)
        assert len(similar) <= 2

    def test_unknown_item_returns_empty(
        self, built_model: ContentBasedFilter
    ) -> None:
        similar = built_model.get_similar_items("nonexistent", n=5)
        assert similar == []

    def test_not_ready_returns_empty(self) -> None:
        cbf = ContentBasedFilter()
        assert cbf.get_similar_items("m1") == []


# ---------------------------------------------------------------------------
# Introspection
# ---------------------------------------------------------------------------


class TestIntrospection:
    def test_is_ready(self, built_model: ContentBasedFilter) -> None:
        assert built_model.is_ready

    def test_not_ready_before_build(self) -> None:
        cbf = ContentBasedFilter()
        assert not cbf.is_ready

    def test_not_ready_without_similarity(
        self, media_items: list[MediaItem]
    ) -> None:
        cbf = ContentBasedFilter()
        cbf.build_feature_matrix(media_items)
        assert not cbf.is_ready  # similarity not computed yet
