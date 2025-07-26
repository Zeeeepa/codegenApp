# 🚀 CodegenApp Deployment Guide

This guide provides comprehensive instructions for deploying and managing the CodegenApp with full UI + Backend functionality.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Environment Setup](#environment-setup)
- [Deployment Commands](#deployment-commands)
- [Service Management](#service-management)
- [Troubleshooting](#troubleshooting)
- [Architecture Overview](#architecture-overview)

## 🚀 Quick Start

### 1. One-Command Deployment

```bash
# Make the script executable (first time only)
chmod +x deploy.sh

# Deploy everything
./deploy.sh
```

This single command will:
- ✅ Check system requirements
- ✅ Set up environment variables
- ✅ Install all dependencies (UI, Server, Backend)
- ✅ Build the React application
- ✅ Start all services (Backend → Server → UI)
- ✅ Run health checks
- ✅ Display deployment summary

### 2. Access Your Application

After successful deployment:
- **🌐 UI (React)**: http://localhost:3002
- **🔧 Server (Node.js)**: http://localhost:3001  
- **🐍 Backend (FastAPI)**: http://localhost:8000

## 🔧 System Requirements

### Required Software

- **Node.js**: 16.0+ (with npm)
- **Python**: 3.8+ (with pip3)
- **curl**: For health checks
- **lsof**: For port management (recommended)

### Installation Commands

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm python3 python3-pip curl lsof

# macOS (with Homebrew)
brew install node python curl

# Windows (with Chocolatey)
choco install nodejs python curl
```

## ⚙️ Environment Setup

### Automatic Setup

The deployment script automatically creates a `.env` file with default values:

```bash
./deploy.sh  # Creates .env if it doesn't exist
```

### Manual Configuration

Edit `.env` with your actual API keys:

```bash
# CodegenApp Environment Configuration
NODE_ENV=development

# API Configuration
REACT_APP_CODEGEN_API_BASE_URL=https://api.codegen.com
REACT_APP_CODEGEN_API_KEY=your-codegen-api-key-here
REACT_APP_CODEGEN_ORG_ID=your-org-id-here

# GitHub Configuration
REACT_APP_GITHUB_TOKEN=your-github-token-here
GITHUB_TOKEN=your-github-token-here

# Gemini AI Configuration
REACT_APP_GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration
SERVER_PORT=3001
UI_PORT=3002
BACKEND_PORT=8000

# CORS Configuration
CORS_ORIGIN=http://localhost:3002
```

## 📋 Deployment Commands

### Basic Commands

```bash
# Start all services
./deploy.sh start
# or simply
./deploy.sh

# Stop all services
./deploy.sh stop

# Restart all services
./deploy.sh restart

# Check service status
./deploy.sh status

# Show help
./deploy.sh help
```

### Advanced Commands

```bash
# Run comprehensive tests
./deploy.sh test

# Run health checks
./deploy.sh health

# View logs (all services)
./deploy.sh logs

# View specific service logs
./deploy.sh logs ui
./deploy.sh logs server
./deploy.sh logs backend
```

## 🛠️ Service Management

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Node.js       │    │   FastAPI       │
│   Port: 3002    │───▶│   Server        │───▶│   Backend       │
│   Frontend      │    │   Port: 3001    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Details

#### 🌐 UI (React) - Port 3002
- **Purpose**: User interface and web application
- **Technology**: React 18 with TypeScript
- **Features**: Agent run management, API integration dashboard
- **Log File**: `./logs/ui.log`
- **PID File**: `./pids/ui.pid`

#### 🔧 Server (Node.js) - Port 3001
- **Purpose**: API proxy and middleware
- **Technology**: Express.js with CORS support
- **Features**: API routing, authentication, request proxying
- **Log File**: `./logs/server.log`
- **PID File**: `./pids/server.pid`

#### 🐍 Backend (FastAPI) - Port 8000
- **Purpose**: Core API and business logic
- **Technology**: FastAPI with Python 3.8+
- **Features**: Codegen API integration, data processing
- **Log File**: `./logs/backend.log`
- **PID File**: `./pids/backend.pid`

### Process Management

```bash
# Check if services are running
./deploy.sh status

# View process information
ps aux | grep -E "(node|python|uvicorn)"

# Kill specific service manually
kill $(cat ./pids/ui.pid)      # Stop UI
kill $(cat ./pids/server.pid)  # Stop Server
kill $(cat ./pids/backend.pid) # Stop Backend
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the port
lsof -i :3002  # or :3001, :8000

# Kill process on port
./deploy.sh stop  # Stops all services
# or manually:
kill -9 $(lsof -ti:3002)
```

#### 2. Dependencies Installation Failed

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules server/node_modules
./deploy.sh

# For Python dependencies
pip3 install --upgrade pip
cd backend && pip3 install -r requirements.txt
```

#### 3. Environment Variables Not Set

```bash
# Check if .env exists
ls -la .env

# Recreate .env file
rm .env
./deploy.sh  # Will recreate .env

# Verify environment variables
cat .env
```

#### 4. Services Won't Start

```bash
# Check logs for errors
./deploy.sh logs

# Check specific service logs
./deploy.sh logs ui
./deploy.sh logs server
./deploy.sh logs backend

# Check system resources
df -h  # Disk space
free -h  # Memory
```

### Health Check Failures

```bash
# Run health checks
./deploy.sh health

# Manual health checks
curl http://localhost:3002  # UI
curl http://localhost:3001  # Server
curl http://localhost:8000/health  # Backend

# Check service status
./deploy.sh status
```

### Log Analysis

```bash
# View recent logs
./deploy.sh logs

# Follow logs in real-time
tail -f ./logs/ui.log
tail -f ./logs/server.log
tail -f ./logs/backend.log

# Search for errors
grep -i error ./logs/*.log
grep -i "failed" ./logs/*.log
```

## 🧪 Testing

### Comprehensive Test Suite

```bash
# Run all tests
./deploy.sh test
```

This runs:
1. **Zero-Error Test Suite**: Comprehensive error handling validation
2. **Web Evaluation Tests**: UI functionality verification
3. **Detailed UI Tests**: Component-level analysis with Gemini AI

### Manual Testing

```bash
# Test individual components
node zero-error-test.js      # Error handling tests
node web-eval-demo.js        # Web evaluation tests
node detailed-ui-test.js     # Detailed UI analysis
```

## 📊 Monitoring

### Service Status Monitoring

```bash
# Continuous status monitoring
watch -n 5 './deploy.sh status'

# Check service health
./deploy.sh health
```

### Log Monitoring

```bash
# Monitor all logs
tail -f ./logs/*.log

# Monitor specific service
tail -f ./logs/ui.log
```

### Performance Monitoring

```bash
# Check resource usage
top -p $(cat ./pids/*.pid | tr '\n' ',' | sed 's/,$//')

# Check port usage
netstat -tulpn | grep -E "(3001|3002|8000)"
```

## 🔄 Development Workflow

### Development Mode

```bash
# Start in development mode
./deploy.sh

# Make changes to code
# Services will auto-reload (UI and Server have hot reload)

# Restart if needed
./deploy.sh restart
```

### Production Deployment

```bash
# Set production environment
export NODE_ENV=production

# Build and deploy
./deploy.sh

# Verify deployment
./deploy.sh health
./deploy.sh test
```

## 📁 File Structure

```
codegenApp/
├── deploy.sh                 # Main deployment script
├── .env                      # Environment variables
├── package.json              # UI dependencies
├── src/                      # React source code
├── server/                   # Node.js server
│   ├── package.json          # Server dependencies
│   ├── index.js              # Server entry point
│   └── .env                  # Server environment
├── backend/                  # FastAPI backend
│   ├── requirements.txt      # Python dependencies
│   ├── main.py               # Backend entry point
│   └── .env                  # Backend environment
├── logs/                     # Service logs
│   ├── ui.log
│   ├── server.log
│   └── backend.log
├── pids/                     # Process ID files
│   ├── ui.pid
│   ├── server.pid
│   └── backend.pid
└── tests/                    # Test files
```

## 🆘 Support

### Getting Help

1. **Check Logs**: `./deploy.sh logs`
2. **Run Health Checks**: `./deploy.sh health`
3. **Check Status**: `./deploy.sh status`
4. **Run Tests**: `./deploy.sh test`

### Common Commands Reference

```bash
# Quick reference
./deploy.sh help              # Show all commands
./deploy.sh                   # Start everything
./deploy.sh stop              # Stop everything
./deploy.sh restart           # Restart everything
./deploy.sh status            # Check status
./deploy.sh logs              # View logs
./deploy.sh test              # Run tests
./deploy.sh health            # Health checks
```

## 🎉 Success Indicators

After successful deployment, you should see:

- ✅ All services running on their respective ports
- ✅ Health checks passing
- ✅ UI accessible at http://localhost:3002
- ✅ No errors in logs
- ✅ Tests passing

---

**🚀 Happy Deploying!** 

For issues or questions, check the logs first, then run health checks to diagnose problems.

