#!/bin/bash
set -e

echo "🧹 Resetting nself-tv environment..."
echo ""
echo "⚠️  WARNING: This will:"
echo "  - Stop and remove all Docker containers"
echo "  - Delete all Docker volumes (database data will be lost)"
echo "  - Remove node_modules directories"
echo "  - Remove .env files"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && { echo "Cancelled."; exit 1; }

# Navigate to repo root
cd "$(dirname "$0")/../.."

# Stop and remove Docker containers + volumes
echo "🐳 Stopping Docker services..."
cd backend
docker-compose down -v 2>/dev/null || echo "  (no containers running)"

# Remove node_modules
echo "🗑️  Removing node_modules..."
cd ..
rm -rf node_modules backend/node_modules frontend/node_modules
rm -rf frontend/web/node_modules frontend/*/node_modules

# Remove .env files
echo "🗑️  Removing .env files..."
rm -f backend/.env frontend/.env.local

# Remove build artifacts
echo "🗑️  Removing build artifacts..."
rm -rf backend/dist backend/build
rm -rf frontend/.next frontend/out frontend/dist

echo ""
echo "✅ Reset complete!"
echo ""
echo "To set up again, run:"
echo "  ./backend/scripts/bootstrap.sh"
