"""Collaborative filtering model using user-item interaction matrices.

Computes user-user similarity via cosine distance on a sparse interaction
matrix, then predicts ratings for items a user has not yet consumed.

The implementation is intentionally memory-efficient: all large matrices
are stored as ``scipy.sparse`` CSR matrices and similarity is computed
using sparse-aware operations.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy import sparse
from sklearn.metrics.pairwise import cosine_similarity

from src.database import Interaction

logger = logging.getLogger(__name__)

# Interaction types mapped to implicit rating signals.
# Explicit ratings (1-10 scale) take precedence when available.
INTERACTION_WEIGHTS: Dict[str, float] = {
    "watch": 1.0,
    "completed": 1.5,
    "like": 2.0,
    "dislike": -1.0,
    "add_to_watchlist": 0.5,
    "skip": -0.5,
    "rate": 0.0,  # explicit rating used directly, weight ignored
}

# Maximum number of similar users considered when predicting for a target user.
MAX_SIMILAR_USERS = 50

# Minimum number of interactions a user must have to be included in the
# similarity computation (avoids noise from single-interaction users).
MIN_USER_INTERACTIONS = 2


class CollaborativeFilter:
    """User-based collaborative filtering engine.

    Workflow::

        cf = CollaborativeFilter()
        cf.build_matrix(interactions)
        cf.compute_user_similarity()
        predictions = cf.predict_for_user(user_id, n=20)
    """

    def __init__(self) -> None:
        # Mappings between external string IDs and matrix indices.
        self._user_to_idx: Dict[str, int] = {}
        self._idx_to_user: Dict[int, str] = {}
        self._item_to_idx: Dict[str, int] = {}
        self._idx_to_item: Dict[int, str] = {}

        # Sparse user-item matrix (users=rows, items=columns).
        self._matrix: Optional[sparse.csr_matrix] = None

        # Dense user-user similarity (kept dense because we need fast row
        # slicing for prediction; matrix is n_users x n_users which is
        # manageable for typical catalogues < 100k users).
        self._similarity: Optional[np.ndarray] = None

        self._is_built = False

    # ------------------------------------------------------------------
    # Matrix construction
    # ------------------------------------------------------------------

    def build_matrix(self, interactions: List[Interaction]) -> None:
        """Build the user-item matrix from raw interaction records.

        Each cell value represents a relevance score derived from the
        interaction type and/or explicit rating.

        Args:
            interactions: Flat list of interaction records from the database.
        """
        if not interactions:
            logger.warning("No interactions provided; collaborative model will be empty")
            self._is_built = False
            return

        # Collect unique users and items, assign indices.
        users: Dict[str, int] = {}
        items: Dict[str, int] = {}

        for interaction in interactions:
            if interaction.user_id not in users:
                users[interaction.user_id] = len(users)
            if interaction.media_id not in items:
                items[interaction.media_id] = len(items)

        self._user_to_idx = users
        self._idx_to_user = {v: k for k, v in users.items()}
        self._item_to_idx = items
        self._idx_to_item = {v: k for k, v in items.items()}

        n_users = len(users)
        n_items = len(items)

        # Accumulate scores per (user, item) pair.  If the same pair appears
        # multiple times we keep the *maximum* score (e.g. a user who watched
        # and then liked an item should get the higher signal).
        score_map: Dict[Tuple[int, int], float] = {}

        for interaction in interactions:
            u = users[interaction.user_id]
            i = items[interaction.media_id]

            if interaction.interaction_type == "rate" and interaction.rating is not None:
                # Normalize explicit rating to 0-2 range (assuming 1-10 scale).
                score = (interaction.rating / 5.0)
            else:
                score = INTERACTION_WEIGHTS.get(interaction.interaction_type, 0.5)

            key = (u, i)
            if key not in score_map or score > score_map[key]:
                score_map[key] = score

        # Build COO sparse matrix, then convert to CSR.
        if not score_map:
            self._matrix = sparse.csr_matrix((n_users, n_items), dtype=np.float32)
        else:
            rows = np.array([k[0] for k in score_map], dtype=np.int32)
            cols = np.array([k[1] for k in score_map], dtype=np.int32)
            data = np.array([score_map[k] for k in score_map], dtype=np.float32)
            self._matrix = sparse.csr_matrix(
                (data, (rows, cols)),
                shape=(n_users, n_items),
                dtype=np.float32,
            )

        self._similarity = None  # invalidate any previous similarity
        self._is_built = True
        logger.info(
            "Collaborative matrix built: %d users x %d items, %d non-zero entries",
            n_users,
            n_items,
            self._matrix.nnz,
        )

    # ------------------------------------------------------------------
    # Similarity
    # ------------------------------------------------------------------

    def compute_user_similarity(self) -> None:
        """Compute pairwise cosine similarity between all users.

        Users with fewer than ``MIN_USER_INTERACTIONS`` interactions are
        zeroed out so they do not pollute recommendations for other users.
        """
        if self._matrix is None or not self._is_built:
            logger.warning("Cannot compute similarity: matrix not built")
            return

        n_users = self._matrix.shape[0]
        if n_users == 0:
            self._similarity = np.empty((0, 0), dtype=np.float32)
            return

        # Mask out low-interaction users by zeroing their rows before
        # computing similarity.  We work on a copy so the original matrix
        # remains intact for prediction.
        interaction_counts = np.diff(self._matrix.indptr)  # nnz per row
        mask = interaction_counts >= MIN_USER_INTERACTIONS

        if mask.sum() == 0:
            # Every user has too few interactions.
            self._similarity = np.zeros((n_users, n_users), dtype=np.float32)
            logger.warning("All users below MIN_USER_INTERACTIONS threshold")
            return

        # cosine_similarity from sklearn works on sparse input and returns
        # a dense matrix.
        self._similarity = cosine_similarity(self._matrix, dense_output=True).astype(np.float32)

        # Zero out self-similarity (diagonal) so a user is never their own
        # nearest neighbour.
        np.fill_diagonal(self._similarity, 0.0)

        # Zero rows/columns for users below the interaction threshold.
        low_idxs = np.where(~mask)[0]
        if low_idxs.size > 0:
            self._similarity[low_idxs, :] = 0.0
            self._similarity[:, low_idxs] = 0.0

        logger.info("User similarity matrix computed (%d x %d)", n_users, n_users)

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict_for_user(
        self,
        user_id: str,
        n: int = 20,
    ) -> List[Tuple[str, float]]:
        """Predict scores for items the user has not yet interacted with.

        Uses a weighted average of the ratings from the most similar users.

        Args:
            user_id: External user identifier.
            n: Maximum number of recommendations to return.

        Returns:
            List of ``(media_id, predicted_score)`` tuples sorted by score
            descending.  Returns an empty list for unknown users (cold start).
        """
        if (
            not self._is_built
            or self._matrix is None
            or self._similarity is None
        ):
            return []

        if user_id not in self._user_to_idx:
            # Cold start: user not in the interaction history.
            return []

        u_idx = self._user_to_idx[user_id]
        n_items = self._matrix.shape[1]

        # Get similarity scores for this user with all others.
        sim_scores = self._similarity[u_idx]

        # Select top-K similar users (nonzero similarity only).
        nonzero_mask = sim_scores > 0
        if not nonzero_mask.any():
            return []

        candidate_indices = np.where(nonzero_mask)[0]
        if candidate_indices.size > MAX_SIMILAR_USERS:
            top_k_local = np.argpartition(
                sim_scores[candidate_indices], -MAX_SIMILAR_USERS
            )[-MAX_SIMILAR_USERS:]
            candidate_indices = candidate_indices[top_k_local]

        sim_subset = sim_scores[candidate_indices]  # (K,)
        ratings_subset = self._matrix[candidate_indices].toarray()  # (K, n_items)

        # Weighted sum of neighbour ratings, normalized by total similarity.
        sim_col = sim_subset[:, np.newaxis]  # (K, 1)
        weighted = (sim_col * ratings_subset).sum(axis=0)  # (n_items,)
        sim_sum = np.abs(sim_col).sum(axis=0).flatten()  # scalar broadcast

        # Avoid division by zero.
        sim_total = sim_subset.sum()
        if sim_total == 0:
            return []

        predicted = weighted / sim_total  # (n_items,)

        # Zero out items the user has already interacted with.
        user_row = self._matrix[u_idx].toarray().flatten()
        already_seen = user_row != 0
        predicted[already_seen] = -np.inf

        # Select top-N.
        if n >= n_items:
            top_indices = np.argsort(predicted)[::-1]
        else:
            top_indices = np.argpartition(predicted, -n)[-n:]
            top_indices = top_indices[np.argsort(predicted[top_indices])[::-1]]

        results: List[Tuple[str, float]] = []
        for idx in top_indices:
            score = float(predicted[idx])
            if score <= 0 or np.isinf(score):
                break
            item_id = self._idx_to_item[int(idx)]
            results.append((item_id, round(score, 4)))

        return results

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    @property
    def is_ready(self) -> bool:
        """Whether the model has been built and similarity computed."""
        return self._is_built and self._similarity is not None

    @property
    def user_count(self) -> int:
        return len(self._user_to_idx)

    @property
    def item_count(self) -> int:
        return len(self._item_to_idx)
