#!/usr/bin/env bash
set -e

# ============================================================================
# nself-tv Plugin Startup Script
# Starts all 18 production-ready plugins as external Node.js processes
# (discovery, media-scanner, recommendation-engine were removed as incomplete)
# ============================================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting nself-tv plugins...${NC}\n"

# ============================================================================
# ONE-TIME SETUP (Run only once)
# ============================================================================

if [[ ! -L ~/.nself/shared ]]; then
  echo -e "${YELLOW}⚙️  ONE-TIME SETUP: Building shared utilities...${NC}"
  cd ~/Sites/nself-plugins/shared
  pnpm install --silent 2>&1 | grep -v "^>" || true
  pnpm build 2>&1 | grep -v "^>" || true
  ln -s ~/.nself/plugins/_shared ~/.nself/shared
  echo -e "${GREEN}✓ Shared utilities ready${NC}\n"
fi

# ============================================================================
# Plugin Configuration
# ============================================================================

# Database connection from nself-tv backend
DB_USER="postgres"
DB_PASS="dev_password_change_in_prod"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="nself_tv_db"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Generate encryption keys if not exists
if [[ ! -f ~/.nself/encryption.key ]]; then
  echo -e "${YELLOW}🔐 Generating encryption keys...${NC}"
  openssl rand -base64 32 > ~/.nself/encryption.key
  echo -e "${GREEN}✓ Encryption key generated${NC}\n"
fi
ENCRYPTION_KEY=$(cat ~/.nself/encryption.key)

# ============================================================================
# Plugin List (name:port)
# ============================================================================

PLUGINS=(
  "vpn:3200"
  "torrent-manager:3201"
  "content-acquisition:3202"
  "epg:3013"
  "recording:3602"
  "sports:3035"
  "stream-gateway:3601"
  "tokens:3021"
  "jobs:3016"
  "media-processing:3019"
  "metadata-enrichment:3203"
  "subtitle-manager:3204"
  "retro-gaming:3030"
  "rom-discovery:3031"
  "content-progress:3022"
  "file-processing:3104"
  "workflows:3712"
  "devices:3603"
)

# ============================================================================
# Start Each Plugin
# ============================================================================

mkdir -p ~/.nself/logs
mkdir -p ~/.nself/pids

for entry in "${PLUGINS[@]}"; do
  IFS=':' read -r plugin port <<< "$entry"
  plugin_dir="$HOME/.nself/plugins/$plugin/ts"

  if [[ ! -d "$plugin_dir" ]]; then
    echo -e "${YELLOW}⚠️  Plugin $plugin not installed, skipping...${NC}"
    continue
  fi

  echo -e "${BLUE}Starting ${plugin} on port ${port}...${NC}"

  # Install dependencies if needed
  if [[ ! -d "$plugin_dir/node_modules" ]]; then
    echo "  Installing dependencies..."
    (cd "$plugin_dir" && pnpm install --silent)
  fi

  # Build if needed
  if [[ ! -d "$plugin_dir/dist" ]]; then
    echo "  Building TypeScript..."
    (cd "$plugin_dir" && pnpm build 2>&1 | grep -v "^>" || true)
  fi

  # Create .env if doesn't exist
  if [[ ! -f "$plugin_dir/.env" ]]; then
    cat > "$plugin_dir/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
PORT=${port}
LOG_LEVEL=info
EOF
  fi

  # Start plugin in background
  (
    cd "$plugin_dir" && \
    PORT=$port pnpm start > ~/.nself/logs/${plugin}.log 2>&1 &
    echo $! > ~/.nself/pids/${plugin}.pid
  )

  sleep 0.5
  echo -e "${GREEN}✓ ${plugin} started (PID: $(cat ~/.nself/pids/${plugin}.pid))${NC}"
done

echo ""
echo -e "${GREEN}✅ All plugins started!${NC}"
echo ""
echo "Logs: tail -f ~/.nself/logs/*.log"
echo "Stop all: kill \$(cat ~/.nself/pids/*.pid)"
echo ""

# ============================================================================
# Health Check
# ============================================================================

echo -e "${BLUE}🏥 Running health checks...${NC}"
sleep 2

for entry in "${PLUGINS[@]}"; do
  IFS=':' read -r plugin port <<< "$entry"
  if curl -sf http://localhost:$port/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $plugin (port $port)"
  else
    echo -e "${YELLOW}⚠${NC} $plugin (port $port) - check logs: ~/.nself/logs/${plugin}.log"
  fi
done

echo ""
echo -e "${GREEN}🎉 Plugin startup complete!${NC}"
