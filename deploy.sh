#!/bin/bash

# =============================================================================
# CodegenApp Deployment Script
# =============================================================================
# This script handles the complete deployment of CodegenApp including:
# - Python environment setup
# - Dependency installation
# - Frontend build
# - Environment configuration
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if running as root (skip in sandbox environment)
if [[ $EUID -eq 0 ]] && [[ -z "$CODEGEN_SANDBOX" ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

log_info "🚀 Starting CodegenApp Deployment..."

# =============================================================================
# 1. SYSTEM REQUIREMENTS CHECK
# =============================================================================
log_info "📋 Checking system requirements..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
log_info "Found Python version: $PYTHON_VERSION"

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm."
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_info "Found Node.js version: $NODE_VERSION"
log_info "Found npm version: $NPM_VERSION"

# Check if pip is available
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    log_error "pip is not installed. Please install pip."
    exit 1
fi

# Use pip3 if available, otherwise pip
PIP_CMD="pip3"
if ! command -v pip3 &> /dev/null; then
    PIP_CMD="pip"
fi

log_success "✅ All system requirements met"

# =============================================================================
# 2. VIRTUAL ENVIRONMENT SETUP
# =============================================================================
log_info "🐍 Setting up Python virtual environment..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    log_info "Creating virtual environment..."
    python3 -m venv venv
    log_success "Virtual environment created"
else
    log_info "Virtual environment already exists"
fi

# Activate virtual environment
log_info "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip in virtual environment
log_info "Upgrading pip..."
pip install --upgrade pip

log_success "✅ Virtual environment ready"

# =============================================================================
# 3. PYTHON DEPENDENCIES INSTALLATION
# =============================================================================
log_info "📦 Installing Python dependencies..."

# Install the package in development mode
log_info "Installing CodegenApp package..."
pip install -e . --break-system-packages 2>/dev/null || pip install -e .

# Install additional requirements if requirements.txt exists
if [ -f "requirements.txt" ]; then
    log_info "Installing additional requirements..."
    pip install -r requirements.txt
fi

log_success "✅ Python dependencies installed"

# =============================================================================
# 4. FRONTEND BUILD
# =============================================================================
log_info "🎨 Building frontend application..."

# Navigate to frontend directory
if [ -d "frontend" ]; then
    cd frontend
    
    # Install npm dependencies
    log_info "Installing npm dependencies..."
    npm install
    
    # Build the frontend
    log_info "Building React application..."
    npm run build
    
    # Return to root directory
    cd ..
    
    log_success "✅ Frontend built successfully"
else
    log_warning "Frontend directory not found, skipping frontend build"
fi

# =============================================================================
# 5. ENVIRONMENT CONFIGURATION
# =============================================================================
log_info "⚙️ Setting up environment configuration..."

# Copy .env.example to .env if .env doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_info "Copying .env.example to .env..."
        cp .env.example .env
        log_success "Environment file created from template"
    else
        log_warning ".env.example not found, creating basic .env file..."
        cat > .env << 'EOF'
# =============================================================================
# CODEGENAPP ENVIRONMENT CONFIGURATION
# =============================================================================

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
HOST=0.0.0.0
PORT=3001
DEBUG=false

# =============================================================================
# API CONFIGURATION
# =============================================================================
CODEGEN_API_KEY=your_api_key_here
CODEGEN_ORG_ID=your_org_id_here
CODEGEN_API_BASE_URL=https://api.codegen.com

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL=sqlite:///./codegenapp.db

# =============================================================================
# REDIS CONFIGURATION
# =============================================================================
REDIS_URL=redis://localhost:6379/0

# =============================================================================
# SECURITY SETTINGS
# =============================================================================
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Note: CORS origins are configured in settings.py with default values
# CORS_ORIGINS=["http://localhost:3000","http://localhost:3001","http://localhost:3002","http://localhost:8000"]
CORS_ALLOW_CREDENTIALS=true

# =============================================================================
# EXTERNAL API KEYS (Optional)
# =============================================================================
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_token_here

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=INFO
EOF
        log_success "Basic .env file created"
    fi
else
    log_info ".env file already exists, skipping creation"
fi

# =============================================================================
# 6. DIRECTORY STRUCTURE SETUP
# =============================================================================
log_info "📁 Setting up directory structure..."

# Create necessary directories
mkdir -p logs
mkdir -p data
mkdir -p uploads

log_success "✅ Directory structure ready"

# =============================================================================
# 7. PERMISSIONS AND FINAL SETUP
# =============================================================================
log_info "🔐 Setting up permissions..."

# Make start script executable
chmod +x start.sh 2>/dev/null || log_warning "start.sh not found or already executable"

# Set proper permissions for log directory
chmod 755 logs 2>/dev/null || true

log_success "✅ Permissions configured"

# =============================================================================
# 8. DEPLOYMENT VERIFICATION
# =============================================================================
log_info "🔍 Verifying deployment..."

# Test Python imports
log_info "Testing Python package imports..."
python3 -c "
try:
    from backend.app.config.settings import Settings
    settings = Settings()
    print('✅ Settings loaded successfully')
    print(f'   Host: {settings.host}')
    print(f'   Port: {settings.port}')
    print(f'   CORS Origins: {len(settings.cors_origins)} configured')
except Exception as e:
    print(f'❌ Import test failed: {e}')
    exit(1)
"

# Check if frontend build exists
if [ -d "frontend/build" ]; then
    BUILD_SIZE=$(du -sh frontend/build | cut -f1)
    log_success "Frontend build found (${BUILD_SIZE})"
else
    log_warning "Frontend build directory not found"
fi

log_success "✅ Deployment verification completed"

# =============================================================================
# 9. DEPLOYMENT SUMMARY
# =============================================================================
echo ""
echo "🎉 ============================================================================="
echo "🎉                     CODEGENAPP DEPLOYMENT COMPLETED!"
echo "🎉 ============================================================================="
echo ""
log_success "✅ Virtual environment: venv/"
log_success "✅ Python dependencies: Installed"
log_success "✅ Frontend application: Built"
log_success "✅ Environment file: .env created"
log_success "✅ Directory structure: Ready"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. 📝 Configure your environment variables in .env:"
echo "   ${YELLOW}nano .env${NC}"
echo ""
echo "2. 🔑 Required variables to update:"
echo "   - CODEGEN_API_KEY=your_actual_api_key"
echo "   - CODEGEN_ORG_ID=your_actual_org_id"
echo "   - JWT_SECRET_KEY=your_secure_secret_key"
echo "   - GEMINI_API_KEY=your_gemini_key (optional)"
echo "   - GITHUB_TOKEN=your_github_token (optional)"
echo ""
echo "3. 🚀 Start the application:"
echo "   ${GREEN}bash start.sh${NC}"
echo ""
echo "4. 🌐 Access your application:"
echo "   - Backend API: http://localhost:3001"
echo "   - Frontend: http://localhost:3001 (served by backend)"
echo "   - API Documentation: http://localhost:3001/docs"
echo ""
echo "📚 For more information, check the README.md file"
echo ""
log_info "🎯 Deployment completed successfully! Run 'bash start.sh' to start the application."
