#!/usr/bin/env bash

echo "🛑 Stopping all plugins..."

if [[ -d ~/.nself/pids ]]; then
  for pidfile in ~/.nself/pids/*.pid; do
    [[ -f "$pidfile" ]] || continue
    plugin=$(basename "$pidfile" .pid)
    pid=$(cat "$pidfile")
    if kill "$pid" 2>/dev/null; then
      echo "✓ Stopped $plugin (PID: $pid)"
    fi
    rm "$pidfile"
  done
fi

echo "✅ All plugins stopped"
