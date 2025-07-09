#!/bin/bash

# Service shutdown script for CodegenApp
echo "🛑 Stopping CodegenApp Services..."

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

# Stop backend automation service
stop_backend() {
    print_status "Stopping backend automation service..."
    
    if command -v pm2 &> /dev/null; then
        pm2 stop automation-backend 2>/dev/null || true
        pm2 delete automation-backend 2>/dev/null || true
        print_success "Backend automation service stopped"
    else
        print_warning "PM2 not found, skipping backend stop"
    fi
}

# Stop frontend development server
stop_frontend() {
    print_status "Stopping frontend development server..."
    
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID
            sleep 2
            if kill -0 $FRONTEND_PID 2>/dev/null; then
                kill -9 $FRONTEND_PID
            fi
            print_success "Frontend development server stopped"
        else
            print_warning "Frontend process not running"
        fi
        rm -f .frontend.pid
    else
        print_warning "Frontend PID file not found"
    fi
    
    # Also try to kill any remaining React dev server processes
    pkill -f "react-scripts start" 2>/dev/null || true
    pkill -f "webpack-dev-server" 2>/dev/null || true
}

# Clean up any remaining processes
cleanup() {
    print_status "Cleaning up remaining processes..."
    
    # Kill any remaining Node.js processes related to the app
    pkill -f "automation-backend" 2>/dev/null || true
    pkill -f "server.js" 2>/dev/null || true
    
    # Clean up temporary files
    rm -f .frontend.pid
    
    print_success "Cleanup completed"
}

# Display final status
show_final_status() {
    print_status "Final Status Check:"
    echo ""
    
    # Check backend
    if command -v pm2 &> /dev/null; then
        if pm2 status automation-backend 2>/dev/null | grep -q "automation-backend"; then
            print_warning "Backend service may still be running"
            pm2 status automation-backend
        else
            print_success "Backend service stopped"
        fi
    fi
    
    # Check frontend
    if pgrep -f "react-scripts start" > /dev/null; then
        print_warning "Frontend processes may still be running"
    else
        print_success "Frontend service stopped"
    fi
    
    echo ""
    print_success "All services stopped successfully!"
}

# Force stop option
force_stop() {
    print_status "Force stopping all services..."
    
    # Force kill PM2 processes
    pm2 kill 2>/dev/null || true
    
    # Force kill Node.js processes
    pkill -9 -f "node.*server.js" 2>/dev/null || true
    pkill -9 -f "react-scripts" 2>/dev/null || true
    pkill -9 -f "webpack-dev-server" 2>/dev/null || true
    
    # Clean up
    rm -f .frontend.pid
    
    print_success "Force stop completed"
}

# Main execution
main() {
    # Check for force flag
    if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
        force_stop
        exit 0
    fi
    
    print_status "CodegenApp Service Shutdown"
    echo ""
    
    stop_backend
    stop_frontend
    cleanup
    show_final_status
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --force, -f    Force stop all services"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              # Graceful shutdown"
        echo "  $0 --force      # Force stop all services"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac

