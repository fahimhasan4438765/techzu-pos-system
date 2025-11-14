#!/bin/bash

# TechzuPOS Docker Development Setup Script
# This script helps you get started with Docker development

echo "🐳 TechzuPOS Docker Setup"
echo "========================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo ""
    echo "📋 To fix this:"
    echo ""
    echo "1. 🚀 Install Docker Desktop (if not installed):"
    echo "   Download from: https://www.docker.com/products/docker-desktop/"
    echo ""
    echo "2. 🟢 Start Docker Desktop:"
    echo "   • Open Docker Desktop application"
    echo "   • Wait for Docker to start (whale icon turns green)"
    echo "   • You should see 'Docker Desktop is running' in the menu"
    echo ""
    echo "3. 🔄 Try again:"
    echo "   ./docker-setup.sh"
    echo "   OR"
    echo "   pnpm run docker:dev"
    echo ""
    echo "💡 Tip: Docker Desktop needs to be running every time you want to use Docker"
    echo ""
    exit 1
fi

echo "✅ Docker is running!"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found!"
    echo "Please install docker-compose or use 'docker compose' instead"
    exit 1
fi

echo "✅ docker-compose is available!"
echo ""

# Build and start services
echo "🏗️  Building TechzuPOS containers..."
docker-compose build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "🚀 Starting all services with Turborepo TUI..."
    echo ""
    echo "Services will be available at:"
    echo "  🔵 API Server  → http://localhost:3001"
    echo "  🟢 Web Admin   → http://localhost:3000"
    echo "  🟣 POS App     → http://localhost:8081"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo ""
    
    docker-compose up
else
    echo ""
    echo "❌ Build failed! Please check the error messages above."
    exit 1
fi