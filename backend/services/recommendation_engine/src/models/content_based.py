"""Content-based filtering model using TF-IDF on media metadata.

Builds a feature matrix from genre and tag text, computes item-item cosine
similarity, and recommends new items similar to those the user has already
watched.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Set, Tuple

import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from src.database import MediaItem

logger = logging.getLogger(__name__)

# TF-IDF configuration.
TFIDF_MAX_FEATURES = 5000
TFIDF_NGRAM_RANGE = (1, 2)
TFIDF_MIN_DF = 1       # keep rare genres visible
TFIDF_MAX_DF = 0.95    # drop terms in > 95 % of documents


class ContentBasedFilter:
    """Item-item content similarity engine.

    Workflow::

        cbf = ContentBasedFilter()
        cbf.build_feature_matrix(media_items)
        cbf.compute_item_similarity()
        recs = cbf.recommend_for_user(user_id, watched_items, n=20)
    """

    def __init__(self) -> None:
        self._item_to_idx: Dict[str, int] = {}
        self._idx_to_item: Dict[int, str] = {}
        self._item_metadata: Dict[str, MediaItem] = {}

        self._tfidf_matrix: Optional[sparse.csr_matrix] = None
        self._similarity: Optional[np.ndarray] = None
        self._vectorizer: Optional[TfidfVectorizer] = None

        self._is_built = False

    # ------------------------------------------------------------------
    # Feature matrix
    # ------------------------------------------------------------------

    @staticmethod
    def _build_document(item: MediaItem) -> str:
        """Compose a textual document from an item's metadata.

        Combines genres, type, and community rating bucket into a single
        text string suitable for TF-IDF vectorization.

        Genre text is repeated to give it more weight relative to other
        fields.
        """
        parts: List[str] = []

        # Genres (primary signal) - repeated for extra TF-IDF weight.
        if item.genres:
            genres_clean = item.genres.replace(",", " ").replace(";", " ").strip()
            if genres_clean:
                parts.append(genres_clean)
                parts.append(genres_clean)  # double-weight

        # Media type (movie vs series vs episode).
        if item.media_type and item.media_type != "unknown":
            parts.append(item.media_type)

        # Community rating bucket (adds coarse quality signal).
        if item.community_rating is not None:
            if item.community_rating >= 8.0:
                parts.append("highly_rated")
            elif item.community_rating >= 6.0:
                parts.append("well_rated")
            elif item.community_rating >= 4.0:
                parts.append("average_rated")
            else:
                parts.append("low_rated")

        return " ".join(parts) if parts else "unknown"

    def build_feature_matrix(self, media_items: List[MediaItem]) -> None:
        """Construct the TF-IDF feature matrix from media metadata.

        Args:
            media_items: All media items from the catalogue.
        """
        if not media_items:
            logger.warning("No media items provided; content model will be empty")
            self._is_built = False
            return

        # Index mapping.
        self._item_to_idx = {}
        self._idx_to_item = {}
        self._item_metadata = {}
        documents: List[str] = []

        for idx, item in enumerate(media_items):
            self._item_to_idx[item.id] = idx
            self._idx_to_item[idx] = item.id
            self._item_metadata[item.id] = item
            documents.append(self._build_document(item))

        # TF-IDF vectorization.
        # When the corpus is very small, max_df as a fraction can resolve
        # to fewer documents than min_df, causing a ValueError.  Fall back
        # to permissive settings for tiny catalogues.
        n_docs = len(documents)
        effective_max_df: float | int = TFIDF_MAX_DF if n_docs >= 3 else 1.0
        effective_min_df: float | int = TFIDF_MIN_DF if n_docs >= 3 else 1

        self._vectorizer = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            ngram_range=TFIDF_NGRAM_RANGE,
            min_df=effective_min_df,
            max_df=effective_max_df,
            stop_words="english",
        )
        self._tfidf_matrix = self._vectorizer.fit_transform(documents)

        self._similarity = None  # invalidate old similarity
        self._is_built = True

        logger.info(
            "Content feature matrix built: %d items x %d features",
            self._tfidf_matrix.shape[0],
            self._tfidf_matrix.shape[1],
        )

    # ------------------------------------------------------------------
    # Similarity
    # ------------------------------------------------------------------

    def compute_item_similarity(self) -> None:
        """Compute pairwise cosine similarity between all items."""
        if self._tfidf_matrix is None or not self._is_built:
            logger.warning("Cannot compute similarity: feature matrix not built")
            return

        n_items = self._tfidf_matrix.shape[0]
        if n_items == 0:
            self._similarity = np.empty((0, 0), dtype=np.float32)
            return

        # For large catalogues (> 10 k items) the dense similarity matrix can
        # become expensive.  In that regime we should switch to approximate
        # nearest-neighbour search (e.g. FAISS).  For now we keep it simple.
        self._similarity = cosine_similarity(
            self._tfidf_matrix, dense_output=True
        ).astype(np.float32)

        # Zero self-similarity.
        np.fill_diagonal(self._similarity, 0.0)

        logger.info("Item similarity matrix computed (%d x %d)", n_items, n_items)

    # ------------------------------------------------------------------
    # Recommendations
    # ------------------------------------------------------------------

    def recommend_for_user(
        self,
        user_id: str,
        watched_item_ids: List[str],
        n: int = 20,
    ) -> List[Tuple[str, float]]:
        """Recommend items similar to those a user has already watched.

        For each watched item, accumulate the similarity to every unseen
        item, then rank by aggregated score.

        Args:
            user_id: Not used for scoring, but logged for tracing.
            watched_item_ids: Media IDs the user has watched.
            n: Number of recommendations to return.

        Returns:
            List of ``(media_id, score)`` tuples, highest first.
            Returns an empty list for cold-start users (no watch history).
        """
        if (
            not self._is_built
            or self._similarity is None
            or not watched_item_ids
        ):
            return []

        n_items = self._similarity.shape[0]

        # Resolve watched items to matrix indices (skip unknowns).
        watched_indices: List[int] = []
        for mid in watched_item_ids:
            if mid in self._item_to_idx:
                watched_indices.append(self._item_to_idx[mid])

        if not watched_indices:
            return []

        watched_set: Set[int] = set(watched_indices)

        # Aggregate similarity: for each candidate item, sum its similarity
        # to all watched items and divide by the number of watched items to
        # get a mean-similarity score.
        watched_arr = np.array(watched_indices, dtype=np.int32)
        sim_rows = self._similarity[watched_arr]  # (len(watched), n_items)
        aggregated = sim_rows.mean(axis=0)  # (n_items,)

        # Zero out already-watched items.
        for idx in watched_set:
            aggregated[idx] = -np.inf

        # Top-N selection.
        if n >= n_items:
            top_indices = np.argsort(aggregated)[::-1]
        else:
            top_indices = np.argpartition(aggregated, -n)[-n:]
            top_indices = top_indices[np.argsort(aggregated[top_indices])[::-1]]

        results: List[Tuple[str, float]] = []
        for idx in top_indices:
            score = float(aggregated[idx])
            if score <= 0 or np.isinf(score):
                break
            results.append((self._idx_to_item[int(idx)], round(score, 4)))

        return results

    def get_similar_items(
        self,
        media_id: str,
        n: int = 10,
    ) -> List[Tuple[str, float]]:
        """Return the *n* most similar items to the given media item.

        This is a direct similarity lookup with no user context.

        Args:
            media_id: The reference media item.
            n: Number of results.

        Returns:
            List of ``(media_id, similarity_score)`` tuples.
        """
        if (
            not self._is_built
            or self._similarity is None
            or media_id not in self._item_to_idx
        ):
            return []

        idx = self._item_to_idx[media_id]
        sim_row = self._similarity[idx]

        if n >= len(sim_row):
            top_indices = np.argsort(sim_row)[::-1]
        else:
            top_indices = np.argpartition(sim_row, -n)[-n:]
            top_indices = top_indices[np.argsort(sim_row[top_indices])[::-1]]

        results: List[Tuple[str, float]] = []
        for i in top_indices:
            score = float(sim_row[i])
            if score <= 0:
                break
            results.append((self._idx_to_item[int(i)], round(score, 4)))

        return results

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    @property
    def is_ready(self) -> bool:
        return self._is_built and self._similarity is not None

    @property
    def item_count(self) -> int:
        return len(self._item_to_idx)

    @property
    def feature_count(self) -> int:
        if self._tfidf_matrix is not None:
            return self._tfidf_matrix.shape[1]
        return 0
