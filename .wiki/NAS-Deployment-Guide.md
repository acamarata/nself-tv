# NAS Deployment Guide

Deploy nself-tv on your NAS device (Synology, QNAP, TrueNAS, etc.) for a self-hosted media server.

## Supported NAS Platforms

- **Synology DSM 7.x** - Recommended
- **QNAP QTS 5.x** - Supported
- **TrueNAS SCALE** - Supported
- **Unraid** - Supported
- **Generic Linux NAS** - Supported

## Prerequisites

### Software Requirements

- Docker and Docker Compose installed
- At least 2GB RAM available
- 10GB free disk space for application data
- Media files stored on NAS volume

### Hardware Recommendations

- **Minimum**: 2 CPU cores, 2GB RAM
- **Recommended**: 4 CPU cores, 4GB RAM
- **Optimal**: Intel CPU with QuickSync for hardware transcoding

## Quick Start

### 1. Clone Repository

```bash
cd /volume1/docker  # Synology example
git clone https://github.com/acamarata/nself-tv.git
cd nself-tv/backend
```

### 2. Configure Environment

```bash
# Copy NAS template
cp .env.nas .env.local

# Edit configuration
nano .env.local
```

**Critical settings to customize:**

```bash
# Your NAS media path
STORAGE_LOCAL_PATH=/volume1/media

# Scan paths (comma-separated)
SCANNER_PATHS=/volume1/media/Movies,/volume1/media/TV,/volume1/media/Music

# Backup path
BACKUP_PATH=/volume1/backups/nself-tv

# Domain (use .local for LAN-only access)
BASE_DOMAIN=ntv.local
```

### 3. Start Services

```bash
# Using nself CLI
nself start

# Or manually with Docker Compose
docker-compose up -d
```

### 4. Access Application

Open in browser: `http://ntv.local:8080` (or your NAS IP)

## Platform-Specific Setup

### Synology DSM

1. **Enable Docker** via Package Center
2. **Create shared folder**: `/volume1/media`
3. **Create backup folder**: `/volume1/backups/nself-tv`
4. **Adjust permissions**:
   ```bash
   sudo chown -R admin:users /volume1/media
   sudo chmod -R 755 /volume1/media
   ```

5. **Hardware transcoding** (if Intel CPU):
   ```bash
   # Verify QuickSync availability
   ls /dev/dri

   # Should see: renderD128
   ```

6. **Configure .env.local**:
   ```bash
   STORAGE_LOCAL_PATH=/volume1/media
   TRANSCODING_HARDWARE=true
   TRANSCODING_BACKEND=qsv
   ```

### QNAP QTS

1. **Enable Container Station**
2. **Create shared folder**: `/share/Multimedia`
3. **Create backup folder**: `/share/backups/nself-tv`
4. **Configure .env.local**:
   ```bash
   STORAGE_LOCAL_PATH=/share/Multimedia
   BACKUP_PATH=/share/backups/nself-tv
   ```

### TrueNAS SCALE

1. **Apps → Available Applications → Custom App**
2. **Create dataset**: `pool1/media`
3. **Mount dataset**: `/mnt/pool1/media`
4. **Configure .env.local**:
   ```bash
   STORAGE_LOCAL_PATH=/mnt/pool1/media
   BACKUP_PATH=/mnt/pool1/backups/nself-tv
   ```

### Unraid

1. **Enable Docker** from Settings
2. **Create user share**: `media`
3. **Path**: `/mnt/user/media`
4. **Configure .env.local**:
   ```bash
   STORAGE_LOCAL_PATH=/mnt/user/media
   BACKUP_PATH=/mnt/user/backups/nself-tv
   ```

## Performance Optimization

### Hardware Transcoding

Enable if your NAS has Intel QuickSync or NVIDIA GPU:

```bash
# Intel QuickSync
TRANSCODING_HARDWARE=true
TRANSCODING_BACKEND=qsv

# NVIDIA GPU
TRANSCODING_HARDWARE=true
TRANSCODING_BACKEND=nvenc
```

### Resource Limits

Adjust based on NAS capabilities:

