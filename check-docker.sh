#!/bin/bash

# Quick Docker status checker for TechzuPOS

echo "🔍 Docker Status Check"
echo "====================="
echo ""

# Check if Docker command exists
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Please install Docker Desktop:"
    echo "https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "✅ Docker command found"

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running!"
    echo ""
    echo "Please start Docker Desktop:"
    echo "1. Open Docker Desktop application"
    echo "2. Wait for the whale icon to turn green"
    echo "3. Try running your command again"
    echo ""
    
    # Try to start Docker Desktop on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "🚀 Attempting to start Docker Desktop..."
        open -a Docker
        echo "⏳ Please wait for Docker Desktop to start, then try again"
    fi
    
    exit 1
fi

echo "✅ Docker daemon is running"

# Check docker-compose
if command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose is available"
elif docker compose version > /dev/null 2>&1; then
    echo "✅ docker compose (plugin) is available"
else
    echo "⚠️  docker-compose not found, but you can use 'docker compose' instead"
fi

echo ""
echo "🎉 Docker is ready!"
echo ""
echo "You can now run:"
echo "  pnpm run docker:dev"
echo "  OR"
echo "  ./docker-setup.sh"
echo ""