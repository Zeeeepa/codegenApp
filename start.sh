#!/bin/bash

# Agent Run Manager - Robust Startup Script
# This script handles complete application startup with error handling and user interface

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=8000
BACKEND_PORT=8001
LOG_DIR="./logs"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_LOG="$LOG_DIR/backend.log"

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on ports
cleanup_ports() {
    print_status "Cleaning up existing processes..."
    
    if check_port $FRONTEND_PORT; then
        print_warning "Killing process on port $FRONTEND_PORT"
        lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    fi
    
    if check_port $BACKEND_PORT; then
        print_warning "Killing process on port $BACKEND_PORT"
        lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    fi
    
    sleep 2
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Check if .env exists, if not copy from example
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_warning ".env file not found, copying from .env.example"
            cp .env.example .env
            print_warning "Please edit .env file with your actual API credentials"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    fi
    
    # Check server .env
    if [ ! -f "server/.env" ]; then
        if [ -f "server/.env.example" ]; then
            print_warning "server/.env file not found, copying from server/.env.example"
            cp server/.env.example server/.env
        else
            # Create basic server .env
            cat > server/.env << EOF
PORT=8001
CODEGEN_API_BASE=https://api.codegen.com
FRONTEND_URL=http://localhost:8000
EOF
            print_warning "Created basic server/.env file"
        fi
    fi
    
    print_success "Environment setup completed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install frontend dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install > "$FRONTEND_LOG" 2>&1 || {
            print_error "Failed to install frontend dependencies. Check $FRONTEND_LOG"
            exit 1
        }
    else
        print_status "Frontend dependencies already installed"
    fi
    
    # Install backend dependencies
    if [ ! -d "server/node_modules" ]; then
        print_status "Installing backend dependencies..."
        cd server
        npm install > "../$BACKEND_LOG" 2>&1 || {
            print_error "Failed to install backend dependencies. Check $BACKEND_LOG"
            exit 1
        }
        cd ..
    else
        print_status "Backend dependencies already installed"
    fi
    
    print_success "Dependencies installation completed"
}

# Function to start backend
start_backend() {
    print_status "Starting backend server on port $BACKEND_PORT..."
    
    cd server
    npm start > "../$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if check_port $BACKEND_PORT; then
            print_success "Backend server started successfully (PID: $BACKEND_PID)"
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
    done
    
    print_error "Backend server failed to start within 30 seconds"
    return 1
}

# Function to start frontend
start_frontend() {
    print_status "Starting frontend server on port $FRONTEND_PORT..."
    
    PORT=$FRONTEND_PORT npm start > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend to start
    local attempts=0
    local max_attempts=60
    
    while [ $attempts -lt $max_attempts ]; do
        if check_port $FRONTEND_PORT; then
            print_success "Frontend server started successfully (PID: $FRONTEND_PID)"
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
    done
    
    print_error "Frontend server failed to start within 60 seconds"
    return 1
}

# Function to open browser
open_browser() {
    local url="http://localhost:$FRONTEND_PORT"
    print_status "Opening browser at $url"
    
    # Detect OS and open browser
    if command -v xdg-open > /dev/null; then
        xdg-open "$url" 2>/dev/null &
    elif command -v open > /dev/null; then
        open "$url" 2>/dev/null &
    elif command -v start > /dev/null; then
        start "$url" 2>/dev/null &
    else
        print_warning "Could not detect browser command. Please open $url manually"
    fi
}

# Function to display status
show_status() {
    echo
    echo "=================================="
    echo "  Agent Run Manager - RUNNING"
    echo "=================================="
    echo
    echo "Frontend: http://localhost:$FRONTEND_PORT"
    echo "Backend:  http://localhost:$BACKEND_PORT"
    echo
    echo "Logs:"
    echo "  Frontend: $FRONTEND_LOG"
    echo "  Backend:  $BACKEND_LOG"
    echo
    echo "PIDs:"
    echo "  Frontend: $FRONTEND_PID"
    echo "  Backend:  $BACKEND_PID"
    echo
    echo "Press Ctrl+C to stop all services"
    echo "=================================="
    echo
}

# Function to cleanup on exit
cleanup() {
    echo
    print_status "Shutting down services..."
    
    if [ ! -z "$FRONTEND_PID" ]; then
        print_status "Stopping frontend (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$BACKEND_PID" ]; then
        print_status "Stopping backend (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    # Force cleanup ports
    cleanup_ports
    
    print_success "All services stopped"
    exit 0
}

# Function to show help
show_help() {
    echo "Agent Run Manager - Startup Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --no-browser    Don't open browser automatically"
    echo "  --dev           Start in development mode with hot reload"
    echo "  --clean         Clean install (remove node_modules first)"
    echo "  --help          Show this help message"
    echo
    echo "Environment Variables:"
    echo "  FRONTEND_PORT   Frontend port (default: 8000)"
    echo "  BACKEND_PORT    Backend port (default: 8001)"
    echo
}

# Parse command line arguments
NO_BROWSER=false
DEV_MODE=false
CLEAN_INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-browser)
            NO_BROWSER=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        --clean)
            CLEAN_INSTALL=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Override ports from environment if set
if [ ! -z "$FRONTEND_PORT_ENV" ]; then
    FRONTEND_PORT=$FRONTEND_PORT_ENV
fi

if [ ! -z "$BACKEND_PORT_ENV" ]; then
    BACKEND_PORT=$BACKEND_PORT_ENV
fi

# Main execution
main() {
    echo "=================================="
    echo "  Agent Run Manager - Startup"
    echo "=================================="
    echo
    
    # Set up signal handlers
    trap cleanup SIGINT SIGTERM
    
    # Clean install if requested
    if [ "$CLEAN_INSTALL" = true ]; then
        print_status "Performing clean install..."
        rm -rf node_modules server/node_modules
        print_success "Clean install completed"
    fi
    
    # Run setup steps
    check_prerequisites
    cleanup_ports
    setup_environment
    install_dependencies
    
    # Start services
    if ! start_backend; then
        print_error "Failed to start backend server"
        exit 1
    fi
    
    if [ "$DEV_MODE" = true ]; then
        print_status "Starting in development mode..."
        # In dev mode, use concurrently to run both with hot reload
        npm run dev
    else
        if ! start_frontend; then
            print_error "Failed to start frontend server"
            cleanup
            exit 1
        fi
        
        # Open browser if not disabled
        if [ "$NO_BROWSER" = false ]; then
            sleep 3  # Give frontend time to fully start
            open_browser
        fi
        
        # Show status and wait
        show_status
        
        # Keep script running
        while true; do
            sleep 1
        done
    fi
}

# Run main function
main "$@"
