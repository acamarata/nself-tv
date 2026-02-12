#!/bin/bash
set -e

echo "🚀 Bootstrapping nself-tv development environment..."

# Navigate to repo root
cd "$(dirname "$0")/../.."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required (npm install -g pnpm)"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create .env files
echo "📝 Creating .env files..."
cd backend
[ ! -f .env ] && cp .env.example .env && echo "  ✅ Created backend/.env"
cd ../frontend
[ ! -f .env.local ] && cp .env.local.example .env.local && echo "  ✅ Created frontend/.env.local"
cd ..

# Start Docker services
echo "🐳 Starting Docker services..."
cd backend && docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "Services running:"
echo "  PostgreSQL:  http://localhost:5432"
echo "  Hasura:      http://localhost:8080"
echo "  MinIO:       http://localhost:9001 (console)"
echo "  Redis:       http://localhost:6379"
echo "  MailHog:     http://localhost:8025"
echo ""
echo "Next steps:"
echo "  1. cd backend && pnpm dev        # Start backend services"
echo "  2. cd frontend && pnpm dev       # Start frontend (new terminal)"
echo ""
echo "To stop services:"
echo "  cd backend && docker-compose down"
