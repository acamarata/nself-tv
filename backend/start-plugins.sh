#!/usr/bin/env bash
set -e

# Start 11 production-ready nself plugins as external Node.js processes
# Based on nself CLI team guidance (DONE.md 2026-02-14)
#
# EXCLUDED (7 plugins with TypeScript errors - reported to plugin team):
#   vpn, torrent-manager, content-acquisition, subtitle-manager,
#   metadata-enrichment, stream-gateway, media-processing
#
# REMOVED (3 incomplete plugins - removed by plugin team):
#   discovery, media-scanner, recommendation-engine

PLUGINS=(
  "file-processing:3104"
  "devices:3603"
  "epg:3031"
  "sports:3035"
  "recording:3602"
  "jobs:3105"
  "workflows:3712"
  "tokens:3107"
  "content-progress:3023"
  "retro-gaming:3033"
  "rom-discovery:3034"
)

# Create directories for logs and PIDs
mkdir -p ~/.nself/logs ~/.nself/pids

# Source .env for DATABASE_URL and other variables
if [[ -f .env.dev ]]; then
  set -a
  source <(grep -v '^#' .env.dev | grep -v '^$')
  set +a
fi

echo "🚀 Starting 11 production-ready nself plugins..."

for entry in "${PLUGINS[@]}"; do
  IFS=':' read -r plugin port <<< "$entry"
  plugin_dir="$HOME/.nself/plugins/$plugin/ts"

  if [[ ! -d "$plugin_dir" ]]; then
    echo "⚠️  Plugin $plugin not installed at $plugin_dir"
    continue
  fi

  echo "  ✓ Starting $plugin on port $port..."
  (
    cd "$plugin_dir" && \
    pnpm start > "$HOME/.nself/logs/$plugin.log" 2>&1 &
  )
  echo $! > "$HOME/.nself/pids/$plugin.pid"
  sleep 0.5
done

echo ""
echo "✅ All plugins started"
echo ""
echo "Check logs: tail -f ~/.nself/logs/*.log"
echo "Check health: curl http://localhost:3200/health"
echo ""
echo "To stop: ./stop-plugins.sh"
