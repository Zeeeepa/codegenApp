# Installation Fixes for CodegenApp

This document outlines the fixes applied to resolve npm installation issues and security vulnerabilities.

## Issues Fixed

### 1. Security Vulnerabilities
- **Puppeteer**: Updated from v21.6.1 to v23.0.0+ to fix high-severity vulnerabilities in tar-fs and ws dependencies
- **React Scripts**: Updated version constraint to allow patch updates
- **General**: Added scripts to safely handle npm audit fixes

### 2. Service Startup Issues
- **Backend Service**: Ensures backend automation service starts on port 3500
- **Server Proxy**: Ensures server proxy starts on port 3001  
- **Frontend**: Ensures React app starts on port 8080
- **Service Dependencies**: Added proper startup sequencing with health checks

## New Scripts Added

### `start-dev.sh`
A comprehensive development startup script that:
- Cleans up existing processes on required ports
- Starts services in the correct order (backend → server → frontend)
- Waits for each service to be ready before starting the next
- Provides clear status updates and error handling
- Handles graceful shutdown with Ctrl+C

### `fix-vulnerabilities.sh`
A security fix script that:
- Safely runs npm audit fixes
- Updates Puppeteer to the latest secure version
- Handles force fixes with backup/restore
- Reinstalls dependencies for consistency

## Updated Package.json Scripts

```json
{
  "dev": "./start-dev.sh",                    // New: Proper service startup
  "dev:concurrent": "concurrently ...",      // Fallback: Original concurrent method
  "fix:vulnerabilities": "./fix-vulnerabilities.sh",
  "clean": "rm -rf node_modules ...",        // Clean all dependencies
  "fresh-install": "npm run clean && npm install"
}
```

## Usage Instructions

### Quick Start (Recommended)
```bash
# Fix vulnerabilities and start development environment
npm run fix:vulnerabilities
npm run dev
```

### Manual Steps
```bash
# 1. Clean install (if needed)
npm run clean
npm install

# 2. Fix security vulnerabilities
npm run fix:vulnerabilities

# 3. Start development environment
npm run dev
```

### Alternative Startup (if script fails)
```bash
# Use the original concurrent method
npm run dev:concurrent
```

## Service Endpoints

After successful startup, the following services will be available:

- **Frontend**: http://localhost:8080 (React App)
- **Server Proxy**: http://localhost:3001 (API Proxy)
- **Backend Automation**: http://localhost:3500 (Resume Service)

## Health Checks

Each service provides health check endpoints:
- Frontend: http://localhost:8080 (React app loads)
- Server: http://localhost:3001/health
- Backend: http://localhost:3500/health

## Troubleshooting

### Port Already in Use
The startup script automatically kills existing processes on required ports. If issues persist:
```bash
# Manually kill processes
pkill -f "node.*server.js"
pkill -f "react-scripts"
lsof -ti:3500,3001,8080 | xargs kill -9
```

### Puppeteer Chrome Installation Issues
If Chrome installation fails during backend setup:
```bash
cd backend
npx puppeteer browsers install chrome
```

### Persistent Vulnerabilities
Some vulnerabilities may require manual intervention:
```bash
# Check remaining issues
npm audit

# Force fix (use with caution)
npm audit fix --force
```

## Resume Functionality

The backend automation service (port 3500) is specifically required for the "Resume Agent Run" functionality. If this service isn't running, you'll see the error:

> "Failed to resume agent run: Cannot connect to backend automation service"

The new startup script ensures this service is running and ready before starting other components.

## Security Notes

- Updated Puppeteer to address CVE vulnerabilities in tar-fs and ws
- Added rate limiting and security headers in backend service
- CORS properly configured for local development
- All services use proper error handling and logging

