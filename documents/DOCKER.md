# 🐳 TechzuPOS Docker Setup Guide

## Overview
This Docker configuration allows you to run the entire TechzuPOS monorepo in containers with a single command. When you start Docker, it automatically runs `pnpm run dev` with the Turborepo TUI, giving you the same great development experience in a containerized environment.

## 🚀 Quick Start

### Prerequisites
1. **Docker Desktop** installed and running
2. **Git** for cloning the repository

### One-Command Setup
```bash
# Clone and start everything
git clone <repository-url>
cd TechzuPOS
./docker-setup.sh
```

Or manually:
```bash
# Start with docker-compose
pnpm run docker:dev

# Or directly
docker-compose up --build
```

## 🏗️ Docker Architecture

### Services
- **techzu-pos**: Main development container running all three applications
- **postgres**: PostgreSQL database (optional, use `--profile database`)

### Ports Exposed
- `3001` → API Server (Express.js)
- `3000` → Web Admin Panel (Next.js)
- `8081` → Expo DevTools
- `19000-19002` → Expo development ports
- `5432` → PostgreSQL database (when enabled)

### Volumes
- **Source code mounting**: Live code changes reflected in container
- **Node modules isolation**: Container's node_modules are preserved
- **PostgreSQL data**: Persistent database storage

## 📁 Docker Files Structure

```
TechzuPOS/
├── Dockerfile              # Multi-stage build configuration
├── docker-compose.yml      # Service orchestration
├── .dockerignore           # Build optimization
├── .env.docker            # Docker environment variables
└── docker-setup.sh        # Helper setup script
```

## 🛠️ Development Workflow

### Starting Development
```bash
# Start all services (with logs)
pnpm run docker:dev

# Start in background
pnpm run docker:dev:detached

# View logs of running services
pnpm run docker:logs
```

### Accessing Services
Once running, access your applications:
- **API Server**: http://localhost:3001
- **Web Admin**: http://localhost:3000
- **Expo DevTools**: http://localhost:8081
- **Expo App**: Scan QR code or use simulator

### Managing Containers
```bash
# Stop all services
pnpm run docker:stop

# Access container shell
pnpm run docker:shell

# Clean up everything (containers, volumes, images)
pnpm run docker:clean
```

## ⚙️ Configuration

### Environment Variables
Docker-specific environment variables are in `.env.docker`:
- Database connection (Docker internal networking)
- Development server configurations
- Hot reloading settings
- Expo development settings

### Customization
You can override settings by creating a `docker-compose.override.yml` file:
```yaml
version: '3.8'
services:
  techzu-pos:
    environment:
      - CUSTOM_ENV_VAR=custom_value
    ports:
      - "4000:3000"  # Map web to different port
```

## 🗄️ Database Integration

### Enable PostgreSQL
```bash
# Start with database
docker-compose --profile database up --build

# Access database
docker-compose exec postgres psql -U techzu_user -d techzu_pos
```

### Database Configuration
- **Host**: `postgres` (internal Docker network)
- **Port**: `5432`
- **Database**: `techzu_pos`
- **User**: `techzu_user`
- **Password**: `techzu_pass`

## 🔧 Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Check Docker status
   docker info
   # Start Docker Desktop app
   ```

2. **Port conflicts**
   ```bash
   # Check what's using ports
   lsof -i :3000
   lsof -i :3001
   # Kill conflicting processes or change ports
   ```

3. **Hot reloading not working**
   - Ensure polling is enabled in `.env.docker`
   - Check volume mounts in `docker-compose.yml`

4. **Build failures**
   ```bash
   # Clean Docker cache
   docker system prune -a
   # Rebuild from scratch
   docker-compose build --no-cache
   ```

### Debugging
```bash
# View detailed logs
docker-compose logs -f techzu-pos

# Access container shell
docker-compose exec techzu-pos sh

# Check container status
docker-compose ps
```

## 🚀 Production Deployment

### Production Build
```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### Production Features
- Optimized multi-stage builds
- Non-root user for security
- Health checks
- Resource limits
- Production environment variables

## 📊 Benefits of Docker Development

✅ **Consistent Environment**: Everyone runs the same setup
✅ **Isolation**: No conflicts with host system
✅ **Easy Onboarding**: One command to start everything
✅ **Turborepo TUI**: Same great development experience
✅ **Hot Reloading**: Live code changes
✅ **Database Included**: Optional PostgreSQL container
✅ **Port Management**: All services properly exposed
✅ **Volume Persistence**: Development files preserved

## 🎯 Next Steps

1. **Start Docker**: Run `./docker-setup.sh`
2. **Access Services**: Open http://localhost:3000 and http://localhost:3001
3. **Mobile Development**: Use Expo app to scan QR code
4. **Database**: Enable with `--profile database`
5. **Development**: Code changes automatically reload

**Happy Dockerized Development! 🚀**