#!/bin/bash

# Service startup script for CodegenApp
echo "🚀 Starting CodegenApp Services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 not found globally, installing..."
        npm install -g pm2
    fi
    
    print_success "Dependencies check completed"
}

# Start backend automation service
start_backend() {
    print_status "Starting backend automation service..."
    
    cd backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Start with PM2
    pm2 start ecosystem.config.js
    
    if [ $? -eq 0 ]; then
        print_success "Backend automation service started"
    else
        print_error "Failed to start backend service"
        exit 1
    fi
    
    cd ..
}

# Start frontend development server
start_frontend() {
    print_status "Starting frontend development server..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Start frontend in background
    npm start &
    FRONTEND_PID=$!
    
    # Wait a moment to check if it started successfully
    sleep 3
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_success "Frontend development server started (PID: $FRONTEND_PID)"
        echo $FRONTEND_PID > .frontend.pid
    else
        print_error "Failed to start frontend server"
        exit 1
    fi
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for backend
    for i in {1..30}; do
        if curl -s http://localhost:3002/health > /dev/null; then
            print_success "Backend service is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Backend service failed to start within 30 seconds"
            exit 1
        fi
        sleep 1
    done
    
    # Wait for frontend
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            print_success "Frontend service is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_warning "Frontend service not responding, but continuing..."
            break
        fi
        sleep 1
    done
}

# Display service status
show_status() {
    print_status "Service Status:"
    echo ""
    
    # Backend status
    echo "📊 Backend Automation Service:"
    pm2 status automation-backend
    echo ""
    
    # Frontend status
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo "🌐 Frontend Development Server: Running (PID: $FRONTEND_PID)"
        else
            echo "🌐 Frontend Development Server: Not running"
        fi
    else
        echo "🌐 Frontend Development Server: Status unknown"
    fi
    echo ""
    
    # Service URLs
    echo "🔗 Service URLs:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Backend:   http://localhost:3002"
    echo "   Health:    http://localhost:3002/health"
    echo "   Metrics:   http://localhost:3002/metrics"
    echo ""
    
    # Useful commands
    echo "📋 Useful Commands:"
    echo "   View backend logs:  pm2 logs automation-backend"
    echo "   Monitor services:   pm2 monit"
    echo "   Stop services:      ./scripts/stop-services.sh"
    echo "   Check status:       ./scripts/check-services.sh"
}

# Main execution
main() {
    print_status "CodegenApp Service Startup"
    echo ""
    
    check_dependencies
    start_backend
    start_frontend
    wait_for_services
    show_status
    
    print_success "All services started successfully!"
    print_status "Press Ctrl+C to stop all services"
    
    # Keep script running and handle Ctrl+C
    trap 'print_status "Stopping services..."; ./scripts/stop-services.sh; exit 0' INT
    
    # Keep the script running
    while true; do
        sleep 10
        # Check if services are still running
        if ! pm2 status automation-backend | grep -q "online"; then
            print_error "Backend service stopped unexpectedly"
            break
        fi
        
        if [ -f ".frontend.pid" ]; then
            FRONTEND_PID=$(cat .frontend.pid)
            if ! kill -0 $FRONTEND_PID 2>/dev/null; then
                print_error "Frontend service stopped unexpectedly"
                break
            fi
        fi
    done
}

# Run main function
main

