#!/bin/bash

# CodegenApp - Complete Application Startup Script
# This script starts all components of the CodegenApp platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to cleanup background processes
cleanup() {
    print_status "Shutting down services..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes on our ports
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    pkill -f "node.*server" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    
    print_success "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "🚀 Starting CodegenApp Platform..."
print_status "=================================="

# Check prerequisites
print_status "Checking prerequisites..."

# Check for required commands
MISSING_DEPS=()

if ! command_exists node; then
    MISSING_DEPS+=("node")
fi

if ! command_exists npm; then
    MISSING_DEPS+=("npm")
fi

if ! command_exists python3; then
    MISSING_DEPS+=("python3")
fi

if ! command_exists pip3; then
    MISSING_DEPS+=("pip3")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    print_error "Missing required dependencies: ${MISSING_DEPS[*]}"
    print_error "Please install the missing dependencies and try again"
    exit 1
fi

print_success "All prerequisites found"

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        print_status "Using .env.production for actual API keys"
        cp .env.production .env
    else
        print_warning ".env file not found, copying from .env.example"
        cp .env.example .env
        print_warning "Please edit .env file with your actual API keys before running again"
        print_warning "The file has been pre-populated with example values"
        print_warning "Or copy .env.production to .env if you have the production file"
    fi
fi

# Check for port conflicts
PORTS_TO_CHECK=(8000 8001 8080)
CONFLICTING_PORTS=()

for port in "${PORTS_TO_CHECK[@]}"; do
    if port_in_use $port; then
        CONFLICTING_PORTS+=($port)
    fi
done

if [ ${#CONFLICTING_PORTS[@]} -ne 0 ]; then
    print_warning "The following ports are already in use: ${CONFLICTING_PORTS[*]}"
    print_warning "Please stop the services using these ports or they will be terminated"
    
    for port in "${CONFLICTING_PORTS[@]}"; do
        print_status "Attempting to free port $port..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
    done
fi

# Install dependencies
print_status "Installing dependencies..."

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

# Install proxy server dependencies
print_status "Installing proxy server dependencies..."
cd server && npm install && cd ..
print_success "Proxy server dependencies installed"

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
print_success "Backend dependencies installed"

cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

# Start services
print_status "Starting services..."

# Start backend service (FastAPI)
print_status "Starting backend service (FastAPI) on port 8080..."
cd backend
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8080 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
wait_for_service "http://localhost:8080/health" "Backend API"

# Start proxy server (Node.js)
print_status "Starting proxy server on port 8001..."
cd server
nohup npm run dev > ../logs/proxy.log 2>&1 &
PROXY_PID=$!
cd ..

# Wait for proxy server to be ready
wait_for_service "http://localhost:8001" "Proxy Server"

# Start frontend (React)
print_status "Starting frontend on port 8000..."
nohup npm start > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
wait_for_service "http://localhost:8000" "Frontend"

print_success "🎉 All services started successfully!"
print_status "=================================="
print_status "📱 Frontend:      http://localhost:8000"
print_status "🔗 Proxy Server:  http://localhost:8001"
print_status "⚡ Backend API:   http://localhost:8080"
print_status "📊 API Docs:      http://localhost:8080/docs"
print_status "=================================="
print_status "📝 Logs are available in the logs/ directory"
print_status "🛑 Press Ctrl+C to stop all services"

# Keep the script running and monitor services
while true; do
    # Check if services are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend service stopped unexpectedly"
        break
    fi
    
    if ! kill -0 $PROXY_PID 2>/dev/null; then
        print_error "Proxy server stopped unexpectedly"
        break
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend stopped unexpectedly"
        break
    fi
    
    sleep 5
done

# If we get here, something went wrong
cleanup

