#!/bin/bash

# =============================================================================
# CodegenApp Startup Script
# =============================================================================
# This script starts the CodegenApp backend server with proper environment
# activation and configuration validation.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_startup() {
    echo -e "${PURPLE}[STARTUP]${NC} $1"
}

# Trap to handle cleanup on exit
cleanup() {
    log_info "🛑 Shutting down CodegenApp..."
    # Kill background processes if any
    jobs -p | xargs -r kill 2>/dev/null || true
    log_success "👋 CodegenApp stopped gracefully"
}

trap cleanup EXIT INT TERM

# =============================================================================
# STARTUP BANNER
# =============================================================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                              ║${NC}"
echo -e "${CYAN}║                            🚀 CODEGENAPP STARTUP 🚀                          ║${NC}"
echo -e "${CYAN}║                                                                              ║${NC}"
echo -e "${CYAN}║                     AI Agent Run Manager & Orchestrator                     ║${NC}"
echo -e "${CYAN}║                                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# 1. PRE-FLIGHT CHECKS
# =============================================================================
log_startup "🔍 Running pre-flight checks..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    log_error "Virtual environment not found! Please run 'bash deploy.sh' first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_error ".env file not found! Please run 'bash deploy.sh' first or create .env manually."
    exit 1
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    log_error "Backend directory not found! Please ensure you're in the correct directory."
    exit 1
fi

log_success "✅ Pre-flight checks passed"

# =============================================================================
# 2. ENVIRONMENT ACTIVATION
# =============================================================================
log_startup "🐍 Activating Python virtual environment..."

# Activate virtual environment
source venv/bin/activate

# Verify activation
if [[ "$VIRTUAL_ENV" != "" ]]; then
    log_success "Virtual environment activated: $(basename $VIRTUAL_ENV)"
else
    log_error "Failed to activate virtual environment"
    exit 1
fi

# =============================================================================
# 3. ENVIRONMENT VALIDATION
# =============================================================================
log_startup "⚙️ Validating environment configuration..."

# Load and validate .env file
python3 -c "
import os
from pathlib import Path

# Load .env file
env_file = Path('.env')
if env_file.exists():
    with open(env_file) as f:
        lines = f.readlines()
    
    # Check for required variables
    required_vars = ['CODEGEN_API_KEY', 'CODEGEN_ORG_ID', 'JWT_SECRET_KEY']
    missing_vars = []
    default_vars = []
    
    env_vars = {}
    for line in lines:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            env_vars[key] = value
    
    for var in required_vars:
        if var not in env_vars:
            missing_vars.append(var)
        elif env_vars[var] in ['your_api_key_here', 'your_org_id_here', 'your_jwt_secret_key_here', 'your_secure_secret_key']:
            default_vars.append(var)
    
    if missing_vars:
        print(f'❌ Missing required environment variables: {missing_vars}')
        exit(1)
    
    if default_vars:
        print(f'⚠️  Warning: Default values detected for: {default_vars}')
        print('   Please update these values in .env for production use')
    
    print('✅ Environment configuration validated')
else:
    print('❌ .env file not found')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo ""
    log_error "Environment validation failed!"
    echo ""
    echo "📝 Please update your .env file with proper values:"
    echo "   ${YELLOW}nano .env${NC}"
    echo ""
    echo "🔑 Required variables:"
    echo "   - CODEGEN_API_KEY=your_actual_api_key"
    echo "   - CODEGEN_ORG_ID=your_actual_org_id"  
    echo "   - JWT_SECRET_KEY=your_secure_secret_key"
    echo ""
    exit 1
fi

# =============================================================================
# 4. DEPENDENCY CHECK
# =============================================================================
log_startup "📦 Checking Python dependencies..."

# Test critical imports
python3 -c "
try:
    from backend.app.config.settings import Settings
    from fastapi import FastAPI
    from uvicorn import run
    import pydantic
    import httpx
    print('✅ All critical dependencies available')
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    print('Please run: bash deploy.sh')
    exit(1)
"

if [ $? -ne 0 ]; then
    log_error "Dependency check failed! Please run 'bash deploy.sh' to install dependencies."
    exit 1
fi

# =============================================================================
# 5. CONFIGURATION LOADING
# =============================================================================
log_startup "📋 Loading application configuration..."

# Load and display configuration
python3 -c "
from backend.app.config.settings import Settings

try:
    settings = Settings()
    print(f'✅ Configuration loaded successfully')
    print(f'   🌐 Host: {settings.host}')
    print(f'   🔌 Port: {settings.port}')
    print(f'   🔧 Debug: {settings.debug}')
    print(f'   🔗 CORS Origins: {len(settings.cors_origins)} configured')
    print(f'   📊 Metrics: {\"Enabled\" if settings.enable_metrics else \"Disabled\"}')
    
    # Check API configuration
    if settings.is_official_api_enabled():
        print(f'   🔑 Codegen API: Configured')
    else:
        print(f'   ⚠️  Codegen API: Using demo configuration')
        
except Exception as e:
    print(f'❌ Configuration error: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    log_error "Configuration loading failed!"
    exit 1
fi

# =============================================================================
# 6. PORT AVAILABILITY CHECK
# =============================================================================
log_startup "🔌 Checking port availability..."

# Get port from settings
PORT=$(python3 -c "from backend.app.config.settings import Settings; print(Settings().port)")

# Check if port is available
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":$PORT "; then
        log_warning "Port $PORT is already in use. The application may not start properly."
        log_info "To kill processes using port $PORT, run: sudo lsof -ti:$PORT | xargs kill -9"
    else
        log_success "Port $PORT is available"
    fi
elif command -v ss &> /dev/null; then
    if ss -tuln | grep -q ":$PORT "; then
        log_warning "Port $PORT is already in use. The application may not start properly."
    else
        log_success "Port $PORT is available"
    fi
else
    log_info "Cannot check port availability (netstat/ss not found)"
fi

# =============================================================================
# 7. STARTUP INFORMATION
# =============================================================================
echo ""
log_startup "🚀 Starting CodegenApp Backend Server..."
echo ""
echo "📊 Application Information:"
echo "   🏠 Host: http://localhost:$PORT"
echo "   📚 API Docs: http://localhost:$PORT/docs"
echo "   🔍 Health Check: http://localhost:$PORT/health"
echo "   📈 Metrics: http://localhost:$PORT/metrics (if enabled)"
echo ""
echo "🎮 Controls:"
echo "   • Press ${GREEN}Ctrl+C${NC} to stop the server"
echo "   • Server logs will appear below"
echo ""
echo "🔗 Useful endpoints:"
echo "   • GET  /health - Health check"
echo "   • GET  /docs - Interactive API documentation"
echo "   • POST /api/v1/agents/runs - Create agent run"
echo "   • GET  /api/v1/agents/runs - List agent runs"
echo ""

# =============================================================================
# 8. START THE APPLICATION
# =============================================================================
log_startup "🎯 Launching backend server..."

# Add a small delay for better UX
sleep 1

# Start the application
exec python3 backend/main.py

# Note: exec replaces the shell process, so cleanup trap will still work
# when the Python process receives signals