```bash
# Low-end NAS (2 cores, 2GB RAM)
TRANSCODING_MAX_SESSIONS=1
POSTGRES_MAX_CONNECTIONS=10
REDIS_MAXMEMORY=64mb

# Mid-range NAS (4 cores, 4GB RAM)
TRANSCODING_MAX_SESSIONS=2
POSTGRES_MAX_CONNECTIONS=20
REDIS_MAXMEMORY=128mb

# High-end NAS (8+ cores, 8GB+ RAM)
TRANSCODING_MAX_SESSIONS=4
POSTGRES_MAX_CONNECTIONS=50
REDIS_MAXMEMORY=256mb
```

### Disable Unnecessary Services

```bash
# Minimal setup
MONITORING_ENABLED=false
FUNCTIONS_ENABLED=false
MLFLOW_ENABLED=false
MEILISEARCH_ENABLED=false
```

## Media Library Organization

Recommended directory structure:

```
/volume1/media/
├── Movies/
│   ├── Movie Title (2024)/
│   │   ├── Movie Title (2024).mp4
│   │   └── Movie Title (2024)-poster.jpg
│   └── Another Movie (2023)/
├── TV/
│   ├── Show Name/
│   │   ├── Season 01/
│   │   │   ├── S01E01.mkv
│   │   │   └── S01E02.mkv
│   │   └── Season 02/
│   └── Another Show/
└── Music/
    ├── Artist Name/
    │   ├── Album Name/
    │   │   ├── 01 Track.mp3
    │   │   └── 02 Track.mp3
    │   └── Another Album/
    └── Another Artist/
```

## Maintenance

### Database Backups

Automatic backups run daily at 2 AM:

```bash
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION=30
```

Manual backup:

```bash
nself backup create
```

### Update Application

```bash
cd ~/Sites/nself-tv/backend
git pull
nself restart
```

### View Logs

```bash
# All services
nself logs

# Specific service
nself logs postgres
nself logs hasura
```

### Health Check

```bash
nself health
```

## Troubleshooting

### Containers Won't Start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs
nself logs

# Restart services
nself restart
```

### Can't Access Web UI

1. Check if nginx is running: `docker ps | grep nginx`
2. Verify port 8080 not in use: `netstat -tuln | grep 8080`
3. Check firewall: Allow port 8080
4. Try NAS IP directly: `http://192.168.1.x:8080`

### Media Not Showing Up

1. **Verify paths in .env.local**:
   ```bash
   STORAGE_LOCAL_PATH=/volume1/media
   SCANNER_PATHS=/volume1/media/Movies,/volume1/media/TV
   ```

2. **Check permissions**:
   ```bash
   ls -la /volume1/media
   ```

3. **Manual scan**:
   ```bash
   nself db migrate  # Ensure database schema is current
   # Restart scanner service
   docker-compose restart scanner
   ```

### Transcoding Fails

1. **Verify hardware support**:
   ```bash
   # Intel QuickSync
   ls /dev/dri

   # NVIDIA
   nvidia-smi
   ```

2. **Check Docker device mapping** in docker-compose.yml:
   ```yaml
   services:
     transcoder:
       devices:
         - /dev/dri:/dev/dri  # Intel QuickSync
   ```

3. **Fallback to software transcoding**:
   ```bash
   TRANSCODING_HARDWARE=false
   ```

## Security Best Practices

1. **LAN-only access**:
   ```bash
   CORS_ORIGIN=http://ntv.local,http://192.168.1.*
   ```

2. **Strong secrets**:
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

3. **Regular updates**:
   ```bash
   # Weekly
   git pull
   nself restart
   ```

4. **Firewall**: Block external access to port 8080

## Advanced Configuration

### Reverse Proxy

Use Synology/QNAP built-in reverse proxy for HTTPS:

1. Synology: Control Panel → Application Portal → Reverse Proxy
2. QNAP: myQNAPcloud → Auto Router Configuration

Example Nginx config:

```nginx
server {
    listen 443 ssl;
    server_name ntv.mydomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Remote Access

Use VPN (WireGuard, OpenVPN) instead of port forwarding for security.

### Multiple Libraries

```bash
SCANNER_PATHS=/volume1/media/Movies,/volume1/media/TV,/volume2/media/Music
```

## Support

- GitHub Issues: https://github.com/acamarata/nself-tv/issues
- Discord: https://discord.gg/nself
- Wiki: https://github.com/acamarata/nself-tv/wiki
