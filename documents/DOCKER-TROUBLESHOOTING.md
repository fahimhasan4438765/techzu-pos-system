# 🔧 Docker Troubleshooting Guide for TechzuPOS

## ❌ Error: "Cannot connect to the Docker daemon"

### Problem
```
Cannot connect to the Docker daemon at unix:///Users/fahimhasan/.docker/run/docker.sock. Is the docker daemon running?
```

### Solution
Docker Desktop is not running. Follow these steps:

#### Step 1: Install Docker Desktop (if not installed)
1. Go to https://www.docker.com/products/docker-desktop/
2. Download Docker Desktop for Mac
3. Install the application

#### Step 2: Start Docker Desktop
1. **Open Docker Desktop** from Applications folder
2. **Wait for startup** - The whale icon in the menu bar should turn **green**
3. **Verify it's running** - You should see "Docker Desktop is running"

#### Step 3: Verify Docker is Ready
```bash
# Check Docker status
pnpm run docker:check

# Or manually check
docker info
```

#### Step 4: Try Again
```bash
pnpm run docker:dev
```

## ⚠️ Warning: "version is obsolete"

### Problem
```
WARN[0000] /path/docker-compose.yml: the attribute `version` is obsolete
```

### Solution
✅ **Already Fixed!** This warning has been resolved by removing the obsolete `version` field from docker-compose.yml. You can safely ignore this warning if you see it.

## 🐳 Docker Desktop Not Starting

### Problem
Docker Desktop won't start or crashes

### Solutions

#### Option 1: Restart Docker Desktop
1. Quit Docker Desktop completely
2. Wait 10 seconds
3. Open Docker Desktop again
4. Wait for the green whale icon

#### Option 2: Reset Docker Desktop
1. Open Docker Desktop
2. Go to Settings (gear icon)
3. Click "Troubleshoot"
4. Click "Reset to factory defaults"
5. Restart Docker Desktop

#### Option 3: Check System Resources
- Ensure you have at least 4GB RAM available
- Close other resource-intensive applications
- Check disk space (Docker needs several GB)

## 🔧 Quick Fixes

### Clear Docker Cache
```bash
# Stop all containers
pnpm run docker:stop

# Clean everything
pnpm run docker:clean

# Or use Docker commands directly
docker system prune -a
```

### Check Docker Version
```bash
docker --version
docker-compose --version
```

### Manual Docker Commands
If pnpm commands fail, try directly:
```bash
# Check status
docker info

# Build and start
docker-compose up --build

# Stop services  
docker-compose down
```

## 🚀 Success Indicators

You'll know Docker is working when:

1. ✅ `pnpm run docker:check` shows all green checkmarks
2. ✅ `pnpm run docker:dev` starts without errors
3. ✅ You can access:
   - http://localhost:3000 (Web Admin)
   - http://localhost:3001 (API Server)
   - http://localhost:8081 (Expo DevTools)

## 📞 Still Having Issues?

### Check Docker Desktop Status
1. Look at the whale icon in your menu bar
2. Click it to see the status
3. Green = Good, Gray/Red = Problem

### System Requirements
- **macOS**: 10.15 or later
- **RAM**: 4GB minimum, 8GB recommended  
- **Disk**: 2GB free space minimum

### Alternative: Run Without Docker
If Docker continues to cause issues, you can always run locally:
```bash
pnpm run dev  # Local development with Turborepo TUI
```

## 🆘 Emergency Commands

If Docker gets stuck:
```bash
# Force stop everything
pkill -f docker
sudo launchctl stop com.docker.vmnetd

# Restart Docker Desktop
open -a Docker

# Wait 30 seconds, then try again
pnpm run docker:check
```

**Remember: Docker Desktop must be running before you can use any Docker commands!** 🐳