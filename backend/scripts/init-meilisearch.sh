#!/bin/bash
# =============================================================================
# MeiliSearch Index Initialization for nself-tv
# =============================================================================
# Creates search indexes with proper configuration for media catalog.
# Run after MeiliSearch is healthy: ./scripts/init-meilisearch.sh
# =============================================================================

set -euo pipefail

MEILI_HOST="${MEILISEARCH_HOST:-meilisearch}"
MEILI_PORT="${MEILISEARCH_PORT:-7700}"
MEILI_KEY="${MEILISEARCH_MASTER_KEY:-dev_meilisearch_key_change_in_prod}"
MEILI_URL="http://${MEILI_HOST}:${MEILI_PORT}"

echo "Waiting for MeiliSearch at ${MEILI_URL}..."
until curl -sf "${MEILI_URL}/health" > /dev/null 2>&1; do
  sleep 2
done
echo "MeiliSearch is ready."

AUTH_HEADER="Authorization: Bearer ${MEILI_KEY}"

# Create media index
echo "Creating media index..."
curl -sf -X POST "${MEILI_URL}/indexes" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '{ "uid": "media", "primaryKey": "id" }' || true

# Wait for index creation task to complete
sleep 2

# Configure searchable attributes (ordered by relevance)
echo "Setting searchable attributes..."
curl -sf -X PUT "${MEILI_URL}/indexes/media/settings/searchable-attributes" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '["title", "original_title", "overview", "tagline", "genres", "tags"]'

# Configure filterable attributes (for faceted search)
echo "Setting filterable attributes..."
curl -sf -X PUT "${MEILI_URL}/indexes/media/settings/filterable-attributes" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '["type", "genres", "tags", "year", "content_rating", "status", "family_id"]'

# Configure sortable attributes
echo "Setting sortable attributes..."
curl -sf -X PUT "${MEILI_URL}/indexes/media/settings/sortable-attributes" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '["title", "year", "community_rating", "added_at", "view_count"]'

# Configure displayed attributes
echo "Setting displayed attributes..."
curl -sf -X PUT "${MEILI_URL}/indexes/media/settings/displayed-attributes" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '["id", "title", "original_title", "type", "overview", "tagline", "year", "genres", "tags", "content_rating", "community_rating", "poster_url", "backdrop_url", "runtime_minutes", "status", "added_at"]'

# Configure ranking rules
echo "Setting ranking rules..."
curl -sf -X PUT "${MEILI_URL}/indexes/media/settings/ranking-rules" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '["words", "typo", "proximity", "attribute", "sort", "exactness", "community_rating:desc", "view_count:desc"]'

# Configure synonyms
echo "Setting synonyms..."
curl -sf -X PUT "${MEILI_URL}/indexes/media/settings/synonyms" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '{
    "tv": ["television", "show", "series"],
    "movie": ["film", "cinema", "motion picture"],
    "episode": ["ep", "installment"],
    "season": ["series", "volume"],
    "documentary": ["docu", "doc"],
    "anime": ["animation", "animated"],
    "sci-fi": ["science fiction", "scifi"],
    "rom-com": ["romantic comedy"]
  }'

# Configure stop words
echo "Setting stop words..."
curl -sf -X PUT "${MEILI_URL}/indexes/media/settings/stop-words" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]'

# Configure typo tolerance
echo "Setting typo tolerance..."
curl -sf -X PUT "${MEILI_URL}/indexes/media/settings/typo-tolerance" \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  --data '{
    "enabled": true,
    "minWordSizeForTypos": { "oneTypo": 4, "twoTypos": 8 },
    "disableOnAttributes": ["year", "content_rating"]
  }'

echo ""
echo "=== MeiliSearch Indexes ==="
curl -sf "${MEILI_URL}/indexes" -H "${AUTH_HEADER}" | python3 -m json.tool 2>/dev/null || \
  curl -sf "${MEILI_URL}/indexes" -H "${AUTH_HEADER}"
echo ""
echo "MeiliSearch initialization complete."
