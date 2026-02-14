"""Tests for the collaborative filtering model.

All tests use synthetic interaction data and do not require a live database
or Redis connection.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from src.database import Interaction
from src.models.collaborative import (
    CollaborativeFilter,
    INTERACTION_WEIGHTS,
    MAX_SIMILAR_USERS,
    MIN_USER_INTERACTIONS,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_interactions() -> list[Interaction]:
    """Create a small but realistic set of interactions for testing.

    User matrix (conceptual):

        +---------+------+------+------+------+------+
        |         | m1   | m2   | m3   | m4   | m5   |
        +---------+------+------+------+------+------+
        | alice   | watch| like | -    | watch| -    |
        | bob     | watch| like | watch| -    | -    |
        | carol   | -    | -    | watch| watch| like |
        | dave    | like | like | -    | -    | watch|
        +---------+------+------+------+------+------+

    alice and bob overlap on m1,m2 (both watch+like), so they should be
    similar.  carol is distinct (m3,m4,m5), so she should be dissimilar
    from alice and bob.
    """
    return [
        # alice
        Interaction("alice", "m1", "watch", None),
        Interaction("alice", "m2", "like", None),
        Interaction("alice", "m4", "watch", None),
        # bob
        Interaction("bob", "m1", "watch", None),
        Interaction("bob", "m2", "like", None),
        Interaction("bob", "m3", "watch", None),
        # carol
        Interaction("carol", "m3", "watch", None),
        Interaction("carol", "m4", "watch", None),
        Interaction("carol", "m5", "like", None),
        # dave
        Interaction("dave", "m1", "like", None),
        Interaction("dave", "m2", "like", None),
        Interaction("dave", "m5", "watch", None),
    ]


@pytest.fixture
def interactions() -> list[Interaction]:
    return _make_interactions()


@pytest.fixture
def built_model(interactions: list[Interaction]) -> CollaborativeFilter:
    """Return a model with built matrix and computed similarity."""
    cf = CollaborativeFilter()
    cf.build_matrix(interactions)
    cf.compute_user_similarity()
    return cf


# ---------------------------------------------------------------------------
# build_matrix tests
# ---------------------------------------------------------------------------


class TestBuildMatrix:
    def test_matrix_shape(self, interactions: list[Interaction]) -> None:
        cf = CollaborativeFilter()
        cf.build_matrix(interactions)

        # 4 users, 5 items
        assert cf._matrix is not None
        assert cf._matrix.shape == (4, 5)
        assert cf.user_count == 4
        assert cf.item_count == 5

    def test_matrix_nonzero_count(self, interactions: list[Interaction]) -> None:
        cf = CollaborativeFilter()
        cf.build_matrix(interactions)

        # Each interaction produces one cell (12 interactions, 12 cells).
        assert cf._matrix.nnz == 12

    def test_matrix_values_use_interaction_weights(self) -> None:
        cf = CollaborativeFilter()
        cf.build_matrix([
            Interaction("u1", "i1", "watch", None),
            Interaction("u1", "i2", "like", None),
            Interaction("u1", "i3", "dislike", None),
        ])

        row = cf._matrix.toarray()[0]
        assert row[cf._item_to_idx["i1"]] == pytest.approx(INTERACTION_WEIGHTS["watch"])
        assert row[cf._item_to_idx["i2"]] == pytest.approx(INTERACTION_WEIGHTS["like"])
        assert row[cf._item_to_idx["i3"]] == pytest.approx(INTERACTION_WEIGHTS["dislike"])

    def test_explicit_rating_normalized(self) -> None:
        """Explicit ratings (1-10) should be normalized to 0-2 range."""
        cf = CollaborativeFilter()
        cf.build_matrix([
            Interaction("u1", "i1", "rate", 10.0),
            Interaction("u1", "i2", "rate", 5.0),
            Interaction("u1", "i3", "rate", 1.0),
        ])

        row = cf._matrix.toarray()[0]
        assert row[cf._item_to_idx["i1"]] == pytest.approx(10.0 / 5.0)
        assert row[cf._item_to_idx["i2"]] == pytest.approx(5.0 / 5.0)
        assert row[cf._item_to_idx["i3"]] == pytest.approx(1.0 / 5.0)

    def test_duplicate_interactions_keep_max(self) -> None:
        """Multiple interactions for the same (user, item) keep the highest."""
        cf = CollaborativeFilter()
        cf.build_matrix([
            Interaction("u1", "i1", "watch", None),   # 1.0
            Interaction("u1", "i1", "like", None),     # 2.0 — higher
        ])

        row = cf._matrix.toarray()[0]
        assert row[0] == pytest.approx(INTERACTION_WEIGHTS["like"])

    def test_empty_interactions(self) -> None:
        cf = CollaborativeFilter()
        cf.build_matrix([])

        assert not cf.is_ready
        assert cf.user_count == 0
        assert cf.item_count == 0

    def test_is_built_flag(self, interactions: list[Interaction]) -> None:
        cf = CollaborativeFilter()
        assert not cf._is_built
        cf.build_matrix(interactions)
        assert cf._is_built

    def test_index_mappings_roundtrip(self, interactions: list[Interaction]) -> None:
        cf = CollaborativeFilter()
        cf.build_matrix(interactions)

        for uid, idx in cf._user_to_idx.items():
            assert cf._idx_to_user[idx] == uid

        for mid, idx in cf._item_to_idx.items():
            assert cf._idx_to_item[idx] == mid


# ---------------------------------------------------------------------------
# compute_user_similarity tests
# ---------------------------------------------------------------------------


class TestUserSimilarity:
    def test_similarity_shape(self, built_model: CollaborativeFilter) -> None:
        assert built_model._similarity is not None
        n = built_model.user_count
        assert built_model._similarity.shape == (n, n)

    def test_diagonal_is_zero(self, built_model: CollaborativeFilter) -> None:
        """Self-similarity must be zeroed out."""
        diag = np.diag(built_model._similarity)
        assert np.allclose(diag, 0.0)

    def test_similarity_symmetric(self, built_model: CollaborativeFilter) -> None:
        sim = built_model._similarity
        assert np.allclose(sim, sim.T, atol=1e-5)

    def test_similar_users_have_high_score(
        self, built_model: CollaborativeFilter
    ) -> None:
        """alice and bob share m1(watch), m2(like) and should be highly similar."""
        alice_idx = built_model._user_to_idx["alice"]
        bob_idx = built_model._user_to_idx["bob"]
        carol_idx = built_model._user_to_idx["carol"]

        sim_ab = built_model._similarity[alice_idx, bob_idx]
        sim_ac = built_model._similarity[alice_idx, carol_idx]

        assert sim_ab > sim_ac, (
            f"alice-bob similarity ({sim_ab:.4f}) should exceed "
            f"alice-carol similarity ({sim_ac:.4f})"
        )

    def test_values_in_valid_range(self, built_model: CollaborativeFilter) -> None:
        """Cosine similarity should be in [-1, 1]."""
        assert built_model._similarity.max() <= 1.0 + 1e-5
        assert built_model._similarity.min() >= -1.0 - 1e-5

    def test_low_interaction_users_zeroed(self) -> None:
        """Users below MIN_USER_INTERACTIONS should have zero similarity."""
        cf = CollaborativeFilter()
        cf.build_matrix([
            # u1 has only 1 interaction (below threshold if MIN >= 2)
            Interaction("u1", "i1", "watch", None),
            # u2 has enough
            Interaction("u2", "i1", "watch", None),
            Interaction("u2", "i2", "watch", None),
            # u3 has enough
            Interaction("u3", "i1", "watch", None),
            Interaction("u3", "i2", "watch", None),
        ])
        cf.compute_user_similarity()

        u1_idx = cf._user_to_idx["u1"]
        # u1's row and column should be all zeros.
        assert np.allclose(cf._similarity[u1_idx, :], 0.0)
        assert np.allclose(cf._similarity[:, u1_idx], 0.0)

    def test_no_similarity_without_build(self) -> None:
        cf = CollaborativeFilter()
        cf.compute_user_similarity()
        assert cf._similarity is None


# ---------------------------------------------------------------------------
# predict_for_user tests
# ---------------------------------------------------------------------------


class TestPrediction:
    def test_predictions_exclude_watched_items(
        self, built_model: CollaborativeFilter
    ) -> None:
        """Predictions should not include items the user already interacted with."""
        preds = built_model.predict_for_user("alice", n=20)
        pred_ids = {mid for mid, _ in preds}

        # alice interacted with m1, m2, m4 — none should appear.
        assert "m1" not in pred_ids
        assert "m2" not in pred_ids
        assert "m4" not in pred_ids

    def test_predictions_return_valid_scores(
        self, built_model: CollaborativeFilter
    ) -> None:
        preds = built_model.predict_for_user("alice", n=20)
        for media_id, score in preds:
            assert isinstance(media_id, str)
            assert isinstance(score, float)
            assert not math.isinf(score)
            assert score > 0

    def test_predictions_sorted_descending(
        self, built_model: CollaborativeFilter
    ) -> None:
        preds = built_model.predict_for_user("alice", n=20)
        if len(preds) > 1:
            scores = [s for _, s in preds]
            assert scores == sorted(scores, reverse=True)

    def test_predictions_respect_limit(
        self, built_model: CollaborativeFilter
    ) -> None:
        preds = built_model.predict_for_user("alice", n=1)
        assert len(preds) <= 1

    def test_unknown_user_returns_empty(
        self, built_model: CollaborativeFilter
    ) -> None:
        """Cold start: unknown user should get empty predictions."""
        preds = built_model.predict_for_user("unknown_user_xyz", n=20)
        assert preds == []

    def test_predictions_not_ready_returns_empty(self) -> None:
        cf = CollaborativeFilter()
        assert cf.predict_for_user("alice") == []

    def test_alice_gets_m3_or_m5(
        self, built_model: CollaborativeFilter
    ) -> None:
        """alice hasn't watched m3 or m5; they should be recommended."""
        preds = built_model.predict_for_user("alice", n=10)
        pred_ids = {mid for mid, _ in preds}
        # At least one of m3, m5 should appear (neighbours watched them).
        assert pred_ids & {"m3", "m5"}, f"Expected m3 or m5 in {pred_ids}"

    def test_single_user_single_item(self) -> None:
        """Edge case: only one user and one item should produce no recs."""
        cf = CollaborativeFilter()
        cf.build_matrix([
            Interaction("u1", "i1", "watch", None),
            Interaction("u1", "i2", "watch", None),
        ])
        cf.compute_user_similarity()
        preds = cf.predict_for_user("u1", n=5)
        # No other users to base predictions on.
        assert preds == []


# ---------------------------------------------------------------------------
# Introspection
# ---------------------------------------------------------------------------


class TestIntrospection:
    def test_is_ready(self, built_model: CollaborativeFilter) -> None:
        assert built_model.is_ready

    def test_not_ready_before_build(self) -> None:
        cf = CollaborativeFilter()
        assert not cf.is_ready

    def test_not_ready_without_similarity(
        self, interactions: list[Interaction]
    ) -> None:
        cf = CollaborativeFilter()
        cf.build_matrix(interactions)
        assert not cf.is_ready  # similarity not computed yet
