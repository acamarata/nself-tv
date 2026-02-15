#!/usr/bin/env bash

# Stop all running nself plugins

echo "🛑 Stopping all plugins..."

for pidfile in ~/.nself/pids/*.pid; do
  [[ -f "$pidfile" ]] || continue

  plugin=$(basename "$pidfile" .pid)
  pid=$(cat "$pidfile")

  if kill -0 "$pid" 2>/dev/null; then
    echo "  ✓ Stopping $plugin (PID: $pid)"
    kill "$pid" 2>/dev/null || true
  fi

  rm "$pidfile"
done

echo ""
echo "✅ All plugins stopped"
