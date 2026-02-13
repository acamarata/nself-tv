#!/bin/bash
# =============================================================================
# MinIO Bucket Initialization for nself-tv
# =============================================================================
# Creates required storage buckets and configures access policies.
# Run after MinIO is healthy: ./scripts/init-minio.sh
# =============================================================================

set -euo pipefail

MINIO_HOST="${MINIO_HOST:-minio}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
MINIO_ENDPOINT="http://${MINIO_HOST}:${MINIO_PORT}"

echo "Waiting for MinIO at ${MINIO_ENDPOINT}..."
until curl -sf "${MINIO_ENDPOINT}/minio/health/ready" > /dev/null 2>&1; do
  sleep 2
done
echo "MinIO is ready."

# Configure mc alias
mc alias set local "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" --api s3v4

# Create buckets
BUCKETS=(
  "media-raw"
  "media-encoded"
  "media-thumbnails"
  "media-subtitles"
  "backups"
)

for bucket in "${BUCKETS[@]}"; do
  mc mb "local/${bucket}" --ignore-existing
  echo "Bucket created: ${bucket}"
done

# Set lifecycle policy on media-raw (expire uploads after 30 days)
cat > /tmp/lifecycle-raw.json <<'LIFECYCLE'
{
  "Rules": [
    {
      "ID": "expire-raw-uploads",
      "Status": "Enabled",
      "Expiration": { "Days": 30 },
      "Filter": { "Prefix": "" }
    }
  ]
}
LIFECYCLE
mc ilm import "local/media-raw" < /tmp/lifecycle-raw.json
rm -f /tmp/lifecycle-raw.json
echo "Lifecycle policy set on media-raw (30-day expiry)"

# Set public read access on encoded media (for HLS streaming)
mc anonymous set download "local/media-encoded"
mc anonymous set download "local/media-thumbnails"
mc anonymous set download "local/media-subtitles"
echo "Public read access set on encoded, thumbnails, subtitles buckets"

# Verify buckets
echo ""
echo "=== MinIO Buckets ==="
mc ls local/
echo ""
echo "MinIO initialization complete."
