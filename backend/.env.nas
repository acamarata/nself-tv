# NAS Deployment Configuration Template
# Optimized for NAS/low-resource environments (Synology, QNAP, TrueNAS, etc.)
#
# Copy this to .env.local and customize for your NAS setup:
#   cp .env.nas .env.local

# =============================================================================
# DEPLOYMENT MODE
# =============================================================================

# NTV_MODE: Controls deployment topology and service configuration
# For NAS deployments, use 'nas' mode which optimizes for:
# - Local filesystem storage (no MinIO)
# - Hardware transcoding support (if available)
# - Lower resource consumption
# - Filesystem-based media library
NTV_MODE=nas

# =============================================================================
# STORAGE CONFIGURATION
# =============================================================================

# Storage backend: Use 'local' for NAS (direct filesystem access)
STORAGE_BACKEND=local

# Local storage path: Point to your NAS media directory
# Examples:
#   - Synology: /volume1/media or /volume2/media
#   - QNAP: /share/Multimedia or /share/media
#   - TrueNAS: /mnt/pool1/media
#   - Generic Linux: /mnt/nas/media
STORAGE_LOCAL_PATH=/volume1/media

# Disable MinIO (not needed for NAS mode)
MINIO_ENABLED=false

# =============================================================================
# MEDIA SCANNER CONFIGURATION
# =============================================================================

# Media scanner workers (lower for NAS to reduce load)
SCANNER_WORKERS=2

# Scan interval in hours (how often to rescan for new media)
SCANNER_INTERVAL=6

# Watched directories (comma-separated)
# Point to your NAS media folders
SCANNER_PATHS=/volume1/media/Movies,/volume1/media/TV,/volume1/media/Music

# =============================================================================
# TRANSCODING CONFIGURATION
# =============================================================================

# Hardware transcoding (if your NAS supports it)
# Synology: Intel QuickSync (QSV)
# QNAP: Intel QuickSync or NVIDIA GPU
# TrueNAS: Depends on hardware
TRANSCODING_HARDWARE=true
TRANSCODING_BACKEND=qsv

# Transcode quality preset
# Options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
# For NAS, use 'fast' or 'faster' to reduce CPU load
TRANSCODING_PRESET=fast

# Maximum concurrent transcoding sessions
# Lower this if your NAS struggles with multiple streams
TRANSCODING_MAX_SESSIONS=2

# =============================================================================
# RESOURCE LIMITS
# =============================================================================

# Lower resource limits for NAS environments

# PostgreSQL
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_SHARED_BUFFERS=128MB
POSTGRES_WORK_MEM=4MB

# Redis cache size (if enabled)
REDIS_MAXMEMORY=128mb
REDIS_ENABLED=true

# =============================================================================
# MONITORING
# =============================================================================

# Disable heavy monitoring stack on NAS to save resources
MONITORING_ENABLED=false

# If you do enable monitoring, use these minimal settings:
# MONITORING_ENABLED=true
# PROMETHEUS_RETENTION=7d
# LOKI_RETENTION=7d

# =============================================================================
# OPTIONAL SERVICES
# =============================================================================

# Disable services not needed for NAS mode
FUNCTIONS_ENABLED=false
MLFLOW_ENABLED=false
NSELF_ADMIN_ENABLED=true
MEILISEARCH_ENABLED=false

# Email (use for notifications)
MAILPIT_ENABLED=true

# =============================================================================
# NETWORK CONFIGURATION
# =============================================================================

# Domain for local access
# For NAS, typically use .local or your LAN domain
BASE_DOMAIN=ntv.local

# Ports (adjust if conflicts with NAS services)
NGINX_PORT=8080
POSTGRES_PORT=5432
REDIS_PORT=6379

# =============================================================================
# BACKUP CONFIGURATION
# =============================================================================

# Database backup path (save to NAS storage)
BACKUP_PATH=/volume1/backups/nself-tv

# Backup retention (days)
BACKUP_RETENTION=30

# Automatic backup schedule (cron format)
# Daily at 2 AM
BACKUP_SCHEDULE=0 2 * * *

# =============================================================================
# PERFORMANCE TUNING
# =============================================================================

# Enable filesystem-based optimizations
# Uses inotify to watch for new media files
FILESYSTEM_WATCH=true

# Cache duration for media metadata (seconds)
METADATA_CACHE_TTL=3600

# Thumbnail generation
# Use lower quality on NAS to save space and CPU
THUMBNAIL_QUALITY=70
THUMBNAIL_MAX_WIDTH=400

# =============================================================================
# SECURITY
# =============================================================================

# Restrict access to LAN only (recommended for NAS)
CORS_ORIGIN=http://ntv.local,http://*.local

# Session timeout (shorter for local network)
SESSION_TIMEOUT=86400

# =============================================================================
# DEBUGGING
# =============================================================================

# Log level: debug, info, warn, error
LOG_LEVEL=info

# Enable debug mode for troubleshooting
# Set to 'true' when setting up, then 'false' for production use
DEBUG=false
